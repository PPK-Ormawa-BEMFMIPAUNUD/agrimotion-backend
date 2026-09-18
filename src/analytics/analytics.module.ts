import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import { ActivitiesModule } from '../activities/activities.module.js';

@Module({
  imports: [PrismaModule, TelemetryModule, ActivitiesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
