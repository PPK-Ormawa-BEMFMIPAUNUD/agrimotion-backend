import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
    private mqtt: MqttConnectionService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Terminus Health Check' })
  check() {
    return this.health.check([
      // Database check via Prisma
      async () => {
        try {
          await this.prisma.$queryRawUnsafe('SELECT 1');
          return { database: { status: 'up' } };
        } catch (e) {
          return {
            database: { status: 'down', message: (e as Error).message },
          };
        }
      },
      // Memory check: Heap should not exceed 150MB
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      // Memory check: RSS should not exceed 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      // Disk check: Ensure at least 50% free space (or change threshold as needed)
      // Usually checking / is sufficient for docker containers.
      () =>
        this.disk.checkStorage('disk_storage', {
          thresholdPercent: 0.5,
          path: '/',
        }),
      // Custom MQTT check
      () => {
        const isConnected = this.mqtt.isConnected();
        return {
          mqtt: { status: isConnected ? 'up' : 'down' },
        };
      },
    ]);
  }
}
