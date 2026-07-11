import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { MqttModule } from '../mqtt/mqtt.module.js';

@Module({
  imports: [TerminusModule, MqttModule],
  controllers: [HealthController],
})
export class HealthModule {}
