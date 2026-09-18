import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActuationService } from './actuation.service.js';
import {
  CreateActuationDto,
  StopActuationDto,
} from './dto/create-actuation.dto.js';

@ApiTags('Actuations', 'Watering')
@Controller(['actuations', 'api/actuations', 'watering', 'api/watering', 'watering-logs', 'api/watering-logs'])
export class ActuationController {
  constructor(private readonly actuationService: ActuationService) {}

  @Post('start')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mulai aktuasi pompa (Memerlukan JWT)' })
  startActuation(@Body() dto: CreateActuationDto) {
    return this.actuationService.startActuation(dto);
  }

  @Post('stop')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Hentikan aktuasi pompa (Memerlukan JWT)' })
  stopActuation(@Body() dto: StopActuationDto) {
    return this.actuationService.stopActuation(dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Dapatkan status pompa yang sedang aktif (Public Read)' })
  getActiveActuations() {
    return this.actuationService.getActiveActuations();
  }

  @Get('analytics/water-usage')
  @ApiOperation({ summary: 'Dapatkan agregasi penggunaan air per demplot (Public Read)' })
  @ApiQuery({ name: 'period', required: false, description: 'day, week, month' })
  getWaterUsageAnalytics(@Query('period') period?: string) {
    return this.actuationService.getWaterUsageAnalytics(period || 'week');
  }

  @Get('accumulation')
  @ApiOperation({ summary: 'Dapatkan akumulasi penyiraman per demplot (Public Read)' })
  @ApiQuery({ name: 'period', required: false, description: 'day, week, month' })
  getAccumulation(@Query('period') period?: string) {
    return this.actuationService.getAccumulation(period || 'week');
  }

  @Get('history')
  @ApiOperation({ summary: 'Dapatkan riwayat log penyiraman demplot (Public Read)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah log terbaru' })
  getHistory(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return this.actuationService.getHistory(isNaN(numLimit) ? 20 : numLimit);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Dapatkan log penyiraman demplot (Public Read)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah log terbaru' })
  getLogs(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return this.actuationService.getHistory(isNaN(numLimit) ? 20 : numLimit);
  }

  @Get()
  @ApiOperation({ summary: 'Dapatkan log penyiraman demplot via /watering-logs (Public Read)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah log terbaru' })
  findAllLogs(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return this.actuationService.getHistory(isNaN(numLimit) ? 20 : numLimit);
  }
}
