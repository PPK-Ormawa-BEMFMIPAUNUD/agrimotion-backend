import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller(['analytics', 'api/analytics'])
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('demplot/:demplotId')
  @ApiOperation({ summary: 'Get integrated analytics and soil health score for a demplot' })
  @ApiQuery({ name: 'period', required: false, description: '7d, 30d, or cycle' })
  getDemplotAnalytics(
    @Param('demplotId', ParseIntPipe) demplotId: number,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getDemplotAnalytics(demplotId, period || '7d');
  }
}
