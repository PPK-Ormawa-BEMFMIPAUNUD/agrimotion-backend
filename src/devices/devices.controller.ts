import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { DevicesService } from './devices.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';

@ApiTags('Devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  findAll() {
    return this.devicesService.findAll();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get device status overview (online/offline/lastSeen/battery/signal)',
  })
  getDeviceStatus() {
    return this.devicesService.getDeviceStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID (includes recent telemetry)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new device' })
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }
}
