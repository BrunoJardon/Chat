import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../core/database/prisma.constants.js';
import type { PrismaClient } from '@chat/database';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  private async toProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: false, name: true },
    });

    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.toProfile(userId);
    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.toProfile(userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (dto.name === undefined) return user;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });

    return { id: updated.id, email: updated.email, name: updated.name };
  }

  async getPublicUserProfile(id: string) {
    const publicUser = await this.toProfile(id);
    if (!publicUser) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return { id: publicUser.id, name: publicUser.name };
  }
}
