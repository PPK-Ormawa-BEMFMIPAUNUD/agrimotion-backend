import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service.js';
import { TelemetryQueryDto } from './dto/telemetry-query.dto.js';

@ApiTags('Telemetry')
@Controller(['telemetry', 'api/telemetry'])
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry readings' })
  @ApiQuery({ name: 'demplotId', required: false, description: 'Demplot ID (0, 1, 2) or identifier' })
  @ApiQuery({ name: 'deviceId', required: false, description: 'Filter by device UUID' })
  @ApiQuery({ name: 'nodeId', required: false, description: 'Filter by node code' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of records (default: 10)' })
  getLatest(@Query() query: TelemetryQueryDto) {
    return this.telemetryService.getLatest(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get telemetry history' })
  getHistory(@Query() query: TelemetryQueryDto) {
    return this.telemetryService.getHistory(query);
  }

  @Get('trends/soil-moisture/:demplotId')
  @ApiOperation({ summary: 'Get 7-day soil moisture trend for a demplot' })
  @ApiParam({ name: 'demplotId', description: 'Demplot ID (0, 1, 2) or device UUID' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default 7)' })
  getSoilMoistureTrends(
    @Param('demplotId') demplotId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days, 10) : 7;
    return this.telemetryService.getSoilMoistureTrends(demplotId, isNaN(numDays) ? 7 : numDays);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get analytics overview for a demplot' })
  @ApiQuery({ name: 'demplotId', required: true, description: 'Demplot ID (0, 1, 2)' })
  @ApiQuery({ name: 'period', required: true, description: 'day, week, month' })
  getAnalyticsOverview(
    @Query('demplotId') demplotId: string,
    @Query('period') period: string,
  ) {
    return this.telemetryService.getAnalyticsOverview(demplotId, period || 'week');
  }

  @Get('analytics/correlation')
  @ApiOperation({ summary: 'Get temperature & humidity correlation data' })
  @ApiQuery({ name: 'demplotId', required: true, description: 'Demplot ID (0, 1, 2)' })
  @ApiQuery({ name: 'period', required: true, description: 'day, week, month' })
  getCorrelationAnalytics(
    @Query('demplotId') demplotId: string,
    @Query('period') period: string,
  ) {
    return this.telemetryService.getCorrelationAnalytics(demplotId, period || 'week');
  }
}
