import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HarvestCropCycleDto {
  @ApiPropertyOptional({ description: 'Tanggal aktual panen (ISO 8601). Default: waktu saat ini.' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({ description: 'Bobot hasil panen dalam Kilogram' })
  @IsOptional()
  @IsNumber()
  yieldKg?: number;

  @ApiPropertyOptional({ description: 'Catatan evaluasi hasil panen' })
  @IsOptional()
  @IsString()
  notes?: string;
}
