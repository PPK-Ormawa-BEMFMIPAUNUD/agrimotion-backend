import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../prisma/prisma.service.js';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttConnectionService,
  ) {}

  async getSystemInfo() {
    let databaseStatus = 'disconnected';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    const cpus = os.cpus();
    const memoryTotal = os.totalmem();
    const memoryFree = os.freemem();

    return {
      app: {
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
      },
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        uptimeSeconds: Math.floor(os.uptime()),
        cpu: {
          model: cpus[0]?.model || 'Unknown',
          cores: cpus.length,
        },
        memory: {
          totalMB: Math.floor(memoryTotal / 1024 / 1024),
          freeMB: Math.floor(memoryFree / 1024 / 1024),
          usedMB: Math.floor((memoryTotal - memoryFree) / 1024 / 1024),
          usagePercentage: (
            ((memoryTotal - memoryFree) / memoryTotal) *
            100
          ).toFixed(2),
        },
      },
      services: {
        database: databaseStatus,
        mqtt: this.mqtt.isConnected() ? 'connected' : 'disconnected',
      },
    };
  }
}
