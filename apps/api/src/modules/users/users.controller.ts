import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  userProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  publicUserProfile(@Param('id') id: string) {
    return this.usersService.getPublicUserProfile(id);
  }
}
