import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemService } from './system.service.js';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get detailed system and OS information' })
  async getSystemInfo() {
    return this.systemService.getSystemInfo();
  }
}
