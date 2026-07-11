import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFarmDto } from './dto/create-farm.dto.js';
import type { Farm } from '@prisma/client';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Farm[]> {
    return this.prisma.farm.findMany({
      orderBy: { createdAt: 'desc' },
      include: { devices: true },
    });
  }

  async findOne(id: string): Promise<Farm> {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: { devices: true },
    });
    if (!farm) throw new NotFoundException(`Farm with ID "${id}" not found`);
    return farm;
  }

  async create(dto: CreateFarmDto): Promise<Farm> {
    return this.prisma.farm.create({ data: dto });
  }
}
