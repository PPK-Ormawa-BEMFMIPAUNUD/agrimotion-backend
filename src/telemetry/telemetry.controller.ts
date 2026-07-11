import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service.js';
import { TelemetryQueryDto } from './dto/telemetry-query.dto.js';

@ApiTags('Telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry readings' })
  getLatest(@Query() query: TelemetryQueryDto) {
    return this.telemetryService.getLatest(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get telemetry history' })
  getHistory(@Query() query: TelemetryQueryDto) {
    return this.telemetryService.getHistory(query);
  }
}
