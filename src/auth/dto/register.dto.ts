import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'User full name', example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'User email', example: 'admin@agrimotion.id' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: 'admin123',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    required: false,
    default: 'USER',
  })
  @IsString()
  @IsOptional()
  role?: string;
}
