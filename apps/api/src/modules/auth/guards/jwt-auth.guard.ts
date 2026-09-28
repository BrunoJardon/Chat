import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { JwtService, JwtPayload } from '../jwt/jwt.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('MISSING_BEARER_TOKEN');
    }

    const token = authorization.slice('Bearer '.length);
    try {
      const { payload } = await this.jwt.verifyAccess(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
  }
}
