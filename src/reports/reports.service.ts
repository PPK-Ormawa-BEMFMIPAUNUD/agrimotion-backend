import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';
import { QueryReportDto } from './dto/reports.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryService: TelemetryService,
  ) {}

  private getWitaDateOnly(date: Date): Date {
    const witaTime = new Date(date.getTime() + 8 * 3600 * 1000);
    return new Date(Date.UTC(witaTime.getUTCFullYear(), witaTime.getUTCMonth(), witaTime.getUTCDate()));
  }

  private calculateHst(plantingDate: Date): number {
    const plantingWita = this.getWitaDateOnly(plantingDate);
    const nowWita = this.getWitaDateOnly(new Date());
    const msPerDay = 24 * 3600 * 1000;
    return Math.max(0, Math.floor((nowWita.getTime() - plantingWita.getTime()) / msPerDay));
  }

  private determinePhase(demplotId: number, hst: number): string {
    if (demplotId === 0) { // Bunga Pacah
      if (hst <= 14) return 'Vegetatif Awal';
      if (hst <= 35) return 'Vegetatif Lanjut';
      if (hst <= 55) return 'Generatif / Pembungaan';
      return 'Masa Panen';
    } else if (demplotId === 1) { // Sawi
      if (hst <= 10) return 'Vegetatif Awal';
      if (hst <= 25) return 'Vegetatif Aktif';
      if (hst <= 35) return 'Siap Panen';
      return 'Pasca Panen';
    } else if (demplotId === 2) { // Cabai
      if (hst <= 20) return 'Vegetatif Awal';
      if (hst <= 50) return 'Vegetatif Lanjut';
      if (hst <= 80) return 'Generatif';
      return 'Masa Panen';
    }
    return 'Masa Tanam';
  }

  async getDemplotReport(demplotId: number, query: QueryReportDto) {
    // 1. Resolve Devices
    const deviceIds = await this.telemetryService.resolveDeviceIdsForDemplot(demplotId);
    
    // 2. Resolve Crop Cycle & Dates
    let startDate: Date;
    const endDate = new Date(); // now
    let cropCycle = null;

    if (query.cropCycleId) {
      cropCycle = await this.prisma.cropCycle.findUnique({
        where: { id: query.cropCycleId }
      });
      if (!cropCycle) throw new NotFoundException('Crop cycle not found');
      startDate = cropCycle.plantingDate;
    } else if (query.period === 'cycle') {
      cropCycle = await this.prisma.cropCycle.findFirst({
        where: { demplotId, status: 'ACTIVE' },
        orderBy: { plantingDate: 'desc' }
      });
      if (cropCycle) {
        startDate = cropCycle.plantingDate;
      } else {
        // Fallback if no active cycle
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
    } else if (query.period === 'monthly') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else { // default weekly
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    // 3. Aggregate Telemetry Data (Daily)
    const deviceIdsJoined = deviceIds.map(id => `'${id}'`).join(',');
    
    const telemetryDaily: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        TO_CHAR(DATE("timestamp"), 'YYYY-MM-DD') AS date,
        ROUND(AVG("temperature")::numeric, 1) AS avg_temp,
        ROUND(MIN("temperature")::numeric, 1) AS min_temp,
        ROUND(MAX("temperature")::numeric, 1) AS max_temp,
        ROUND(AVG("soilMoisture")::numeric, 1) AS avg_moisture,
        ROUND(MIN("soilMoisture")::numeric, 1) AS min_moisture,
        ROUND(MAX("soilMoisture")::numeric, 1) AS max_moisture,
        ROUND(AVG("humidity")::numeric, 1) AS avg_humidity,
        ROUND(MIN("humidity")::numeric, 1) AS min_humidity,
        ROUND(MAX("humidity")::numeric, 1) AS max_humidity,
        ROUND(AVG("ph")::numeric, 1) AS avg_ph,
        ROUND(AVG("nitrogen")::numeric, 1) AS avg_n,
        ROUND(AVG("phosphorus")::numeric, 1) AS avg_p,
        ROUND(AVG("potassium")::numeric, 1) AS avg_k
      FROM telemetry
      WHERE "deviceId" IN (${deviceIdsJoined})
        AND "timestamp" >= $1
        AND "timestamp" <= $2
      GROUP BY DATE("timestamp")
      ORDER BY DATE("timestamp") ASC;
    `, startDate, endDate);

    // 4. Aggregate Activities (Daily)
    const activitiesRaw = await this.prisma.farmActivity.findMany({
      where: {
        demplotId,
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { executedAt: 'asc' },
    });

    const activitiesByDate = new Map<string, string[]>();
    let totalWaterLiters = 0;
    let fertilizationCount = 0;
    let sprayingCount = 0;

    for (const act of activitiesRaw) {
      const dateStr = act.executedAt.toISOString().slice(0, 10);
      if (!activitiesByDate.has(dateStr)) {
        activitiesByDate.set(dateStr, []);
      }
      
      let summaryStr = '';
      if (act.type === 'WATERING') {
        summaryStr = `Penyiraman ${act.volumeLiter || 0}L`;
        totalWaterLiters += act.volumeLiter || 0;
      } else if (act.type === 'FERTILIZATION') {
        summaryStr = `Pemupukan ${act.substanceName || 'Nutrisi'} ${act.volumeLiter || 0}L`;
        fertilizationCount++;
      } else if (act.type === 'SPRAYING') {
        summaryStr = `Penyemprotan ${act.substanceName || 'Pestisida'}`;
        sprayingCount++;
      }
      
      if (summaryStr) {
        activitiesByDate.get(dateStr)!.push(summaryStr);
      }
    }

    // 5. Combine Daily Data
    const dailyDataMap = new Map<string, any>();
    
    // Fill all days between startDate and endDate
    const iterDate = new Date(startDate);
    iterDate.setHours(0,0,0,0);
    const endZero = new Date(endDate);
    endZero.setHours(0,0,0,0);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    while (iterDate <= endZero) {
      const dateStr = iterDate.toISOString().slice(0, 10);
      dailyDataMap.set(dateStr, {
        date: dateStr,
        dayName: dayNames[iterDate.getDay()],
        avgTemp: 0, minTemp: 0, maxTemp: 0,
        avgMoisture: 0, minMoisture: 0, maxMoisture: 0,
        avgHumidity: 0, minHumidity: 0, maxHumidity: 0,
        avgPh: 0,
        avgN: 0, avgP: 0, avgK: 0,
        activities: [],
      });
      iterDate.setDate(iterDate.getDate() + 1);
    }

    // Overlay telemetry
    for (const t of telemetryDaily) {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toISOString().slice(0, 10);
      if (dailyDataMap.has(dateStr)) {
        const item = dailyDataMap.get(dateStr);
        item.avgTemp = Number(t.avg_temp) || 0;
        item.minTemp = Number(t.min_temp) || 0;
        item.maxTemp = Number(t.max_temp) || 0;
        item.avgMoisture = Number(t.avg_moisture) || 0;
        item.minMoisture = Number(t.min_moisture) || 0;
        item.maxMoisture = Number(t.max_moisture) || 0;
        item.avgHumidity = Number(t.avg_humidity) || 0;
        item.minHumidity = Number(t.min_humidity) || 0;
        item.maxHumidity = Number(t.max_humidity) || 0;
        item.avgPh = Number(t.avg_ph) || 0;
        item.avgN = Number(t.avg_n) || 0;
        item.avgP = Number(t.avg_p) || 0;
        item.avgK = Number(t.avg_k) || 0;
      }
    }

    // Overlay activities
    for (const [dateStr, acts] of activitiesByDate.entries()) {
      if (dailyDataMap.has(dateStr)) {
        dailyDataMap.get(dateStr).activities = acts;
      }
    }

    const dailyReportItems = Array.from(dailyDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Calculate Summaries
    let sumTemp = 0, sumMoist = 0, sumHum = 0, sumPh = 0, activeDays = 0;
    for (const d of dailyReportItems) {
      if (d.avgTemp > 0 || d.avgMoisture > 0) {
        sumTemp += d.avgTemp;
        sumMoist += d.avgMoisture;
        sumHum += d.avgHumidity;
        sumPh += d.avgPh;
        activeDays++;
      }
    }

    const avgTempOverall = activeDays > 0 ? (sumTemp / activeDays) : 0;
    const avgMoistOverall = activeDays > 0 ? (sumMoist / activeDays) : 0;
    const avgHumOverall = activeDays > 0 ? (sumHum / activeDays) : 0;
    const avgPhOverall = activeDays > 0 ? (sumPh / activeDays) : 0;

    // Soil Health Score logic (simplified for report)
    let soilHealthScore = 0;
    if (activeDays > 0) {
      let score = 100;
      if (avgMoistOverall < 40 || avgMoistOverall > 80) score -= 20;
      if (avgPhOverall < 5.5 || avgPhOverall > 7.5) score -= 20;
      soilHealthScore = Math.max(0, score);
    }

    let hst = 0;
    let phase = '';
    let commodity = demplotId === 0 ? 'Bunga Pacah' : demplotId === 1 ? 'Sawi' : 'Cabai';
    let plantingDateStr = '';

    if (cropCycle) {
      hst = this.calculateHst(cropCycle.plantingDate);
      phase = this.determinePhase(demplotId, hst);
      commodity = cropCycle.commodityName;
      plantingDateStr = cropCycle.plantingDate.toISOString();
    }

    return {
      header: {
        demplotId,
        demplotName: demplotId === 0 ? 'Demplot Bunga Pacah' : demplotId === 1 ? 'Demplot Sawi' : 'Demplot Cabai',
        commodity,
        plantingDate: plantingDateStr,
        hst,
        phase,
        periodLabel: query.period === 'cycle' ? 'Satu Siklus Tanam Berjalan' : query.period === 'monthly' ? '30 Hari Terakhir' : '7 Hari Terakhir',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        avgTemp: Number(avgTempOverall.toFixed(1)),
        avgMoisture: Number(avgMoistOverall.toFixed(1)),
        avgHumidity: Number(avgHumOverall.toFixed(1)),
        avgPh: Number(avgPhOverall.toFixed(1)),
        soilHealthScore,
        totalWaterLiters,
        fertilizationCount,
        sprayingCount,
      },
      dailyRecords: dailyReportItems,
    };
  }
}
