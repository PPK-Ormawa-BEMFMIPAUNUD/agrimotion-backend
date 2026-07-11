import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqttConnection: MqttConnectionService,
  ) {}

  async check() {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    const mqttStatus = this.mqttConnection.isConnected()
      ? 'connected'
      : 'disconnected';

    return {
      status: 'OK',
      database,
      mqtt: mqttStatus,
      serverTime: new Date().toISOString(),
    };
  }
}
