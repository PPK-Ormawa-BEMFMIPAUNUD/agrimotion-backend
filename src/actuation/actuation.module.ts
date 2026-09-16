import { Module } from '@nestjs/common';
import { MqttModule } from '../mqtt/mqtt.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ActuationController } from './actuation.controller.js';
import { ActuationService } from './actuation.service.js';

@Module({
  imports: [MqttModule, PrismaModule],
  controllers: [ActuationController],
  providers: [ActuationService],
  exports: [ActuationService],
})
export class ActuationModule {}
