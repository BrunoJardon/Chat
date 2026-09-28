import { ConflictException, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../core/redis/redis.constants.js';
import { PRISMA_CLIENT } from '../../core/database/prisma.constants.js';
import { PrismaClientKnownRequestError, type PrismaClient } from '@chat/database';
import { normalizeEmail } from '@chat/utils';
import { JwtService } from './jwt/jwt.service.js';
import type { JwtPayload } from './jwt/jwt.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthResult, AuthTokens } from '@chat/types';

export interface SessionInfo {
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,

    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,

    private readonly jwt: JwtService,
  ) {}

  private async issueTokens(userId: string, session?: SessionInfo): Promise<AuthTokens> {
    const deviceId = session?.deviceId ?? randomUUID();

    const userSession = await this.prisma.userSession.create({
      data: {
        userId,
        deviceId,
        ipAddress: session?.ipAddress ?? 'unknown',
        userAgent: session?.userAgent ?? 'unknown',
      },
    });

    const base = { sub: userId, sid: userSession.id };
    const accessToken = await this.jwt.signAccess({ ...base, jti: randomUUID() });
    const refreshToken = await this.jwt.signRefresh({ ...base, jti: randomUUID() });

    return { accessToken, refreshToken };
  }

  private async signTokens(userId: string, sessionId: string): Promise<AuthTokens> {
    const base = { sub: userId, sid: sessionId };
    return {
      accessToken: await this.jwt.signAccess({ ...base, jti: randomUUID() }),
      refreshToken: await this.jwt.signRefresh({ ...base, jti: randomUUID() }),
    };
  }

  async register(dto: RegisterDto, session?: SessionInfo): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await hash(dto.password);

    const user = await this.prisma.user
      .create({
        data: { email, password: passwordHash, name: dto.name },
      })
      .catch((error: unknown) => {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('EMAIL_ALREADY_REGISTERED');
        }
        throw error;
      });

    const tokens = await this.issueTokens(user.id, session);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(dto: LoginDto, session?: SessionInfo) {
    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const match = await verify(existing.password, dto.password);
    if (!match) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const tokens = await this.issueTokens(existing.id, session);
    return { ...tokens, user: { id: existing.id, email: existing.email, name: existing.name } };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await this.jwt.verifyRefresh(token);
      return payload;
    } catch {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (await this.redis.exists(`auth:refresh:consumed:${payload.jti}`)) {
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.loggedOutAt || session.userId !== payload.sub) {
      throw new UnauthorizedException('SESSION_INVALID');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, (payload.exp ?? currentTime) - currentTime);
    const consumed = await this.redis.set(
      `auth:refresh:consumed:${payload.jti}`,
      '1',
      'EX',
      ttl,
      'NX',
    );
    if (consumed !== 'OK') {
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED');
    }
    return this.signTokens(payload.sub, payload.sid);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const currentTime = Math.floor(Date.now() / 1000);

    // Mark the jti as consumed with its remaining TTL, and close the session in PG.
    const ttl = Math.max(1, (payload.exp ?? currentTime) - currentTime);
    await this.redis.set(`auth:refresh:consumed:${payload.jti}`, '1', 'EX', ttl, 'NX');

    await this.prisma.userSession.updateMany({
      where: { id: payload.sid, userId: payload.sub },
      data: { loggedOutAt: new Date() },
    });
  }
}
