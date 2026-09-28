import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import type { AuthTokenPayload } from '@chat/types';

export type JwtPayload = JWTPayload & AuthTokenPayload;

@Injectable()
export class JwtService {
  constructor(private readonly config: ConfigService) {}

  private accessSecret() {
    return new TextEncoder().encode(this.config.get('JWT_ACCESS_SECRET'));
  }

  private refreshSecret() {
    return new TextEncoder().encode(this.config.get('JWT_REFRESH_SECRET'));
  }

  async signAccess(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.getOrThrow('JWT_ACCESS_TTL'))
      .sign(this.accessSecret());
  }

  async signRefresh(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.getOrThrow('JWT_REFRESH_TTL'))
      .sign(this.refreshSecret());
  }

  async verifyAccess(token: string): Promise<{ payload: JwtPayload }> {
    return jwtVerify(token, new TextEncoder().encode(this.config.getOrThrow('JWT_ACCESS_SECRET')));
  }

  async verifyRefresh(token: string): Promise<{ payload: JwtPayload }> {
    return jwtVerify(token, new TextEncoder().encode(this.config.getOrThrow('JWT_REFRESH_SECRET')));
  }
}
