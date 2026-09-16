import { IsInt, IsString, IsNotEmpty, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartCropCycleDto {
  @ApiProperty({ description: 'Demplot ID (0: Pacah, 1: Sawi, 2: Cabai)' })
  @IsInt()
  @Min(0)
  @Max(2)
  demplotId: number;

  @ApiProperty({ description: 'Nama tanaman / varietas' })
  @IsString()
  @IsNotEmpty()
  commodityName: string;

  @ApiProperty({ description: 'Tanggal penanaman (ISO 8601)' })
  @IsDateString()
  plantingDate: string;

  @ApiPropertyOptional({ description: 'Target estimasi panen (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  targetHarvestDate?: string;

  @ApiPropertyOptional({ description: 'Catatan tambahan perlakuan awal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
