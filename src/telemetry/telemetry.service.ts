import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelemetryQueryDto } from './dto/telemetry-query.dto.js';
import type { Telemetry, Prisma } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatest(query: TelemetryQueryDto): Promise<Telemetry[]> {
    const where = this.buildWhereClause(query);
    const limit = query.limit ?? 10;

    return this.prisma.telemetry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { device: true },
    });
  }

  async getHistory(
    query: TelemetryQueryDto,
  ): Promise<PaginatedResult<Telemetry>> {
    const where = this.buildWhereClause(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? 'desc';
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.telemetry.findMany({
        where,
        orderBy: { timestamp: sort },
        skip,
        take: limit,
        include: { device: true },
      }),
      this.prisma.telemetry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildWhereClause(
    query: TelemetryQueryDto,
  ): Prisma.TelemetryWhereInput {
    const where: Prisma.TelemetryWhereInput = {};

    if (query.deviceId) {
      where.deviceId = query.deviceId;
    }

    if (query.date) {
      const startDate = new Date(query.date);
      const endDate = new Date(query.date);
      endDate.setDate(endDate.getDate() + 1);
      where.timestamp = {
        gte: startDate,
        lt: endDate,
      };
    }

    return where;
  }
}
