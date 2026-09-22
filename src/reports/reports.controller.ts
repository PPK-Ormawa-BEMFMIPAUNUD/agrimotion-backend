import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { QueryReportDto } from './dto/reports.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['reports', 'api/reports'])
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('demplot/:demplotId')
  @ApiOperation({ summary: 'Get aggregated demplot report for PDF generation (Anti-OOM)' })
  @ApiOkResponse({ description: 'Aggregated telemetry and activities' })
  async getDemplotReport(
    @Param('demplotId', ParseIntPipe) demplotId: number,
    @Query() query: QueryReportDto,
  ) {
    return this.reportsService.getDemplotReport(demplotId, query);
  }
}
