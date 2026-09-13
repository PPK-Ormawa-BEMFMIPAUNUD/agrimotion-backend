import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { DssService } from './dss.service.js';
import { DssRecommendationResponse } from './dss.types.js';

@ApiTags('DSS')
@Controller(['dss', 'api/dss'])
export class DssController {
  constructor(private readonly dssService: DssService) {}

  @Get('recommendation/:demplotId')
  @ApiOperation({ summary: 'Dapatkan rekomendasi dosis pupuk DSS dari ML' })
  @ApiParam({ name: 'demplotId', description: 'ID Demplot (0: Bunga Pacah, 1: Sawi, 2: Cabai)', type: Number })
  async getRecommendation(@Param('demplotId') demplotIdRaw: string): Promise<DssRecommendationResponse> {
    const demplotId = parseInt(demplotIdRaw, 10);
    
    if (isNaN(demplotId) || demplotId < 0 || demplotId > 2) {
      throw new BadRequestException('demplotId harus berupa angka antara 0 hingga 2.');
    }

    try {
      return await this.dssService.getRecommendation(demplotId);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
