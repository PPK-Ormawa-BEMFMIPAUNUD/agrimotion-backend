import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';
import { EwsService } from './ews.service.js';
import { EwsStatusResponse } from './ews.types.js';

@ApiTags('EWS')
@Controller(['ews', 'api/ews'])
export class EwsController {
  constructor(private readonly ewsService: EwsService) {}

  @Get('status/:demplotId')
  @ApiOperation({ summary: 'Dapatkan status Early Warning System (EWS) hama ulat per demplot' })
  @ApiParam({
    name: 'demplotId',
    description: 'ID Demplot (0: Bunga Pacah, 1: Sayuran Hijau/Sawi, 2: Cabai)',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Status EWS berhasil diambil.' })
  @ApiResponse({ status: 400, description: 'demplotId tidak valid.' })
  async getStatus(@Param('demplotId') demplotIdRaw: string): Promise<EwsStatusResponse> {
    const demplotId = parseInt(demplotIdRaw, 10);

    if (isNaN(demplotId) || demplotId < 0 || demplotId > 2) {
      throw new BadRequestException('demplotId harus berupa angka 0, 1, atau 2 (0: Bunga Pacah, 1: Sayuran Hijau/Sawi, 2: Cabai).');
    }

    try {
      return await this.ewsService.getEwsStatus(demplotId);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
