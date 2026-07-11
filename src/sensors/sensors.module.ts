import { Module } from '@nestjs/common';
import { SensorsController } from './sensors.controller.js';
import { SensorsService } from './sensors.service.js';

@Module({
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
