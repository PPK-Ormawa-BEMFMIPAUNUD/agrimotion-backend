import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @IsInt()
  @Type(() => Number)
  demplotId: number;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  volumeLiter?: number;

  @IsString()
  @IsOptional()
  substanceName?: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  executedAt?: string;
}

export class QueryActivityDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  demplotId?: number;

  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
