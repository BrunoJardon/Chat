import { Redis } from 'ioredis';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health.js';

describe('RedisHealthIndicator', () => {
  const redis = { ping: vi.fn() } as unknown as Redis;
  const indicator = new RedisHealthIndicator(new HealthIndicatorService(), redis);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marks up when the ping replies PONG', async () => {
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const result = await indicator.isHealthy('redis');

    expect(result).toMatchObject({
      redis: { status: 'up' },
    });
    expect(result.redis.responseTime).toEqual(expect.any(Number));
  });

  it('marks down when the ping replies something other than PONG', async () => {
    vi.mocked(redis.ping).mockResolvedValue('NOAUTH');

    const result = (await indicator.isHealthy('redis')) as {
      redis: { status: string; message?: string };
    };

    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toContain('NOAUTH');
  });

  it('marks down when the ping rejects (redis down)', async () => {
    vi.mocked(redis.ping).mockRejectedValue(new Error('connection refused'));

    const result = (await indicator.isHealthy('redis')) as {
      redis: { status: string; message?: string };
    };

    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toContain('connection refused');
  });
});
