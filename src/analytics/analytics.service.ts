import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';
import { ActivitiesService } from '../activities/activities.service.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private telemetryService: TelemetryService,
    private activitiesService: ActivitiesService,
  ) {}

  private getIdealParameters(demplotId: number) {
    // 0: Pacah, 1: Sawi, 2: Cabai
    const params = {
      0: { n: [50, 100], p: [10, 50], k: [20, 80], ph: [6, 7], m: [40, 60] },
      1: { n: [80, 150], p: [20, 60], k: [40, 100], ph: [6, 7], m: [50, 70] },
      2: { n: [60, 120], p: [30, 80], k: [50, 120], ph: [6, 7], m: [40, 60] },
    };
    return params[demplotId as keyof typeof params] || params[0];
  }

  private calculateScore(value: number, min: number, max: number): number {
    if (value >= min && value <= max) return 100;
    const mid = (min + max) / 2;
    const range = (max - min) / 2;
    const deviation = Math.abs(value - mid);
    // Deduct points based on deviation outside the range
    const penalty = ((deviation - range) / range) * 50;
    return Math.max(0, 100 - penalty);
  }

  private calculateTrend(current: number, previous: number): string {
    if (current === 0 && previous === 0) return 'statis';
    const diff = current - previous;
    if (Math.abs(diff) < 2) return 'statis'; // threshold
    return diff > 0 ? 'naik' : 'turun';
  }

  async getDemplotAnalytics(demplotId: number, period: string) {
    // period: '7d', '30d', 'cycle'
    const now = new Date();
    let startDate = new Date();
    
    if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'cycle') {
      const activeCycle = await this.prisma.cropCycle.findFirst({
        where: { demplotId, status: 'ACTIVE' }
      });
      if (activeCycle) {
        startDate = activeCycle.plantingDate;
      } else {
        startDate.setDate(now.getDate() - 7);
      }
    } else {
      // default '7d'
      startDate.setDate(now.getDate() - 7);
    }

    const deviceIds = await this.telemetryService.resolveDeviceIdsForDemplot(demplotId);
    const deviceIdsJoined = deviceIds.map(id => `'${id}'`).join(',');
    
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        MIN("temperature") as min_temp, MAX("temperature") as max_temp, AVG("temperature") as avg_temp,
        MIN("humidity") as min_hum, MAX("humidity") as max_hum, AVG("humidity") as avg_hum,
        MIN("soilMoisture") as min_sm, MAX("soilMoisture") as max_sm, AVG("soilMoisture") as avg_sm,
        MIN("ph") as min_ph, MAX("ph") as max_ph, AVG("ph") as avg_ph,
        AVG("nitrogen") as avg_n, AVG("phosphorus") as avg_p, AVG("potassium") as avg_k
      FROM telemetry
      WHERE "deviceId" IN (${deviceIdsJoined})
        AND "timestamp" >= $1;
    `, startDate);

    // Calculate trends (comparing with previous period of same length)
    const durationMs = now.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    
    const prevResults: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        AVG("nitrogen") as avg_n, AVG("phosphorus") as avg_p, AVG("potassium") as avg_k
      FROM telemetry
      WHERE "deviceId" IN (${deviceIdsJoined})
        AND "timestamp" >= $1 AND "timestamp" < $2;
    `, prevStartDate, startDate);

    const row = results[0] || {};
    const prevRow = prevResults[0] || {};

    const avgN = Number(row.avg_n) || 0;
    const avgP = Number(row.avg_p) || 0;
    const avgK = Number(row.avg_k) || 0;
    const avgPh = Number(row.avg_ph) || 0;
    const avgSm = Number(row.avg_sm) || 0;

    const ideal = this.getIdealParameters(demplotId);
    
    const scoreN = this.calculateScore(avgN, ideal.n[0], ideal.n[1]);
    const scoreP = this.calculateScore(avgP, ideal.p[0], ideal.p[1]);
    const scoreK = this.calculateScore(avgK, ideal.k[0], ideal.k[1]);
    const scorePh = this.calculateScore(avgPh, ideal.ph[0], ideal.ph[1]);
    const scoreSm = this.calculateScore(avgSm, ideal.m[0], ideal.m[1]);

    const soilHealthScore = Math.round((scoreN + scoreP + scoreK + scorePh + scoreSm) / 5);
    
    let soilHealthStatus = 'Kritis';
    if (soilHealthScore >= 80) soilHealthStatus = 'Kondisi Optimal';
    else if (soilHealthScore >= 60) soilHealthStatus = 'Cukup Baik';

    // Get activities summary for water usage
    const activitiesSummary = await this.activitiesService.getSummary(demplotId);
    const totalWater = period === '30d' ? activitiesSummary.data.totalWateringLiters30d : activitiesSummary.data.totalWateringLiters7d;

    return {
      success: true,
      message: 'Demplot analytics fetched successfully',
      data: {
        soilHealthScore,
        soilHealthStatus,
        extremes: {
          temperature: { min: Number(row.min_temp) || 0, max: Number(row.max_temp) || 0, avg: Number(row.avg_temp) || 0 },
          moisture: { min: Number(row.min_sm) || 0, max: Number(row.max_sm) || 0, avg: Number(row.avg_sm) || 0 },
          humidity: { min: Number(row.min_hum) || 0, max: Number(row.max_hum) || 0, avg: Number(row.avg_hum) || 0 },
          ph: { min: Number(row.min_ph) || 0, max: Number(row.max_ph) || 0, avg: Number(row.avg_ph) || 0 }
        },
        npkTrends: {
          n: { value: avgN, trend: this.calculateTrend(avgN, Number(prevRow.avg_n) || 0) },
          p: { value: avgP, trend: this.calculateTrend(avgP, Number(prevRow.avg_p) || 0) },
          k: { value: avgK, trend: this.calculateTrend(avgK, Number(prevRow.avg_k) || 0) }
        },
        waterUsage: {
          totalLiters: totalWater
        }
      }
    };
  }
}
