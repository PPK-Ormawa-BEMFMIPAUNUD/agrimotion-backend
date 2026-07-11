import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({ description: 'Device ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty({ description: 'Alert type', example: 'HIGH_TEMPERATURE' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'Alert message', example: 'Temperature exceeded 40°C threshold' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Alert status', example: 'UNRESOLVED', required: false, default: 'UNRESOLVED' })
  @IsString()
  @IsOptional()
  status?: string;
}
