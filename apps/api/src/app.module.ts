import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './core/database/prisma.module.js';
import { RedisModule } from './core/redis/redis.module.js';
import { HealthModule } from './core/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
  ],
})
export class AppModule {}
