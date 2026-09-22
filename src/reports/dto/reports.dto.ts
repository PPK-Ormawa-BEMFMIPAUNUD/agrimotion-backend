import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReportDto {
  @ApiPropertyOptional({ description: 'Report period (weekly, monthly, cycle)', default: 'weekly' })
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'monthly', 'cycle'])
  period?: 'weekly' | 'monthly' | 'cycle' = 'weekly';

  @ApiPropertyOptional({ description: 'Target specific crop cycle by ID' })
  @IsOptional()
  @IsString()
  cropCycleId?: string;
}
