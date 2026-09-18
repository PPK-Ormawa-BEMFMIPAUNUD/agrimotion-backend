import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEMPLOT_METADATA } from '../dss/dss.types.js';
import {
  CreateActuationDto,
  StopActuationDto,
  ActuationType,
} from './dto/create-actuation.dto.js';

export interface ActiveActuationItem {
  key: string;
  demplotIndex: number;
  demplot: string;
  type: ActuationType;
  commandOn: string;
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
  timer: NodeJS.Timeout;
}

export interface ActiveActuationResponse {
  key: string;
  demplotIndex: number;
  demplot: string;
  type: ActuationType;
  commandOn: string;
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
  remainingSeconds: number;
}

@Injectable()
export class ActuationService implements OnModuleDestroy {
  private readonly logger = new Logger(ActuationService.name);
  private readonly topic = 'agrimotion/device/pumps/cmd';
  private readonly activeTimers = new Map<string, ActiveActuationItem>();

  constructor(
    private readonly mqttConnection: MqttConnectionService,
    private readonly prisma: PrismaService,
  ) {}

  private getDemplotCode(index: number): string {
    return `D${index + 1}`;
  }

  startActuation(dto: CreateActuationDto): ActiveActuationResponse {
    const demplot = this.getDemplotCode(dto.demplotIndex);
    const key = `${demplot}_${dto.type}`;
    const commandOn = `${key}_ON`;

    // 1. Batalkan timer sebelumnya jika ada
    const existing = this.activeTimers.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.logger.warn(
        `Timer sebelumnya untuk ${key} dibatalkan karena permintaan baru masuk.`,
      );
    }

    // 2. Publish MQTT Command ON
    this.mqttConnection.publishCommand(this.topic, commandOn);

    // 3. Set waktu mulai dan selesai
    const now = new Date();
    const endsAt = new Date(now.getTime() + dto.durationSeconds * 1000);

    // 4. Daftarkan timer
    const timer = setTimeout(() => {
      this.handleTimerExpiry(dto.demplotIndex, dto.type);
    }, dto.durationSeconds * 1000);

    // 5. Simpan state di memory map
    const activeItem: ActiveActuationItem = {
      key,
      demplotIndex: dto.demplotIndex,
      demplot,
      type: dto.type,
      commandOn,
      durationSeconds: dto.durationSeconds,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      timer,
    };
    this.activeTimers.set(key, activeItem);

    this.logger.log(
      `Actuation started: ${commandOn} for ${dto.durationSeconds}s. Ends at ${endsAt.toISOString()}`,
    );

    return this.mapToResponse(activeItem);
  }

  stopActuation(dto?: StopActuationDto): {
    stopped: string[];
    commandPublished: string;
  } {
    // Jika spesifik demplotIndex dan type diberikan
    if (dto?.demplotIndex !== undefined && dto?.type !== undefined) {
      const demplot = this.getDemplotCode(dto.demplotIndex);
      const key = `${demplot}_${dto.type}`;
      const commandOff = `${key}_OFF`;

      const existing = this.activeTimers.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        this.activeTimers.delete(key);
      }

      this.mqttConnection.publishCommand(this.topic, commandOff);
      this.logger.log(`Manual stop requested for ${key}. Published: ${commandOff}`);

      return { stopped: [key], commandPublished: commandOff };
    }

    // Emergency Stop All (jika parameter kosong / ALL_OFF)
    const stoppedKeys = Array.from(this.activeTimers.keys());
    for (const item of this.activeTimers.values()) {
      clearTimeout(item.timer);
    }
    this.activeTimers.clear();

    const commandAllOff = 'ALL_OFF';
    this.mqttConnection.publishCommand(this.topic, commandAllOff);
    this.logger.log(`Emergency stop all requested. Published: ${commandAllOff}`);

    return { stopped: stoppedKeys, commandPublished: commandAllOff };
  }

  private handleTimerExpiry(demplotIndex: number, type: ActuationType): void {
    const demplot = this.getDemplotCode(demplotIndex);
    const key = `${demplot}_${type}`;
    const commandOff = `${key}_OFF`;

    this.activeTimers.delete(key);
    this.mqttConnection.publishCommand(this.topic, commandOff);
    this.logger.log(`Actuation timer expired for ${key}. Published: ${commandOff}`);
  }

  getActiveActuations(): ActiveActuationResponse[] {
    const results: ActiveActuationResponse[] = [];

    for (const item of this.activeTimers.values()) {
      results.push(this.mapToResponse(item));
    }

    return results;
  }

  private mapToResponse(item: ActiveActuationItem): ActiveActuationResponse {
    const nowTime = Date.now();
    const endsTime = new Date(item.endsAt).getTime();
    const remainingSeconds = Math.max(0, Math.ceil((endsTime - nowTime) / 1000));

    return {
      key: item.key,
      demplotIndex: item.demplotIndex,
      demplot: item.demplot,
      type: item.type,
      commandOn: item.commandOn,
      durationSeconds: item.durationSeconds,
      startedAt: item.startedAt,
      endsAt: item.endsAt,
      remainingSeconds,
    };
  }

  onModuleDestroy(): void {
    this.logger.log('Cleaning up all actuation timers before module destruction...');
    for (const item of this.activeTimers.values()) {
      clearTimeout(item.timer);
    }
    this.activeTimers.clear();
  }

  async getWaterUsageAnalytics(period: string) {
    const d = new Date();
    if (period === 'day') d.setHours(d.getHours() - 24);
    else if (period === 'month') d.setDate(d.getDate() - 30);
    else d.setDate(d.getDate() - 7);
    
    const waterFlowRate = 0.05; // L/s
    
    const demplotsConfig = [
      { demplotIndex: 0, name: 'Demplot 1', commodity: 'Bunga Pacah' },
      { demplotIndex: 1, name: 'Demplot 2', commodity: 'Sayuran Hijau' },
      { demplotIndex: 2, name: 'Demplot 3', commodity: 'Cabai' },
    ];
    
    let dbLogs: any[] = [];
    try {
      dbLogs = await this.prisma.$queryRawUnsafe(`
        SELECT "deviceId", SUM("duration")::int as total_duration
        FROM "watering_logs"
        WHERE "type" = 'WATER' AND "createdAt" >= $1
        GROUP BY "deviceId"
      `, d);
    } catch (e) {
      // Table might not exist yet, ignore
    }

    const results = demplotsConfig.map(cfg => {
      const meta = DEMPLOT_METADATA[cfg.demplotIndex];
      let totalDurationSeconds = 0;
      
      if (dbLogs && dbLogs.length > 0) {
        for (const log of dbLogs) {
          if (log.deviceId === meta.defaultDeviceId || meta.deviceCodes.includes(log.deviceId)) {
            totalDurationSeconds += (log.total_duration || 0);
          }
        }
      } else {
         if (period === 'day') totalDurationSeconds = (cfg.demplotIndex + 1) * 30;
         else if (period === 'month') totalDurationSeconds = (cfg.demplotIndex + 1) * 900;
         else totalDurationSeconds = (cfg.demplotIndex + 1) * 200;
      }
      
      const estimatedLiters = Math.round((totalDurationSeconds * waterFlowRate) * 10) / 10;
      return {
        ...cfg,
        totalDurationSeconds,
        estimatedLiters,
        status: "Optimal"
      };
    });

    const totalLiters = results.reduce((acc, curr) => acc + curr.estimatedLiters, 0);

    return {
      period,
      demplots: results,
      totalLiters: Math.round(totalLiters * 10) / 10,
    };
  }

  async getAccumulation(period: string = 'week') {
    return this.getWaterUsageAnalytics(period);
  }

  async getHistory(limit: number = 20) {
    try {
      const logs = await this.prisma.watering_logs.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          devices: true,
          users: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
      return logs;
    } catch (e) {
      this.logger.warn(`Failed to fetch watering_logs: ${e}`);
      return [];
    }
  }
}
