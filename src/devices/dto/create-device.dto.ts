import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Unique device code', example: 'DEV-001' })
  @IsString()
  @IsNotEmpty()
  deviceCode!: string;

  @ApiProperty({ description: 'ESP32 serial number', example: 'ESP32-001' })
  @IsString()
  @IsNotEmpty()
  espSerial!: string;

  @ApiProperty({ description: 'Farm ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  farmId!: string;

  @ApiProperty({ description: 'Device status', example: 'ACTIVE', required: false, default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
