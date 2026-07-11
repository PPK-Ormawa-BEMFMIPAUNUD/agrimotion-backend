import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSensorDto } from './dto/create-sensor.dto.js';
import type { Sensor } from '@prisma/client';

@Injectable()
export class SensorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Sensor[]> {
    return this.prisma.sensor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { device: true },
    });
  }

  async findOne(id: string): Promise<Sensor> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: { device: true },
    });
    if (!sensor) throw new NotFoundException(`Sensor with ID "${id}" not found`);
    return sensor;
  }

  async create(dto: CreateSensorDto): Promise<Sensor> {
    return this.prisma.sensor.create({
      data: dto,
      include: { device: true },
    });
  }
}
