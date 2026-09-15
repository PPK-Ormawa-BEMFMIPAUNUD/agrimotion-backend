import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEMPLOT_METADATA,
  MlPredictionPayload,
  MlPredictionResponse,
  DssRecommendationResponse,
} from './dss.types.js';

@Injectable()
export class DssService {
  private readonly logger = new Logger(DssService.name);
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

  async getRecommendation(demplotIdRaw: number | string): Promise<DssRecommendationResponse> {
    const demplotId = typeof demplotIdRaw === 'string' ? parseInt(demplotIdRaw, 10) : demplotIdRaw;
    
    const meta = DEMPLOT_METADATA[demplotId];
    if (!meta) {
      throw new Error(`Demplot ID ${demplotId} tidak valid.`);
    }

    // 1. Ambil data telemetri terbaru
    let telemetry = null;
    
    // Coba cari device berdasarkan ID atau Code yang terdaftar
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [
          { id: meta.defaultDeviceId },
          { deviceCode: { in: meta.deviceCodes } },
          { espSerial: { in: meta.deviceCodes } },
        ],
      },
    });

    if (device) {
      telemetry = await this.prisma.telemetry.findFirst({
        where: { deviceId: device.id },
        orderBy: { timestamp: 'desc' },
      });
    }

    if (!telemetry) {
      // Fallback mencoba mencari berdasarkan deviceId default secara langsung (jika relasi terputus)
      telemetry = await this.prisma.telemetry.findFirst({
        where: { deviceId: meta.defaultDeviceId },
        orderBy: { timestamp: 'desc' },
      });
    }

    // 2. Hitung parameter turunan
    const PLANTING_DATE = new Date('2026-08-09T00:00:00Z');
    const now = new Date();
    const diffTime = now.getTime() - PLANTING_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hst = Math.max(1, diffDays >= 0 ? diffDays + 1 : 1);

    // Fallback default aman jika telemetry belum ada
    const soilMoisture = telemetry?.soilMoisture ?? 65.0;
    const soilPh = telemetry?.ph ?? 6.4;
    const soilN = telemetry?.nitrogen ?? 22.4;
    const soilP = telemetry?.phosphorus ?? 15.0;
    const soilK = telemetry?.potassium ?? 25.0;
    const temperature = telemetry?.temperature ?? 26.0;
    const humidity = telemetry?.humidity ?? 80.0;

    const daysSinceLastFert = 7;
    const accumFert7d = 0.0;

    const payload: MlPredictionPayload = {
      demplot_id: demplotId,
      hst,
      soil_moisture: soilMoisture,
      soil_ph: soilPh,
      soil_n: soilN,
      soil_p: soilP,
      soil_k: soilK,
      temperature,
      humidity,
      days_since_last_fert: daysSinceLastFert,
      accum_fert_7d: accumFert7d,
    };

    const sensorSummary = `Air: ${soilMoisture.toFixed(1)}% | pH: ${soilPh.toFixed(1)} | N: ${soilN.toFixed(1)} mg/kg`;

    // 3. Panggil ML Service
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 3000);

      const response = await fetch(`${this.mlServiceUrl}/predict`, {
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

      const mlData = (await response.json()) as MlPredictionResponse;

      return {
        demplotId,
        cropName: meta.cropName,
        recommendedGrams: mlData.recommended_grams,
        recommendedValue: mlData.recommended_grams,
        sensorSummary,
        reason: `Rekomendasi AI (${mlData.recommended_grams}g) berdasarkan kondisi sensor riil dan umur ${hst} HST.`,
        source: 'ml_model',
      } as any;
    } catch (error) {
      this.logger.error(`Gagal menghubungi ML Service: ${(error as Error).message}. Menggunakan fallback.`);
      
      let fallbackGrams = 20.0;
      if (demplotId === 0) fallbackGrams = 20.0; // Pacah
      else if (demplotId === 1) fallbackGrams = hst >= 35 ? 0.0 : 35.0; // Sawi
      else if (demplotId === 2) fallbackGrams = 30.0; // Cabai

      return {
        demplotId,
        cropName: meta.cropName,
        recommendedGrams: fallbackGrams,
        recommendedValue: fallbackGrams,
        sensorSummary,
        reason: `Rekomendasi standar agronomi (${fallbackGrams}g) untuk fase ${hst} HST.`,
        source: 'fallback',
      } as any;
    }
  }
}
