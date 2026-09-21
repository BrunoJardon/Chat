import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health.js';
import { RedisHealthIndicator } from './redis.health.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
