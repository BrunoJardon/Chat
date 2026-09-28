import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../jwt/jwt.service.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Injects the token payload verified by JwtAuthGuard.
 * Usage: @CurrentUser() user: JwtPayload  or  @CurrentUser('sub') userId: string.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (data && user) {
      return user[data] as string | undefined;
    }
    return user;
  },
);
