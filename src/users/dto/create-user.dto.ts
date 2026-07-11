import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User full name', example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'User email', example: 'admin@agrimotion.id' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password (min 6 chars)',
    example: 'admin123',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'User role',
    example: 'ADMIN',
    required: false,
    default: 'USER',
  })
  @IsString()
  @IsOptional()
  role?: string;
}
