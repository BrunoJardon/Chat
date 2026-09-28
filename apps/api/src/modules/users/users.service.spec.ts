import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PRISMA_CLIENT } from '../../core/database/prisma.constants.js';
import { UsersService } from './users.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const STORED_PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c29tZSXNhbHQ$hash';

function makePrisma() {
  return { user: { findUnique: vi.fn(), update: vi.fn() } };
}

/**
 * Unwraps the value a promise rejected with. `.catch()` would type the result as
 * a union with the resolved value, so the `then` pair is used to keep it unknown.
 */
function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('UsersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: UsersService;

  beforeEach(async () => {
    prisma = makePrisma();

    // UsersService injects the prisma client through the global PRISMA_CLIENT
    // token. In the app that token comes from the @Global PrismaModule, which a
    // unit test does not want (it would open a real connection), so it is
    // provided here instead. It has to be a real provider, not just an
    // `.overrideProvider()`: an override only replaces a token some module
    // already provides, it cannot introduce one.
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PRISMA_CLIENT, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // The row `findUnique` returns once the `select` below is applied.
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: 'ada@example.com',
      name: 'Ada',
    });
  });

  describe('getUserProfile', () => {
    it('returns { id, email, name } for an existing user', async () => {
      const result = await service.getUserProfile(USER_ID);

      expect(result).toEqual({ id: USER_ID, email: 'ada@example.com', name: 'Ada' });
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('never reads the password column, so the returned profile cannot carry one', async () => {
      // The service hands the prisma row straight back, so the projection in the
      // query is the only thing keeping the hash out of the response: pin it.
      const result = await service.getUserProfile(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        select: { id: true, email: true, password: false, name: true },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('throws 401 USER_NOT_FOUND when the token owner does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const promise = service.getUserProfile(USER_ID);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
      const error = await rejection(promise);
      expect((error as UnauthorizedException).getStatus()).toBe(401);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('returns the UPDATED row, not the one it read before writing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'Old Name',
      });
      prisma.user.update.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'New Name',
      });

      const result = await service.updateProfile(USER_ID, { name: 'New Name' });

      expect(result).toEqual({ id: USER_ID, email: 'ada@example.com', name: 'New Name' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { name: 'New Name' },
      });
    });

    it('drops the password that `user.update` returns (that query has no select)', async () => {
      prisma.user.update.mockResolvedValue({
        id: USER_ID,
        email: 'ada@example.com',
        name: 'New Name',
        password: STORED_PASSWORD_HASH,
      });

      const result = await service.updateProfile(USER_ID, { name: 'New Name' });

      expect(result).toEqual({ id: USER_ID, email: 'ada@example.com', name: 'New Name' });
      expect(result).not.toHaveProperty('password');
    });

    it('is a no-op when the dto carries no name, and writes nothing', async () => {
      // `{}` is what the whitelisting ValidationPipe produces for an empty body;
      // `{ name: undefined }` is the same case once a client sends it explicitly.
      for (const dto of [{}, { name: undefined }]) {
        prisma.user.update.mockClear();

        const result = await service.updateProfile(USER_ID, dto);

        expect(result).toEqual({ id: USER_ID, email: 'ada@example.com', name: 'Ada' });
        expect(prisma.user.update).not.toHaveBeenCalled();
      }
    });

    it('throws 404 USER_NOT_FOUND when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const promise = service.updateProfile(USER_ID, { name: 'New Name' });

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
      const error = await rejection(promise);
      expect((error as NotFoundException).getStatus()).toBe(404);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getPublicUserProfile', () => {
    it('returns { id, name } without the email', async () => {
      const result = await service.getPublicUserProfile(USER_ID);

      expect(result).toEqual({ id: USER_ID, name: 'Ada' });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        select: { id: true, email: true, password: false, name: true },
      });
    });

    it('throws 404 USER_NOT_FOUND when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const promise = service.getPublicUserProfile(USER_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
      const error = await rejection(promise);
      expect((error as NotFoundException).getStatus()).toBe(404);
    });
  });
});
