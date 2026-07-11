import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { MqttModule } from '../mqtt/mqtt.module.js';

@Module({
  imports: [MqttModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
