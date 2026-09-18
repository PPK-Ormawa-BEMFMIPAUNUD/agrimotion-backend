import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateActivityDto, QueryActivityDto } from './dto/activities.dto.js';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateActivityDto) {
    const activeCycle = await this.prisma.cropCycle.findFirst({
      where: {
        demplotId: dto.demplotId,
        status: 'ACTIVE',
      },
    });

    const activity = await this.prisma.farmActivity.create({
      data: {
        demplotId: dto.demplotId,
        type: dto.type,
        volumeLiter: dto.volumeLiter,
        substanceName: dto.substanceName,
        dosage: dto.dosage,
        notes: dto.notes,
        executedAt: dto.executedAt ? new Date(dto.executedAt) : new Date(),
        cropCycleId: activeCycle ? activeCycle.id : null,
      },
    });

    return {
      success: true,
      message: 'Activity logged successfully',
      data: activity,
    };
  }

  async findAll(query: QueryActivityDto) {
    const where: any = {};
    if (query.demplotId !== undefined) {
      where.demplotId = query.demplotId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate && query.endDate) {
      where.executedAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      where.executedAt = {
        gte: new Date(query.startDate),
      };
    } else if (query.endDate) {
      where.executedAt = {
        lte: new Date(query.endDate),
      };
    }

    const limit = query.limit || 20;

    const activities = await this.prisma.farmActivity.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      take: limit,
      include: {
        cropCycle: {
          select: {
            id: true,
            commodityName: true,
          }
        }
      }
    });

    return {
      success: true,
      message: 'Activities fetched successfully',
      data: activities,
    };
  }

  async getSummary(demplotId: number) {
    const now = new Date();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const activeCycle = await this.prisma.cropCycle.findFirst({
      where: {
        demplotId: demplotId,
        status: 'ACTIVE',
      },
    });

    const whereBase = {
      demplotId,
      cropCycleId: activeCycle ? activeCycle.id : undefined,
    };

    // Calculate watering total liters
    const watering7d = await this.prisma.farmActivity.aggregate({
      _sum: { volumeLiter: true },
      where: { ...whereBase, type: ActivityType.WATERING, executedAt: { gte: sevenDaysAgo } },
    });
    
    const watering30d = await this.prisma.farmActivity.aggregate({
      _sum: { volumeLiter: true },
      where: { ...whereBase, type: ActivityType.WATERING, executedAt: { gte: thirtyDaysAgo } },
    });

    // Fertilizer
    const fertCount = await this.prisma.farmActivity.count({
      where: { ...whereBase, type: ActivityType.FERTILIZATION },
    });
    const lastFert = await this.prisma.farmActivity.findFirst({
      where: { ...whereBase, type: ActivityType.FERTILIZATION },
      orderBy: { executedAt: 'desc' },
    });

    // Spraying
    const sprayingCount = await this.prisma.farmActivity.count({
      where: { ...whereBase, type: ActivityType.SPRAYING },
    });
    const lastSpraying = await this.prisma.farmActivity.findFirst({
      where: { ...whereBase, type: ActivityType.SPRAYING },
      orderBy: { executedAt: 'desc' },
    });

    return {
      success: true,
      message: 'Summary fetched successfully',
      data: {
        totalWateringLiters7d: watering7d._sum.volumeLiter || 0,
        totalWateringLiters30d: watering30d._sum.volumeLiter || 0,
        fertilizationCount: fertCount,
        lastFertilizationDate: lastFert ? lastFert.executedAt : null,
        sprayingCount: sprayingCount,
        lastSprayingDate: lastSpraying ? lastSpraying.executedAt : null,
      },
    };
  }
}
