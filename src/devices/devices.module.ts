import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { HeartbeatService } from './heartbeat.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [DevicesController],
  providers: [DevicesService, HeartbeatService],
  exports: [DevicesService],
})
export class DevicesModule {}
