import { Module } from '@nestjs/common';
import { SystemController } from './system.controller.js';
import { SystemService } from './system.service.js';
import { MqttModule } from '../mqtt/mqtt.module.js';

@Module({
  imports: [MqttModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
