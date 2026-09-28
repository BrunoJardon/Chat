import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from './jwt/jwt.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, JwtAuthGuard],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
