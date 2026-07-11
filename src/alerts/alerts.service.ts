import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import type { Alert } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: { device: true },
    });
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { device: true },
    });
    if (!alert) throw new NotFoundException(`Alert with ID "${id}" not found`);
    return alert;
  }

  async create(dto: CreateAlertDto): Promise<Alert> {
    return this.prisma.alert.create({
      data: dto,
      include: { device: true },
    });
  }

  async resolve(id: string): Promise<Alert> {
    const alert = await this.findOne(id);
    return this.prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'RESOLVED' },
      include: { device: true },
    });
  }
}
