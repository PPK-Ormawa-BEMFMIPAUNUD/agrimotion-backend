import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFarmDto {
  @ApiProperty({ description: 'Farm name', example: 'Demplot Padi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Commodity type', example: 'Padi' })
  @IsString()
  @IsNotEmpty()
  commodity!: string;

  @ApiProperty({
    description: 'Farm location',
    example: 'Jatinangor, Sumedang',
  })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({
    description: 'Area in hectares',
    example: 2.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  area?: number;

  @ApiProperty({
    description: 'Owner user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;
}
