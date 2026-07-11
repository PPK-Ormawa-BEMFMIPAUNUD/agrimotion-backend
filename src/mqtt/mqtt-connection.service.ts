import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

@Injectable()
export class MqttConnectionService implements OnModuleInit, OnModuleDestroy {
  private client!: MqttClient;
  private readonly logger = new Logger(MqttConnectionService.name);
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const brokerUrl = this.configService.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );
    this.logger.log(`Connecting to MQTT broker at ${brokerUrl}...`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: `agrimotion-backend-${Date.now()}`,
      reconnectPeriod: 5000,
      clean: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Connected to MQTT broker');
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT Error: ${err.message}`);
      this.connected = false;
    });

    this.client.on('close', () => {
      this.connected = false;
      this.logger.warn('MQTT connection closed');
    });

    this.client.on('reconnect', () => {
      this.logger.log('Reconnecting to MQTT broker...');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
      this.logger.log('MQTT connection closed gracefully');
    }
  }

  getClient(): MqttClient {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
