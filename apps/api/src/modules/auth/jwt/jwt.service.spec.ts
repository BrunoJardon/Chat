import { ConfigService } from '@nestjs/config';
import { decodeJwt, errors, jwtVerify } from 'jose';
import { JwtService, type JwtPayload } from './jwt.service.js';

// HS256 needs >= 256 bits of key material, and the production Joi schema demands
// 32+ chars, so the fakes below are long enough to be realistic.
const ACCESS_SECRET = 'access_secret_0123456789abcdef0123456789abcdef';
const REFRESH_SECRET = 'refresh_secret_0123456789abcdef0123456789abcdef';

/**
 * Minimal stand-in for ConfigService: `get` returns undefined for unknown keys
 * (same as Nest), `getOrThrow` throws — that difference is what the tests below exploit.
 */
function fakeConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const env: Record<string, string | undefined> = {
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
    ...overrides,
  };

  return {
    get: (key: string) => env[key],
    getOrThrow: (key: string) => {
      const value = env[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return value;
    },
  } as unknown as ConfigService;
}

describe('JwtService', () => {
  const payload: JwtPayload = { sub: 'user-1', sid: 'session-1', jti: 'jti-1' };

  describe('access tokens', () => {
    it('round-trips sub, sid and jti through verifyAccess', async () => {
      const service = new JwtService(fakeConfig());

      const token = await service.signAccess(payload);
      const { payload: verified } = await service.verifyAccess(token);

      expect(verified).toMatchObject({ sub: 'user-1', sid: 'session-1', jti: 'jti-1' });
    });

    it('signs with HS256 and expires after the configured TTL (15m)', async () => {
      const service = new JwtService(fakeConfig());

      const token = await service.signAccess(payload);
      // Verified with jose directly (the service's own verify only exposes the payload).
      const { payload: verified, protectedHeader } = await jwtVerify(
        token,
        new TextEncoder().encode(ACCESS_SECRET),
      );

      expect(protectedHeader.alg).toBe('HS256');
      // jose sets iat and exp in the same second, so the delta is exact.
      expect(verified.exp! - verified.iat!).toBe(15 * 60);
    });

    it('is verifiable with the raw access secret (secrets are encoded as bytes for jose)', async () => {
      const service = new JwtService(fakeConfig());

      const token = await service.signAccess(payload);

      // Verifying outside the service proves it signed with JWT_ACCESS_SECRET and
      // with a Uint8Array key (jose rejects string keys for HMAC).
      const { payload: verified } = await jwtVerify(token, new TextEncoder().encode(ACCESS_SECRET));
      expect(verified).toMatchObject({ sub: 'user-1', sid: 'session-1', jti: 'jti-1' });
    });

    it('rejects a refresh token, because both token types use different secrets', async () => {
      const service = new JwtService(fakeConfig());

      const refreshToken = await service.signRefresh(payload);

      await expect(service.verifyAccess(refreshToken)).rejects.toBeInstanceOf(
        errors.JWSSignatureVerificationFailed,
      );
    });

    it('rejects a token whose payload was swapped (e.g. a different user)', async () => {
      const service = new JwtService(fakeConfig());
      const token = await service.signAccess(payload);
      const [header, body, signature] = token.split('.');

      const forged = Buffer.from(
        JSON.stringify({ ...decodeJwt<JwtPayload>(token), sub: 'attacker' }),
      ).toString('base64url');

      await expect(service.verifyAccess(`${header}.${forged}.${signature}`)).rejects.toBeInstanceOf(
        errors.JWSSignatureVerificationFailed,
      );
      // Sanity check: the header/body we reused are the real ones.
      expect(decodeJwt<JwtPayload>(token).sub).toBe('user-1');
      expect(body).toBeTypeOf('string');
    });

    it('rejects a token whose signature was tampered with', async () => {
      const service = new JwtService(fakeConfig());
      const token = await service.signAccess(payload);
      const [header, body, signature] = token.split('.');
      const tampered = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');

      await expect(service.verifyAccess(`${header}.${body}.${tampered}`)).rejects.toBeInstanceOf(
        errors.JWSSignatureVerificationFailed,
      );
    });

    it('rejects a garbage token', async () => {
      const service = new JwtService(fakeConfig());

      await expect(service.verifyAccess('not-a-jwt')).rejects.toBeInstanceOf(errors.JWSInvalid);
    });

    it('rejects an expired access token', async () => {
      const service = new JwtService(fakeConfig({ JWT_ACCESS_TTL: '-10s' }));

      const token = await service.signAccess(payload);

      await expect(service.verifyAccess(token)).rejects.toBeInstanceOf(errors.JWTExpired);
    });

    it('fails loudly when the access TTL is not configured', async () => {
      const service = new JwtService(fakeConfig({ JWT_ACCESS_TTL: undefined }));

      await expect(service.signAccess(payload)).rejects.toThrow('JWT_ACCESS_TTL');
    });
  });

  describe('refresh tokens', () => {
    it('round-trips sub, sid and jti through verifyRefresh', async () => {
      const service = new JwtService(fakeConfig());

      const token = await service.signRefresh(payload);
      const { payload: verified } = await service.verifyRefresh(token);

      expect(verified).toMatchObject({ sub: 'user-1', sid: 'session-1', jti: 'jti-1' });
    });

    it('signs with HS256 and expires after the configured TTL (7d)', async () => {
      const service = new JwtService(fakeConfig());

      const token = await service.signRefresh(payload);
      const { payload: verified, protectedHeader } = await jwtVerify(
        token,
        new TextEncoder().encode(REFRESH_SECRET),
      );

      expect(protectedHeader.alg).toBe('HS256');
      expect(verified.exp! - verified.iat!).toBe(7 * 24 * 60 * 60);
    });

    it('rejects an access token, because both token types use different secrets', async () => {
      const service = new JwtService(fakeConfig());

      const accessToken = await service.signAccess(payload);

      await expect(service.verifyRefresh(accessToken)).rejects.toBeInstanceOf(
        errors.JWSSignatureVerificationFailed,
      );
    });

    it('rejects an expired refresh token', async () => {
      const service = new JwtService(fakeConfig({ JWT_REFRESH_TTL: '-1h' }));

      const token = await service.signRefresh(payload);

      await expect(service.verifyRefresh(token)).rejects.toBeInstanceOf(errors.JWTExpired);
    });
  });
});
