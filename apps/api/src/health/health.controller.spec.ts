import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis.health.js';

describe('HealthController', () => {
  function setup() {
    const health = { check: vi.fn() };
    vi.mocked(health.check).mockResolvedValue({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });
    const db = { pingCheck: vi.fn().mockReturnValue({ withTimeout: vi.fn() }) };
    const redis = { isHealthy: vi.fn() };

    const controller = new HealthController(
      health as unknown as HealthCheckService,
      db as unknown as TypeOrmHealthIndicator,
      redis as unknown as RedisHealthIndicator,
    );

    return { controller, health, db, redis };
  }

  it('registers the two checks (database, redis) with HealthCheckService', async () => {
    const { controller, health, db, redis } = setup();

    await controller.check();

    expect(health.check).toHaveBeenCalledTimes(1);
    const registered = health.check.mock.calls[0]![0] as Array<() => unknown>;
    expect(registered).toHaveLength(2);

    registered[0]!();
    expect(db.pingCheck).toHaveBeenCalledWith('database');

    registered[1]!();
    expect(redis.isHealthy).toHaveBeenCalledWith('redis');
  });

  it('forwards the HealthCheckService result to the caller', async () => {
    const { controller, health } = setup();

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });
    expect(health.check).toHaveBeenCalledTimes(1);
  });
});
