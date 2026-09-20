import { HealthIndicatorService } from '@nestjs/terminus';
import type { PrismaClient } from '@chat/database';
import { DatabaseHealthIndicator } from './database.health.js';

describe('DatabaseHealthIndicator', () => {
  it('marks up when the query succeeds', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaClient;
    const indicator = new DatabaseHealthIndicator(new HealthIndicatorService(), prisma);

    const result = await indicator.isHealthy('database');

    expect(result).toMatchObject({
      database: { status: 'up' },
    });
    expect(result.database.responseTime).toEqual(expect.any(Number));
  });

  it('marks down when the query rejects (db down)', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaClient;
    const indicator = new DatabaseHealthIndicator(new HealthIndicatorService(), prisma);

    const result = (await indicator.isHealthy('database')) as {
      database: { status: string; message?: string };
    };

    expect(result.database.status).toBe('down');
    expect(result.database.message).toContain('connection refused');
  });
});
