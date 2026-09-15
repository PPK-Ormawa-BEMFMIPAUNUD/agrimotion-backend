export interface DemplotEwsMeta {
  demplotId: number;
  cropName: string;
  defaultDeviceId: string;
  deviceCodes: string[];
}

export const DEMPLOT_EWS_METADATA: Record<number, DemplotEwsMeta> = {
  0: {
    demplotId: 0,
    cropName: 'Bunga Pacah',
    defaultDeviceId: '10000000-0000-0000-0000-000000000001',
    deviceCodes: ['node-1a', 'DEV-001', 'ESP32-001'],
  },
  1: {
    demplotId: 1,
    cropName: 'Sayuran Hijau/Sawi',
    defaultDeviceId: '20000000-0000-0000-0000-000000000001',
    deviceCodes: ['node-2a', 'DEV-002', 'ESP32-002'],
  },
  2: {
    demplotId: 2,
    cropName: 'Cabai',
    defaultDeviceId: '30000000-0000-0000-0000-000000000001',
    deviceCodes: ['node-3a', 'DEV-003', 'ESP32-003'],
  },
};

export interface EwsPredictionPayload {
  demplot_id: number;
  hst: number;
  temperature: number;
  humidity: number;
  light_lux: number;
  temp_mean_24h: number;
  humidity_mean_24h: number;
  consecutive_hours_ideal: number;
  is_night_or_dim: number; // 0 | 1
}

export interface EwsPredictionResponse {
  status: string;
  demplot_id: number;
  risk_level: number;
  risk_label: string;
  confidence: number;
}

export type EwsRiskLevel = 0 | 1 | 2;
export type EwsRiskLabel = 'Aman' | 'Waspada' | 'Bahaya';

export interface EwsMicroclimateMetrics {
  temperature: number;
  humidity: number;
  lightLux: number;
  tempMean24h: number;
  humidityMean24h: number;
  consecutiveHoursIdeal: number;
}

export interface EwsStatusResponse {
  demplotId: number;
  commodity: string;
  hst: number;
  riskLevel: number;
  riskLabel: string;
  confidence: number;
  microclimateMetrics: EwsMicroclimateMetrics;
  actionRecommendation: string;
  pesticideAllowed: boolean;
  source: 'ml_model' | 'fallback';
}
