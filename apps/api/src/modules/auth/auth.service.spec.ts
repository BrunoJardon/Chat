import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import type { Redis } from 'ioredis';
import { PrismaClientKnownRequestError, type PrismaClient } from '@chat/database';
import { AuthService, type SessionInfo } from './auth.service.js';
import type { JwtPayload, JwtService } from './jwt/jwt.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PLAIN_PASSWORD = 'correct-horse-battery';

function makePrisma() {
  return {
    user: { findUnique: vi.fn(), create: vi.fn() },
    userSession: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  };
}

function makeRedis() {
  return { exists: vi.fn(), set: vi.fn() };
}

function makeJwt() {
  return {
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
  };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let jwt: ReturnType<typeof makeJwt>;
  let service: AuthService;

  // One real argon2 hash reused across tests: hashing is CPU-bound (~50ms) and
  // the service itself uses the real implementation, so this stays an integration
  // of the crypto dependency without paying for it on every test.
  let storedHash: string;

  beforeAll(async () => {
    storedHash = await hash(PLAIN_PASSWORD);
  });

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    jwt = makeJwt();

    service = new AuthService(
      prisma as unknown as PrismaClient,
      redis as unknown as Redis,
      jwt as unknown as JwtService,
    );

    // Happy-path defaults; individual tests override what they care about.
    redis.exists.mockResolvedValue(0);
    redis.set.mockResolvedValue('OK');
    jwt.signAccess.mockResolvedValue('access-token-1');
    jwt.signRefresh.mockResolvedValue('refresh-token-1');
    prisma.userSession.create.mockResolvedValue({ id: SESSION_ID });
  });

  describe('register', () => {
    const dto = { name: 'Ada', email: 'ada@example.com', password: PLAIN_PASSWORD };

    it('creates the user + session and returns tokens and the user (without the password)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      const result = await service.register(dto);

      expect(result).toEqual({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: { id: USER_ID, email: 'ada@example.com', name: 'Ada' },
      });
      expect(result).not.toHaveProperty('user.password');
      expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    });

    it('stores an argon2id hash of the password, never the plaintext', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      await service.register(dto);

      const call = prisma.user.create.mock.calls[0][0] as {
        data: { email: string; password: string; name: string };
      };
      expect(call.data.password).not.toBe(PLAIN_PASSWORD);
      expect(call.data.password).toMatch(/^\$argon2id\$/);
      // The strongest assertion available: the stored value really authenticates the password.
      await expect(verify(call.data.password, PLAIN_PASSWORD)).resolves.toBe(true);
    });

    it('normalizes the email to lowercase and trims it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      await service.register({ ...dto, email: '  Ada@Example.COM  ' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ada@example.com' } });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'ada@example.com' }) }),
      );
    });

    it('signs both tokens with the user id and the new session id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      await service.register(dto);

      expect(jwt.signAccess).toHaveBeenCalledWith({
        sub: USER_ID,
        sid: SESSION_ID,
        jti: expect.any(String),
      });
      expect(jwt.signRefresh).toHaveBeenCalledWith({
        sub: USER_ID,
        sid: SESSION_ID,
        jti: expect.any(String),
      });
    });

    it('persists the session metadata coming from the request', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });
      const session: SessionInfo = {
        deviceId: 'laptop-1',
        ipAddress: '203.0.113.7',
        userAgent: 'vitest-agent',
      };

      await service.register(dto, session);

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          deviceId: 'laptop-1',
          ipAddress: '203.0.113.7',
          userAgent: 'vitest-agent',
        },
      });
    });

    it('falls back to "unknown" metadata and a generated deviceId when the session is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      await service.register(dto);

      const call = prisma.userSession.create.mock.calls[0][0] as {
        data: { deviceId: string; ipAddress: string; userAgent: string };
      };
      expect(call.data).toMatchObject({ ipAddress: 'unknown', userAgent: 'unknown' });
      expect(call.data.deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('rejects a duplicate email with a conflict and writes nothing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Ada',
        password: storedHash,
      });

      const promise = service.register(dto);

      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      await expect(promise).rejects.toThrow('EMAIL_ALREADY_REGISTERED');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });

    it('maps a P2002 race on create to a conflict (two registrations racing between findUnique and create)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`)', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      const promise = service.register(dto);

      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      await expect(promise).rejects.toThrow('EMAIL_ALREADY_REGISTERED');
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'ada@example.com', password: PLAIN_PASSWORD };
    // Factory, not a const: describe bodies run before beforeAll, so reading
    // `storedHash` at definition time would capture `undefined`.
    const existingUser = () => ({
      id: USER_ID,
      email: 'ada@example.com',
      name: 'Ada',
      password: storedHash,
    });

    it('returns tokens and the user when the password matches', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        user: { id: USER_ID, email: 'ada@example.com', name: 'Ada' },
      });
      expect(result).not.toHaveProperty('user.password');
      expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    });

    it('opens a new session (new sid) on every login', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());
      prisma.userSession.create
        .mockResolvedValueOnce({ id: SESSION_ID })
        .mockResolvedValueOnce({ id: '33333333-3333-4333-8333-333333333333' });

      await service.login(dto);
      await service.login(dto);

      expect(jwt.signRefresh.mock.calls[0][0]).toMatchObject({ sid: SESSION_ID });
      expect(jwt.signRefresh.mock.calls[1][0]).toMatchObject({
        sid: '33333333-3333-4333-8333-333333333333',
      });
    });

    it('normalizes the email before looking the user up', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      await service.login({ ...dto, email: '  ADA@Example.com ' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ada@example.com' } });
    });

    it('rejects a wrong password with the same error as an unknown user (no user enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser());

      const promise = service.login({ ...dto, password: 'wrong-password' });

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('INVALID_CREDENTIALS');
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown user without touching the sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const promise = service.login(dto);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('INVALID_CREDENTIALS');
      expect(prisma.userSession.create).not.toHaveBeenCalled();
      expect(jwt.signAccess).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tokenPayload: JwtPayload = { sub: USER_ID, sid: SESSION_ID, jti: 'jti-old', exp };

    beforeEach(() => {
      jwt.verifyRefresh.mockResolvedValue({ payload: tokenPayload });
      prisma.userSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        userId: USER_ID,
        loggedOutAt: null,
      });
    });

    it('marks the consumed jti with its remaining TTL', async () => {
      await service.refresh('old-refresh-token');

      expect(redis.set).toHaveBeenCalledWith(
        'auth:refresh:consumed:jti-old',
        '1',
        'EX',
        expect.any(Number),
        'NX',
      );
      const ttl = redis.set.mock.calls[0][3] as number;
      expect(ttl).toBeGreaterThan(exp - Math.floor(Date.now() / 1000) - 2);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('re-signs the pair with the SAME sid and a fresh jti (rotation, not a new session)', async () => {
      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({ accessToken: 'access-token-1', refreshToken: 'refresh-token-1' });
      expect(jwt.signAccess).toHaveBeenCalledWith({
        sub: USER_ID,
        sid: SESSION_ID,
        jti: expect.any(String),
      });
      expect(jwt.signRefresh).toHaveBeenCalledWith({
        sub: USER_ID,
        sid: SESSION_ID,
        jti: expect.any(String),
      });
      // The new jti must differ from the one just denylisted, otherwise the new
      // refresh token would be rejected on its very next use.
      const newJti = (jwt.signRefresh.mock.calls[0][0] as JwtPayload).jti;
      expect(newJti).not.toBe('jti-old');
      expect(prisma.userSession.create).not.toHaveBeenCalled();
    });

    it('rejects an already consumed jti without signing or writing anything', async () => {
      redis.exists.mockResolvedValue(1);

      const promise = service.refresh('used-refresh-token');

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('REFRESH_TOKEN_REVOKED');
      expect(redis.set).not.toHaveBeenCalled();
      expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
      expect(jwt.signAccess).not.toHaveBeenCalled();
    });

    it('rejects when the session no longer exists', async () => {
      prisma.userSession.findUnique.mockResolvedValue(null);

      const promise = service.refresh('old-refresh-token');

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('SESSION_INVALID');
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('rejects when the session was already closed by a logout', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        userId: USER_ID,
        loggedOutAt: new Date('2026-01-01T00:00:00Z'),
      });

      const promise = service.refresh('old-refresh-token');

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('SESSION_INVALID');
    });

    it('rejects a session that belongs to a different user (no cross-user reuse)', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        userId: '99999999-9999-4999-8999-999999999999',
        loggedOutAt: null,
      });

      const promise = service.refresh('old-refresh-token');

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('SESSION_INVALID');
    });

    it('clamps the denylist TTL to 1s when the token is already past its exp', async () => {
      jwt.verifyRefresh.mockResolvedValue({
        payload: { ...tokenPayload, exp: Math.floor(Date.now() / 1000) - 60 },
      });

      await service.refresh('old-refresh-token');

      expect(redis.set).toHaveBeenCalledWith('auth:refresh:consumed:jti-old', '1', 'EX', 1, 'NX');
    });

    it('rejects when the NX claim fails (the jti was consumed concurrently)', async () => {
      // The exists check is only a fast path: between it and the SET NX, a racing
      // refresh may win the claim, so the NX result is the real authority.
      redis.set.mockResolvedValue(null);

      const promise = service.refresh('old-refresh-token');

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('REFRESH_TOKEN_REVOKED');
      expect(jwt.signAccess).not.toHaveBeenCalled();
      expect(jwt.signRefresh).not.toHaveBeenCalled();
    });

    it('translates a JWT verification error into UnauthorizedException', async () => {
      jwt.verifyRefresh.mockRejectedValue(new Error('signature verification failed'));

      await expect(service.refresh('tampered')).rejects.toThrow('INVALID_REFRESH_TOKEN');
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tokenPayload: JwtPayload = { sub: USER_ID, sid: SESSION_ID, jti: 'jti-logout', exp };

    beforeEach(() => {
      jwt.verifyRefresh.mockResolvedValue({ payload: tokenPayload });
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
    });

    it('marks the jti as consumed and closes the session with a timestamp', async () => {
      await service.logout('refresh-token-1');

      expect(redis.set).toHaveBeenCalledWith(
        'auth:refresh:consumed:jti-logout',
        '1',
        'EX',
        expect.any(Number),
        'NX',
      );
      const ttl = redis.set.mock.calls[0][3] as number;
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { id: SESSION_ID, userId: USER_ID },
        data: { loggedOutAt: expect.any(Date) },
      });
    });

    it('scopes the session update to the token owner (id + userId)', async () => {
      await service.logout('refresh-token-1');

      const call = prisma.userSession.updateMany.mock.calls[0][0] as {
        where: { id: string; userId: string };
        data: { loggedOutAt: Date };
      };
      expect(call.where).toEqual({ id: SESSION_ID, userId: USER_ID });
      expect(call.data.loggedOutAt).toBeInstanceOf(Date);
    });

    it('clamps the denylist TTL to 1s when the token is already past its exp', async () => {
      jwt.verifyRefresh.mockResolvedValue({
        payload: { ...tokenPayload, exp: Math.floor(Date.now() / 1000) - 60 },
      });

      await service.logout('refresh-token-1');

      expect(redis.set).toHaveBeenCalledWith(
        'auth:refresh:consumed:jti-logout',
        '1',
        'EX',
        1,
        'NX',
      );
    });

    it('is idempotent: logging out twice does not throw', async () => {
      await expect(service.logout('refresh-token-1')).resolves.toBeUndefined();
      await expect(service.logout('refresh-token-1')).resolves.toBeUndefined();

      expect(prisma.userSession.updateMany).toHaveBeenCalledTimes(2);
    });

    it('translates a JWT verification error into UnauthorizedException', async () => {
      jwt.verifyRefresh.mockRejectedValue(new Error('signature verification failed'));

      await expect(service.logout('tampered')).rejects.toThrow('INVALID_REFRESH_TOKEN');
      expect(redis.set).not.toHaveBeenCalled();
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });
  });
});
