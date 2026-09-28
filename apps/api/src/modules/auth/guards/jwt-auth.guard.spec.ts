import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { JwtPayload, JwtService } from '../jwt/jwt.service.js';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';

/** Stubs for the handler/class pair the guard reports to the Reflector. */
const handler = {};
const controller = {};

/** Minimal ExecutionContext stand-in; the guard only reads metadata and the request. */
function makeContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeReflector() {
  return { getAllAndOverride: vi.fn() };
}

function makeJwtService() {
  return { verifyAccess: vi.fn() };
}

const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature';
const payload: JwtPayload = { sub: 'user-1', sid: 'session-1', jti: 'jti-1' };

describe('JwtAuthGuard', () => {
  let reflector: ReturnType<typeof makeReflector>;
  let jwt: ReturnType<typeof makeJwtService>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = makeReflector();
    jwt = makeJwtService();
    guard = new JwtAuthGuard(reflector as unknown as Reflector, jwt as unknown as JwtService);
  });

  function authRequest(headers: Record<string, string> = {}): AuthenticatedRequest {
    return { headers } as AuthenticatedRequest;
  }

  describe('public routes (@Public())', () => {
    it('lets the request through without verifying any token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      await expect(guard.canActivate(makeContext(authRequest()))).resolves.toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        controller,
      ]);
      expect(jwt.verifyAccess).not.toHaveBeenCalled();
    });
  });

  describe('authenticated routes', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('rejects with MISSING_BEARER_TOKEN when there is no Authorization header', async () => {
      const request = authRequest();
      const promise = guard.canActivate(makeContext(request));

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('MISSING_BEARER_TOKEN');
      expect(jwt.verifyAccess).not.toHaveBeenCalled();
      expect(request.user).toBeUndefined();
    });

    it('rejects with MISSING_BEARER_TOKEN when the scheme is not Bearer', async () => {
      const request = authRequest({ authorization: 'Basic dXNlcjpwYXNz' });

      const promise = guard.canActivate(makeContext(request));

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('MISSING_BEARER_TOKEN');
      expect(jwt.verifyAccess).not.toHaveBeenCalled();
    });

    it('rejects with INVALID_ACCESS_TOKEN when token verification fails', async () => {
      const request = authRequest({ authorization: `Bearer ${VALID_TOKEN}` });
      jwt.verifyAccess.mockRejectedValue(new Error('signature verification failed'));

      const promise = guard.canActivate(makeContext(request));

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('INVALID_ACCESS_TOKEN');
      expect(jwt.verifyAccess).toHaveBeenCalledWith(VALID_TOKEN);
      expect(request.user).toBeUndefined();
    });

    it('attaches the verified payload to the request and grants access', async () => {
      const request = authRequest({ authorization: `Bearer ${VALID_TOKEN}` });
      jwt.verifyAccess.mockResolvedValue({ payload });

      await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
      expect(jwt.verifyAccess).toHaveBeenCalledWith(VALID_TOKEN);
      expect(request.user).toBe(payload);
    });
  });
});
