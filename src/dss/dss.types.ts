export interface DemplotMeta {
  demplotId: number;
  cropName: string;
  defaultDeviceId: string;
  deviceCodes: string[];
}

export const DEMPLOT_METADATA: Record<number, DemplotMeta> = {
  0: {
    demplotId: 0,
    cropName: 'Bunga Pacah',
    defaultDeviceId: '10000000-0000-0000-0000-000000000001',
    deviceCodes: ['node-1a', 'DEV-001', 'ESP32-001'],
  },
  1: {
    demplotId: 1,
    cropName: 'Sayuran Hijau',
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

export interface MlPredictionPayload {
  demplot_id: number;
  hst: number;
  soil_moisture: number;
  soil_ph: number;
  soil_n: number;
  soil_p: number;
  soil_k: number;
  temperature: number;
  humidity: number;
  days_since_last_fert: number;
  accum_fert_7d: number;
}

export interface MlPredictionResponse {
  demplot_id: number;
  recommended_grams: number;
  status: string;
}

export interface SensorSummary {
  soilMoisture: number;
  nitrogen: number;
  ph: number;
}

export interface DssRecommendationResponse {
  demplotId: number;
  cropName: string;
  recommendedGrams: number;
  sensorSummary: SensorSummary;
  source: 'ml_model' | 'fallback';
}
