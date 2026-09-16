import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CropCyclesService } from './crop-cycles.service.js';
import { StartCropCycleDto } from './dto/start-crop-cycle.dto.js';
import { HarvestCropCycleDto } from './dto/harvest-crop-cycle.dto.js';

@ApiTags('Crop Cycles')
@Controller(['crop-cycles', 'api/crop-cycles'])
export class CropCyclesController {
  constructor(private readonly cropCyclesService: CropCyclesService) {}

  @Get('active/:demplotId')
  @ApiOperation({ summary: 'Mendapatkan data siklus tanam yang sedang aktif untuk demplot terkait' })
  @ApiParam({ name: 'demplotId', description: 'Demplot ID (0: Pacah, 1: Sawi, 2: Cabai)', type: Number })
  async getActiveCycle(@Param('demplotId', ParseIntPipe) demplotId: number) {
    return this.cropCyclesService.getActiveCycle(demplotId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Memulai siklus penanaman baru (Tombol Tanam)' })
  async startCycle(@Body() dto: StartCropCycleDto) {
    return this.cropCyclesService.startCycle(dto);
  }

  @Post('harvest/:id')
  @ApiOperation({ summary: 'Mengakhiri siklus tanam aktif (Tombol Panen)' })
  @ApiParam({ name: 'id', description: 'ID Siklus Tanam (UUID)' })
  async harvestCycle(@Param('id') id: string, @Body() dto: HarvestCropCycleDto) {
    return this.cropCyclesService.harvestCycle(id, dto);
  }

  @Get('history/:demplotId')
  @ApiOperation({ summary: 'Mengambil riwayat siklus tanam terdahulu (arsip)' })
  @ApiParam({ name: 'demplotId', description: 'Demplot ID (0: Pacah, 1: Sawi, 2: Cabai)', type: Number })
  async getHistory(@Param('demplotId', ParseIntPipe) demplotId: number) {
    return this.cropCyclesService.getHistory(demplotId);
  }
}
