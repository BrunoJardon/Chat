import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { PublicUserProfile, UpdateProfileRequest, UserProfile } from '@chat/types';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function makeUsersService() {
  return {
    getUserProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicUserProfile: vi.fn(),
  };
}

const profile: UserProfile = { id: USER_ID, email: 'ada@example.com', name: 'Ada' };
const publicProfile: PublicUserProfile = { id: OTHER_ID, name: 'Grace' };

describe('UsersController', () => {
  let usersService: ReturnType<typeof makeUsersService>;
  let controller: UsersController;

  beforeEach(() => {
    usersService = makeUsersService();
    controller = new UsersController(usersService as unknown as UsersService);
  });

  describe('GET /users/me', () => {
    it('delegates the token subject to getUserProfile and returns its result', async () => {
      usersService.getUserProfile.mockResolvedValue(profile);

      const result = await controller.userProfile(USER_ID);

      expect(usersService.getUserProfile).toHaveBeenCalledWith(USER_ID);
      expect(result).toBe(profile);
    });

    it('propagates the 401 untouched (the service, not the controller, owns the semantics)', async () => {
      usersService.getUserProfile.mockRejectedValue(new UnauthorizedException('USER_NOT_FOUND'));

      const promise = controller.userProfile(USER_ID);

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('PATCH /users/me', () => {
    it('delegates the token subject plus the body to updateProfile and returns its result', async () => {
      const dto: UpdateProfileRequest = { name: 'New Name' };
      usersService.updateProfile.mockResolvedValue({ ...profile, name: 'New Name' });

      const result = await controller.updateProfile(USER_ID, dto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(USER_ID, dto);
      // The body is forwarded untouched: no reshaping between pipe and service.
      expect(usersService.updateProfile.mock.calls[0][1]).toBe(dto);
      expect(result).toEqual({ id: USER_ID, email: 'ada@example.com', name: 'New Name' });
    });

    it('forwards an empty body, letting the service decide that it is a no-op', async () => {
      usersService.updateProfile.mockResolvedValue(profile);

      await controller.updateProfile(USER_ID, {});

      expect(usersService.updateProfile).toHaveBeenCalledWith(USER_ID, {});
    });

    it('propagates the 404 untouched', async () => {
      usersService.updateProfile.mockRejectedValue(new NotFoundException('USER_NOT_FOUND'));

      const promise = controller.updateProfile(USER_ID, { name: 'New Name' });

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('GET /users/:id', () => {
    it('delegates the route param to getPublicUserProfile and returns its result', async () => {
      usersService.getPublicUserProfile.mockResolvedValue(publicProfile);

      const result = await controller.publicUserProfile(OTHER_ID);

      expect(usersService.getPublicUserProfile).toHaveBeenCalledWith(OTHER_ID);
      expect(result).toBe(publicProfile);
    });

    it('propagates the 404 untouched', async () => {
      usersService.getPublicUserProfile.mockRejectedValue(new NotFoundException('USER_NOT_FOUND'));

      const promise = controller.publicUserProfile(OTHER_ID);

      await expect(promise).rejects.toBeInstanceOf(NotFoundException);
      await expect(promise).rejects.toThrow('USER_NOT_FOUND');
    });
  });
});
