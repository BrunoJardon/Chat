import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, type PrismaClient } from '@chat/database';
import { PRISMA_CLIENT } from './prisma.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createPrismaClient(config.getOrThrow<string>('DATABASE_URL')),
    },
  ],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(@Inject(PRISMA_CLIENT) private readonly client: PrismaClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}
