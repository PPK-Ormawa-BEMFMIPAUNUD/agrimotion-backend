import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MqttConnectionService } from './mqtt-connection.service.js';
import { MqttHandlerService } from './mqtt-handler.service.js';

@Injectable()
export class MqttSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(MqttSubscriberService.name);

  private readonly TOPICS = [
    'agrimotion/device/+/telemetry',
    'agrimotion/device/+/status',
  ];

  constructor(
    private readonly connection: MqttConnectionService,
    private readonly handler: MqttHandlerService,
  ) {}

  onModuleInit(): void {
    const client = this.connection.getClient();

    client.on('connect', () => {
      this.subscribeAll();
    });

    client.on('message', (topic: string, message: Buffer) => {
      this.routeMessage(topic, message).catch((err: Error) => {
        this.logger.error(
          `Unhandled error in MQTT routeMessage on topic "${topic}": ${err.message}`,
          err.stack,
        );
      });
    });
  }

  private subscribeAll(): void {
    const client = this.connection.getClient();

    for (const topic of this.TOPICS) {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    }
  }

  private async routeMessage(topic: string, message: Buffer): Promise<void> {
    // topic format: agrimotion/device/{deviceId}/{type}
    const parts = topic.split('/');
    if (parts.length < 4) {
      this.logger.warn(`Unknown topic format: ${topic}`);
      return;
    }

    const type = parts[3]; // 'telemetry' or 'status'

    switch (type) {
      case 'telemetry':
        await this.handler.handleTelemetry(message);
        break;
      case 'status':
        await this.handler.handleStatus(parts[2], message);
        break;
      default:
        this.logger.warn(`Unknown message type: ${type} on topic ${topic}`);
    }
  }
}
