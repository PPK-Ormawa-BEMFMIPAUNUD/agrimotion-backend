import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AlertsService } from './alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';

@ApiTags('Alerts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all alerts' })
  findAll() {
    return this.alertsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new alert' })
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.resolve(id);
  }
}
