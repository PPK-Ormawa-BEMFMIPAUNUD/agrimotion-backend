import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActuationService } from './actuation.service.js';
import {
  CreateActuationDto,
  StopActuationDto,
} from './dto/create-actuation.dto.js';

@ApiTags('Actuations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller(['actuations', 'api/actuations'])
export class ActuationController {
  constructor(private readonly actuationService: ActuationService) {}

  @Post('start')
  @ApiOperation({ summary: 'Mulai aktuasi pompa' })
  startActuation(@Body() dto: CreateActuationDto) {
    return this.actuationService.startActuation(dto);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Hentikan aktuasi pompa (spesifik atau semua)' })
  stopActuation(@Body() dto: StopActuationDto) {
    return this.actuationService.stopActuation(dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Dapatkan status pompa yang sedang aktif' })
  getActiveActuations() {
    return this.actuationService.getActiveActuations();
  }

  @Get('analytics/water-usage')
  @ApiOperation({ summary: 'Dapatkan agregasi penggunaan air per demplot' })
  getWaterUsageAnalytics(@Query('period') period?: string) {
    return this.actuationService.getWaterUsageAnalytics(period || 'week');
  }
}
