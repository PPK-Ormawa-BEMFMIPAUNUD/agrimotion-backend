import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  /** Devices are considered offline after this many minutes without telemetry */
  private readonly OFFLINE_THRESHOLD_MINUTES = 15;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDeviceHeartbeats(): Promise<void> {
    const threshold = new Date();
    threshold.setMinutes(
      threshold.getMinutes() - this.OFFLINE_THRESHOLD_MINUTES,
    );

    const staleDevices = await this.prisma.device.findMany({
      where: {
        status: 'ONLINE',
        OR: [{ lastOnline: { lt: threshold } }, { lastOnline: null }],
      },
      select: {
        id: true,
        deviceCode: true,
        lastOnline: true,
      },
    });

    if (staleDevices.length === 0) return;

    const staleIds = staleDevices.map((device) => device.id);

    // Perform a bulk update to mark all stale devices as OFFLINE in one query
    await this.prisma.device.updateMany({
      where: { id: { in: staleIds } },
      data: { status: 'OFFLINE' },
    });

    for (const device of staleDevices) {
      this.logger.warn(
        `Device Offline (heartbeat timeout): ${device.deviceCode} — last seen ${device.lastOnline?.toISOString() ?? 'never'}`,
      );
    }

    this.logger.log(
      `Heartbeat check: ${staleDevices.length} device(s) marked OFFLINE`,
    );
  }
}
