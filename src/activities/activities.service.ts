import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateActivityDto, QueryActivityDto } from './dto/activities.dto.js';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivitiesService implements OnModuleInit {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncWithWateringLogs();
  }

  async syncWithWateringLogs() {
    try {
      const existingActivities = await this.prisma.farmActivity.findMany({
        select: { id: true },
      });
      const existingIds = new Set(existingActivities.map((a) => a.id));

      const logs = await this.prisma.watering_logs.findMany({
        include: { devices: true, users: true },
      });

      const deviceDemplotMap: Record<string, number> = {
        '10000000-0000-0000-0000-000000000001': 0,
        '20000000-0000-0000-0000-000000000001': 1,
        '30000000-0000-0000-0000-000000000001': 2,
        'node-1a': 0,
        'node-2a': 1,
        'node-3a': 2,
      };

      const activeCycles = await this.prisma.cropCycle.findMany({
        where: { status: 'ACTIVE' },
      });
      const cycleMap = new Map<number, string>();
      for (const c of activeCycles) {
        cycleMap.set(c.demplotId, c.id);
      }

      const toInsert: any[] = [];
      for (const log of logs) {
        if (existingIds.has(log.id)) continue;

        const demplotId =
          deviceDemplotMap[log.deviceId] ??
          deviceDemplotMap[log.devices?.deviceCode ?? ''] ??
          0;

        let type: ActivityType = ActivityType.WATERING;
        let substanceName = 'Air Baku Irigasi';
        let dosage = `${log.duration} detik siram otomatis`;

        if (log.type === 'FERTILIZER') {
          type = ActivityType.FERTILIZATION;
          substanceName = 'Pupuk NPK 16-16-16 & Organik Cair';
          dosage = `${log.duration} detik fertigasi kocor`;
        } else if (log.type === 'PESTICIDE') {
          type = ActivityType.SPRAYING;
          substanceName = 'Pestisida Nabati & Fungisida Hayati';
          dosage = `${log.duration} detik semprot kabut`;
        }

        const volumeLiter = Math.round(log.duration * 0.05 * 10) / 10;
        const notes = log.users
          ? `Perlakuan mandiri oleh ${log.users.name} (${log.users.role ?? 'Kader'})`
          : `Aktuasi otomatis oleh sistem cerdas AGRI-MOTION (${log.devices?.deviceCode ?? 'ESP32'})`;

        toInsert.push({
          id: log.id,
          demplotId,
          cropCycleId: cycleMap.get(demplotId) ?? null,
          type,
          volumeLiter,
          substanceName,
          dosage,
          notes,
          executedAt: log.createdAt,
          createdAt: log.createdAt,
        });
      }

      if (toInsert.length > 0) {
        await this.prisma.farmActivity.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
        this.logger.log(`Synced ${toInsert.length} activity records from watering_logs.`);
      }
    } catch (err) {
      this.logger.warn(`Sync with watering_logs skipped: ${err}`);
    }
  }

  async create(dto: CreateActivityDto) {
    const activeCycle = await this.prisma.cropCycle.findFirst({
      where: {
        demplotId: dto.demplotId,
        status: 'ACTIVE',
      },
    });

    const executedDate = dto.executedAt ? new Date(dto.executedAt) : new Date();

    const activity = await this.prisma.farmActivity.create({
      data: {
        demplotId: dto.demplotId,
        type: dto.type,
        volumeLiter: dto.volumeLiter,
        substanceName: dto.substanceName,
        dosage: dto.dosage,
        notes: dto.notes,
        executedAt: executedDate,
        cropCycleId: activeCycle ? activeCycle.id : null,
      },
    });

    // Also sync to watering_logs table for bidirectional consistency
    try {
      const deviceMap: Record<number, string> = {
        0: '10000000-0000-0000-0000-000000000001',
        1: '20000000-0000-0000-0000-000000000001',
        2: '30000000-0000-0000-0000-000000000001',
      };
      const durationSeconds = dto.volumeLiter
        ? Math.round(dto.volumeLiter / 0.05)
        : 30;

      await this.prisma.watering_logs.create({
        data: {
          id: activity.id,
          deviceId: deviceMap[dto.demplotId] ?? deviceMap[0],
          type:
            dto.type === ActivityType.FERTILIZATION
              ? 'FERTILIZER'
              : dto.type === ActivityType.SPRAYING
                ? 'PESTICIDE'
                : 'WATER',
          duration: durationSeconds,
          createdAt: executedDate,
        },
      });
    } catch (_) {}

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

    const whereBase: any = { demplotId };
    if (activeCycle) {
      whereBase.OR = [
        { cropCycleId: activeCycle.id },
        { cropCycleId: null },
      ];
    }

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
