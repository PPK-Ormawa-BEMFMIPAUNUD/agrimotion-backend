import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelemetryQueryDto } from './dto/telemetry-query.dto.js';
import type { Telemetry, Prisma } from '@prisma/client';
import { DEMPLOT_METADATA } from '../dss/dss.types.js';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SoilMoistureTrendItem {
  date: string;
  dayName: string;
  avgSoilMoisture: number;
}

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatest(
    query?: TelemetryQueryDto | string | number,
  ): Promise<{
    success: boolean;
    message: string;
    data: Telemetry | Telemetry[] | null;
  }> {
    let dto: TelemetryQueryDto = {};
    if (typeof query === 'string' || typeof query === 'number') {
      dto = { demplotId: String(query) };
    } else if (query) {
      dto = query;
    }

    const where = await this.buildWhereClause(dto);
    const limit = dto.limit ?? 10;

    const records = await this.prisma.telemetry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { device: true },
    });

    const isDemplotFiltered = dto.demplotId !== undefined && dto.demplotId !== '';

    if (!records || records.length === 0) {
      return {
        success: true,
        message: 'Latest telemetry fetched successfully',
        data: isDemplotFiltered ? null : [],
      };
    }

    return {
      success: true,
      message: 'Latest telemetry fetched successfully',
      data: isDemplotFiltered ? records[0] : records,
    };
  }

  async getHistory(
    query: TelemetryQueryDto,
  ): Promise<PaginatedResult<Telemetry>> {
    const where = await this.buildWhereClause(query);
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

  private async buildWhereClause(
    query?: TelemetryQueryDto,
  ): Promise<Prisma.TelemetryWhereInput> {
    const where: Prisma.TelemetryWhereInput = {};
    if (!query) return where;

    if (query.demplotId !== undefined && query.demplotId !== '') {
      const deviceIds = await this.resolveDeviceIdsForDemplot(query.demplotId);
      if (deviceIds.length > 0) {
        where.deviceId = { in: deviceIds };
      }
    } else if (query.deviceId) {
      where.deviceId = query.deviceId;
    } else if (query.nodeId) {
      const dev = await this.prisma.device.findFirst({
        where: {
          OR: [{ deviceCode: query.nodeId }, { espSerial: query.nodeId }],
        },
      });
      if (dev) {
        where.deviceId = dev.id;
      }
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

  async resolveDeviceIdsForDemplot(demplotIdRaw: string | number): Promise<string[]> {
    let demplotId = typeof demplotIdRaw === 'string' ? parseInt(demplotIdRaw, 10) : demplotIdRaw;
    
    // 1. Is it a known index (0, 1, 2)?
    if (!isNaN(demplotId) && DEMPLOT_METADATA[demplotId]) {
      const meta = DEMPLOT_METADATA[demplotId];
      const devices = await this.prisma.device.findMany({
        where: {
          OR: [
            { id: meta.defaultDeviceId },
            { deviceCode: { in: meta.deviceCodes } },
            { espSerial: { in: meta.deviceCodes } },
          ],
        },
      });
      if (devices.length > 0) return devices.map((d) => d.id);
      return [meta.defaultDeviceId];
    }
    
    const strId = demplotIdRaw.toString();
    
    // 2. Try fetching by deviceCode
    const deviceByCode = await this.prisma.device.findUnique({
      where: { deviceCode: strId },
    });
    if (deviceByCode) return [deviceByCode.id];
    
    // 3. Check if it's a UUID matching a device
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strId);
    if (isUuid) {
      const deviceById = await this.prisma.device.findUnique({
        where: { id: strId },
      });
      if (deviceById) return [deviceById.id];
      
      // 4. Check if it's a UUID matching a farm
      const farmDevices = await this.prisma.device.findMany({
        where: { farmId: strId },
      });
      if (farmDevices.length > 0) return farmDevices.map((d) => d.id);
      
      // Fallback: assume strId is the deviceId UUID even if not found in db
      return [strId];
    }
    
    // Ultimate fallback for unknown IDs
    return [DEMPLOT_METADATA[0].defaultDeviceId];
  }

  async getSoilMoistureTrends(demplotIdRaw: string | number, days: number = 7): Promise<SoilMoistureTrendItem[]> {
    const deviceIds = await this.resolveDeviceIdsForDemplot(demplotIdRaw);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
        
    let results: Array<{ date: string | Date; avg_soil_moisture: number | string | null }> = [];
    
    if (deviceIds.length === 1) {
      results = await this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE("timestamp"), 'YYYY-MM-DD') AS date,
          ROUND(AVG("soilMoisture")::numeric, 1) AS avg_soil_moisture
        FROM telemetry
        WHERE "deviceId" = ${deviceIds[0]}::uuid
          AND "timestamp" >= ${startDate}
        GROUP BY DATE("timestamp")
        ORDER BY DATE("timestamp") ASC;
      `;
    } else {
      const deviceIdsJoined = deviceIds.map(id => `'${id}'`).join(',');
      results = await this.prisma.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(DATE("timestamp"), 'YYYY-MM-DD') AS date,
          ROUND(AVG("soilMoisture")::numeric, 1) AS avg_soil_moisture
        FROM telemetry
        WHERE "deviceId" IN (${deviceIdsJoined})
          AND "timestamp" >= $1
        GROUP BY DATE("timestamp")
        ORDER BY DATE("timestamp") ASC;
      `, startDate);
    }

    const resultMap = new Map<string, number>();
    for (const row of results) {
      const dStr = typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 10);
      const avg = row.avg_soil_moisture !== null ? Number(row.avg_soil_moisture) : 0;
      resultMap.set(dStr, avg);
    }

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const trendData: SoilMoistureTrendItem[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = dayNames[d.getDay()];
      const avgSoilMoisture = resultMap.has(dateStr) ? resultMap.get(dateStr)! : 0.0;
      
      trendData.push({
        date: dateStr,
        dayName,
        avgSoilMoisture,
      });
    }

    return trendData;
  }

  private getStartDateForPeriod(period: string): Date {
    const d = new Date();
    if (period === 'day') {
      d.setHours(d.getHours() - 24);
    } else if (period === 'month') {
      d.setDate(d.getDate() - 30);
    } else {
      d.setDate(d.getDate() - 7);
    }
    return d;
  }

  async getAnalyticsOverview(demplotIdRaw: string | number, period: string) {
    const deviceIds = await this.resolveDeviceIdsForDemplot(demplotIdRaw);
    const startDate = this.getStartDateForPeriod(period);
    
    const deviceIdsJoined = deviceIds.map(id => `'${id}'`).join(',');
    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total_samples,
        ROUND(AVG("soilMoisture")::numeric, 1) AS avg_soil_moisture,
        ROUND(AVG("temperature")::numeric, 1) AS avg_temperature,
        ROUND(AVG("humidity")::numeric, 1) AS avg_humidity,
        ROUND(AVG("ph")::numeric, 1) AS avg_ph,
        ROUND(AVG("nitrogen")::numeric, 1) AS avg_nitrogen,
        ROUND(AVG("phosphorus")::numeric, 1) AS avg_phosphorus,
        ROUND(AVG("potassium")::numeric, 1) AS avg_potassium
      FROM telemetry
      WHERE "deviceId" IN (${deviceIdsJoined})
        AND "timestamp" >= $1;
    `, startDate);

    const row = results[0];
    const avgN = Number(row.avg_nitrogen) || 0;
    const avgP = Number(row.avg_phosphorus) || 0;
    const avgK = Number(row.avg_potassium) || 0;
    const avgNpkIndex = Math.round(((avgN + avgP + avgK) / 3) * 10) / 10;
    
    const activeSensorsCount: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT "deviceId")::int AS active_sensors
      FROM telemetry
      WHERE "deviceId" IN (${deviceIdsJoined})
        AND "timestamp" >= $1;
    `, startDate);

    return {
      demplotId: demplotIdRaw,
      period,
      startDate,
      endDate: new Date(),
      totalSamples: Number(row.total_samples) || 0,
      metrics: {
        avgSoilMoisture: Number(row.avg_soil_moisture) || 0,
        avgTemperature: Number(row.avg_temperature) || 0,
        avgHumidity: Number(row.avg_humidity) || 0,
        avgPh: Number(row.avg_ph) || 0,
        avgNitrogen: avgN,
        avgPhosphorus: avgP,
        avgPotassium: avgK,
        avgNpkIndex,
      },
      activeSensors: Number(activeSensorsCount[0]?.active_sensors) || 0,
    };
  }
}
