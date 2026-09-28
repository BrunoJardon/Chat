import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { decodeJwt } from 'jose';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Requires postgres + redis running (docker compose up -d), same as app.e2e-spec.ts.
//
// Unique per run so the suite can be executed repeatedly against the same database.
const email = `e2e+${randomUUID()}@test.local`;
const otherEmail = `e2e+${randomUUID()}@test.local`;
const password = 'correct-horse-battery';
const name = 'E2E User';

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  // Flow state. Vitest runs the tests of a file sequentially, in declaration
  // order, so the lifecycle below is deterministic.
  let registered: AuthBody;
  let loggedIn: AuthBody;
  let rotated: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same global pipe as main.ts, so DTO validation behaves like in production.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 201 with a token pair and the user (no password leaked)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name, email, password });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: { id: expect.any(String), email, name },
      });
      expect(res.body.user).not.toHaveProperty('password');

      registered = res.body as AuthBody;
      // Tokens really are JWTs, signed with the TTLs from the env.
      const access = decodeJwt<{ sub: string; sid: string; jti: string }>(registered.accessToken);
      const refresh = decodeJwt<{ sub: string; sid: string; jti: string }>(registered.refreshToken);
      expect(access.sub).toBe(registered.user.id);
      expect(refresh.sid).toBe(access.sid);
      expect(refresh.jti).not.toBe(access.jti);
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name, email, password });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('rejects oversized fields with 400 (MaxLength limits)', async () => {
      const oversized = [
        { name: 'x'.repeat(41), email, password },
        { name, email: `${'a'.repeat(300)}@test.local`, password },
        { name, email, password: 'x'.repeat(129) },
      ] as const;

      for (const body of oversized) {
        const res = await request(app.getHttpServer()).post('/auth/register').send(body);
        expect(res.status).toBe(400);
      }
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with a token pair for valid credentials', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: { id: expect.any(String), email, name },
      });

      loggedIn = res.body as AuthBody;
      // A login opens a new session: the sid differs from the registration one.
      const loginSid = decodeJwt<{ sid: string }>(loggedIn.accessToken).sid;
      const registerSid = decodeJwt<{ sid: string }>(registered.accessToken).sid;
      expect(loginSid).not.toBe(registerSid);
    });

    it('rejects a wrong password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown user with the same 401 (no user enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: otherEmail, password });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an oversized email with 400 (MaxLength limit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `${'a'.repeat(300)}@test.local`, password });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with a new pair, keeping the same session (rotation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loggedIn.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      rotated = res.body as { accessToken: string; refreshToken: string };
      // Both tokens are new (fresh jti + iat), but the session is preserved.
      expect(rotated.refreshToken).not.toBe(loggedIn.refreshToken);
      expect(rotated.accessToken).not.toBe(loggedIn.accessToken);

      const before = decodeJwt<{ sub: string; sid: string; jti: string }>(loggedIn.refreshToken);
      const after = decodeJwt<{ sub: string; sid: string; jti: string }>(rotated.refreshToken);
      expect(after.sid).toBe(before.sid);
      expect(after.sub).toBe(before.sub);
      expect(after.jti).not.toBe(before.jti);
    });

    it('rejects the already-rotated token with 401 (replay protection)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loggedIn.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('REFRESH_TOKEN_REVOKED');
    });

    it('rotates atomically: two concurrent refreshes of the same token yield 200 and 401', async () => {
      // A fresh account, so no other test shares this session.
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Concurrent User',
          email: `e2e+concurrent+${randomUUID()}@test.local`,
          password,
        });
      expect(res.status).toBe(201);
      const { refreshToken } = res.body as AuthBody;

      const [first, second] = await Promise.all([
        request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }),
        request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }),
      ]);

      // Exactly one request wins the Redis SET NX claim. Both getting 200 (the
      // token reused twice) or both 401 (nobody winning) would be a bug.
      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 401]);
    });

    it('rejects an oversized refreshToken with 400 (MaxLength limit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'a'.repeat(1001) });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 and closes the session', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: rotated.refreshToken });

      expect(res.status).toBe(200);
    });

    it('rejects a refresh after logout with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rotated.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('REFRESH_TOKEN_REVOKED');
    });
  });
});
