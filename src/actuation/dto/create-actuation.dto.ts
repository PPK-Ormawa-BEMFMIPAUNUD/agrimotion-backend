import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ActuationType {
  PUPUK = 'PUPUK',
  PESTI = 'PESTI',
  AIR = 'AIR',
}

export class CreateActuationDto {
  @ApiProperty({
    description: 'Index of demplot: 0 for D1, 1 for D2, 2 for D3',
    example: 0,
    minimum: 0,
    maximum: 2,
  })
  @IsInt()
  @Min(0)
  @Max(2)
  demplotIndex!: number;

  @ApiProperty({
    enum: ActuationType,
    description: 'Type of actuation (PUPUK, PESTI, AIR)',
    example: ActuationType.PUPUK,
  })
  @IsEnum(ActuationType)
  type!: ActuationType;

  @ApiProperty({
    description: 'Total duration in seconds (max 180s for safety)',
    example: 30,
    minimum: 1,
    maximum: 180,
  })
  @IsInt()
  @Min(1)
  @Max(180)
  durationSeconds!: number;
}

export class StopActuationDto {
  @ApiPropertyOptional({
    description:
      'Index of demplot (optional for specific pump): 0 for D1, 1 for D2, 2 for D3',
    example: 0,
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  demplotIndex?: number;

  @ApiPropertyOptional({
    enum: ActuationType,
    description: 'Type of actuation (optional)',
    example: ActuationType.PUPUK,
  })
  @IsOptional()
  @IsEnum(ActuationType)
  type?: ActuationType;
}
