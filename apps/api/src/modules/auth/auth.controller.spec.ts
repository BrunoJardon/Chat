import type { Request } from 'express';
import { ConflictException } from '@nestjs/common';
import type { AuthResult, AuthTokens } from '@chat/types';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

function makeAuthService() {
  return {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };
}

/** Minimal express Request stand-in; the controller only reads ip + user-agent. */
function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: '203.0.113.7',
    headers: { 'user-agent': 'vitest-agent' },
    ...overrides,
  } as unknown as Request;
}

const authResult: AuthResult = {
  accessToken: 'access-token-1',
  refreshToken: 'refresh-token-1',
  user: { id: 'user-1', email: 'ada@example.com', name: 'Ada' },
};

describe('AuthController', () => {
  let authService: ReturnType<typeof makeAuthService>;
  let controller: AuthController;

  beforeEach(() => {
    authService = makeAuthService();
    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('register', () => {
    const dto = { name: 'Ada', email: 'ada@example.com', password: 'correct-horse-battery' };

    it('delegates the dto plus the session info built from the request', async () => {
      authService.register.mockResolvedValue(authResult);

      const result = await controller.register(dto, makeReq());

      expect(authService.register).toHaveBeenCalledWith(dto, {
        ipAddress: '203.0.113.7',
        userAgent: 'vitest-agent',
      });
      expect(result).toBe(authResult);
    });

    it('falls back to "unknown" when the request has no ip or user-agent', async () => {
      authService.register.mockResolvedValue(authResult);

      await controller.register(dto, makeReq({ ip: undefined, headers: {} }));

      expect(authService.register).toHaveBeenCalledWith(dto, {
        ipAddress: 'unknown',
        userAgent: 'unknown',
      });
    });

    it('propagates the service error (409 on a duplicate email) untouched', async () => {
      authService.register.mockRejectedValue(new ConflictException('EMAIL_ALREADY_REGISTERED'));

      await expect(controller.register(dto, makeReq())).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    const dto = { email: 'ada@example.com', password: 'correct-horse-battery' };

    it('delegates the dto plus the session info built from the request', async () => {
      authService.login.mockResolvedValue(authResult);

      const result = await controller.login(dto, makeReq());

      expect(authService.login).toHaveBeenCalledWith(dto, {
        ipAddress: '203.0.113.7',
        userAgent: 'vitest-agent',
      });
      expect(result).toBe(authResult);
    });

    it('falls back to "unknown" when the request has no ip or user-agent', async () => {
      authService.login.mockResolvedValue(authResult);

      await controller.login(dto, makeReq({ ip: undefined, headers: {} }));

      expect(authService.login).toHaveBeenCalledWith(dto, {
        ipAddress: 'unknown',
        userAgent: 'unknown',
      });
    });
  });

  describe('refresh', () => {
    it('unwraps the dto and returns the new token pair', async () => {
      const tokens: AuthTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      authService.refresh.mockResolvedValue(tokens);

      const result = await controller.refresh({ refreshToken: 'old-refresh' });

      expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
      expect(result).toBe(tokens);
    });
  });

  describe('logout', () => {
    it('unwraps the dto and resolves to undefined', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout({ refreshToken: 'a-refresh-token' });

      expect(authService.logout).toHaveBeenCalledWith('a-refresh-token');
      expect(result).toBeUndefined();
    });
  });
});
