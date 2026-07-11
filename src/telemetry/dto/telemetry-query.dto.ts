import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class TelemetryQueryDto {
  @ApiProperty({ description: 'Filter by device ID (UUID)', required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    description: 'Filter by date (ISO 8601)',
    required: false,
    example: '2026-07-10',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of records per page',
    required: false,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort order by timestamp',
    required: false,
    default: SortOrder.DESC,
    enum: SortOrder,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.DESC;
}
