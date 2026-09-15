import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEMPLOT_EWS_METADATA,
  EwsPredictionPayload,
  EwsPredictionResponse,
  EwsStatusResponse,
} from './ews.types.js';

@Injectable()
export class EwsService {
  private readonly logger = new Logger(EwsService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://127.0.0.1:8000',
    );
  }

  async getEwsStatus(demplotId: number): Promise<EwsStatusResponse> {
    const meta = DEMPLOT_EWS_METADATA[demplotId];
    if (!meta) {
      throw new Error(`Demplot ID ${demplotId} tidak valid.`);
    }

    // 1. Validasi & Penentuan HST
    const PLANTING_DATE = new Date('2026-08-09T00:00:00Z');
    const now = new Date();
    const diffTime = now.getTime() - PLANTING_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hst = Math.max(1, diffDays >= 0 ? diffDays + 1 : 1);

    const isSawiHarvestLock = demplotId === 1 && hst >= 35;
    const pesticideAllowed = !isSawiHarvestLock;

    // 2. Query Telemetri via Prisma
    let telemetryRecords: any[] = [];
    try {
      const device = await this.prisma.device.findFirst({
        where: {
          OR: [
            { id: meta.defaultDeviceId },
            { deviceCode: { in: meta.deviceCodes } },
            { espSerial: { in: meta.deviceCodes } },
          ],
        },
      });

      const deviceId = device ? device.id : meta.defaultDeviceId;
      const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      telemetryRecords = await this.prisma.telemetry.findMany({
        where: {
          deviceId,
          timestamp: { gte: since48h },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (telemetryRecords.length === 0) {
        telemetryRecords = await this.prisma.telemetry.findMany({
          where: { deviceId },
          orderBy: { timestamp: 'desc' },
          take: 48,
        });
      }
    } catch (error) {
      this.logger.warn(`Gagal query database telemetri: ${(error as Error).message}. Menggunakan fallback baseline.`);
    }

    // 3. Kalkulasi Fitur Time-Series
    let temperature = 26.5;
    let humidity = 80.0;
    let lightLux = 0.0;
    let tempMean24h = 26.5;
    let humidityMean24h = 80.0;
    let consecutiveHoursIdeal = 0;

    if (telemetryRecords.length > 0) {
      const latest = telemetryRecords[0];
      temperature = latest.temperature ?? 26.5;
      humidity = latest.humidity ?? 80.0;
      lightLux = latest.lux ?? 0.0;

      // Filter last 24h for means
      const latestTime = new Date(latest.timestamp).getTime();
      const records24h = telemetryRecords.filter(
        (r) => new Date(r.timestamp).getTime() >= latestTime - 24 * 60 * 60 * 1000
      );

      const validTemps = records24h.map(r => r.temperature).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      const validHums = records24h.map(r => r.humidity).filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      
      tempMean24h = validTemps.length > 0 ? Number((validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)) : temperature;
      humidityMean24h = validHums.length > 0 ? Number((validHums.reduce((a, b) => a + b, 0) / validHums.length).toFixed(1)) : humidity;

      // Consecutive hours ideal count (temp 24-33, humidity >= 75)
      // Assuming each record is roughly 1 hour apart based on prompt context (or we just count consecutive valid records backwards)
      let consecutive = 0;
      for (const r of telemetryRecords) {
        const t = r.temperature ?? 26.5;
        const h = r.humidity ?? 80.0;
        if (t >= 24 && t <= 33 && h >= 75) {
          consecutive++;
        } else {
          break;
        }
      }
      consecutiveHoursIdeal = consecutive;
    }

    const currentHour = now.getHours();
    const isNightTime = currentHour >= 18 || currentHour < 6;
    const isNightOrDim = lightLux < 300 || isNightTime ? 1 : 0;

    const microclimateMetrics = {
      temperature,
      humidity,
      lightLux,
      tempMean24h,
      humidityMean24h,
      consecutiveHoursIdeal,
    };

    const payload: EwsPredictionPayload = {
      demplot_id: demplotId,
      hst,
      temperature,
      humidity,
      light_lux: lightLux,
      temp_mean_24h: tempMean24h,
      humidity_mean_24h: humidityMean24h,
      consecutive_hours_ideal: consecutiveHoursIdeal,
      is_night_or_dim: isNightOrDim,
    };

    // 4. Panggilan ke FastAPI & Mekanisme Fallback
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 3000);

      const response = await fetch(`${this.mlServiceUrl}/predict-ews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ML Service returned ${response.status}`);
      }

      const mlData = (await response.json()) as EwsPredictionResponse;

      return {
        demplotId,
        commodity: meta.cropName,
        hst,
        riskLevel: mlData.risk_level,
        riskLabel: mlData.risk_label,
        confidence: mlData.confidence,
        microclimateMetrics,
        actionRecommendation: this.getActionRecommendation(isSawiHarvestLock, mlData.risk_level),
        pesticideAllowed,
        source: 'ml_model',
      };
    } catch (error) {
      this.logger.error(`Gagal menghubungi ML Service EWS: ${(error as Error).message}. Menggunakan fallback.`);

      // Rule-based fallback
      let fallbackRiskLevel: 0 | 1 | 2 = 0;
      if (isSawiHarvestLock) {
        fallbackRiskLevel = 0;
      } else if (
        (consecutiveHoursIdeal >= 48 && (humidity > 80 || humidityMean24h > 80)) ||
        (demplotId === 2 && isNightOrDim === 1 && humidityMean24h >= 80 && consecutiveHoursIdeal >= 24)
      ) {
        fallbackRiskLevel = 2;
      } else if (consecutiveHoursIdeal >= 12) {
        fallbackRiskLevel = 1;
      } else {
        fallbackRiskLevel = 0;
      }

      const riskLabelMap: Record<0 | 1 | 2, string> = { 0: 'Aman', 1: 'Waspada', 2: 'Bahaya' };

      return {
        demplotId,
        commodity: meta.cropName,
        hst,
        riskLevel: fallbackRiskLevel,
        riskLabel: riskLabelMap[fallbackRiskLevel],
        confidence: 0.85, // Deterministic rule-based confidence
        microclimateMetrics,
        actionRecommendation: this.getActionRecommendation(isSawiHarvestLock, fallbackRiskLevel),
        pesticideAllowed,
        source: 'fallback',
      };
    }
  }

  private getActionRecommendation(isSawiHarvestLock: boolean, riskLevel: number): string {
    if (isSawiHarvestLock) {
      return 'Masa panen tiba. Penyemprotan pestisida kimia dilarang demi keamanan konsumsi.';
    } else if (riskLevel === 2) {
      return 'Risiko ledakan ulat tinggi! Periksa daun bawah dan aktifkan light trap/semprot insektisida terarah.';
    } else if (riskLevel === 1) {
      return 'Kondisi iklim mendukung penetasan telur. Lakukan monitoring visual tajuk tanaman.';
    } else {
      return 'Kondisi iklim aman dari potensi ledakan ulat.';
    }
  }
}
