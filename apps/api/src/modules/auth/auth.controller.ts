import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type SessionInfo } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const sessionInfo: SessionInfo = {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    };
    return this.authService.register(dto, sessionInfo);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const sessionInfo: SessionInfo = {
      deviceId: dto.deviceId,
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    };
    return this.authService.login(dto, sessionInfo);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
