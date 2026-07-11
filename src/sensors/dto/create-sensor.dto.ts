import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({
    description: 'Device ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty({
    description: 'Sensor type',
    example: 'NPK',
    enum: ['NPK', 'SOIL', 'TEMP', 'LUX'],
  })
  @IsString()
  @IsIn(['NPK', 'SOIL', 'TEMP', 'LUX'])
  type!: string;
}
