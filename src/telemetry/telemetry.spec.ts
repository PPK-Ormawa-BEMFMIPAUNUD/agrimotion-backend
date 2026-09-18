import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryController } from './telemetry.controller.js';
import { TelemetryService } from './telemetry.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActuationController } from '../actuation/actuation.controller.js';
import { ActuationService } from '../actuation/actuation.service.js';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';

describe('Telemetry & Actuation Unit Tests', () => {
  let telemetryController: TelemetryController;
  let telemetryService: TelemetryService;
  let actuationController: ActuationController;
  let actuationService: ActuationService;

  const mockPrismaService = {
    telemetry: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    device: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    watering_logs: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };

  const mockMqttService = {
    publishCommand: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryController, ActuationController],
      providers: [
        TelemetryService,
        ActuationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MqttConnectionService,
          useValue: mockMqttService,
        },
      ],
    }).compile();

    telemetryController = module.get<TelemetryController>(TelemetryController);
    telemetryService = module.get<TelemetryService>(TelemetryService);
    actuationController = module.get<ActuationController>(ActuationController);
    actuationService = module.get<ActuationService>(ActuationService);
  });

  describe('TASK 1: Telemetry latest endpoint', () => {
    it('should return standardized 200 payload when no query params provided and db empty', async () => {
      mockPrismaService.telemetry.findMany.mockResolvedValueOnce([]);
      const result = await telemetryController.getLatest({});
      expect(result).toEqual({
        success: true,
        message: 'Latest telemetry fetched successfully',
        data: [],
      });
    });

    it('should return data: null when demplotId provided and db empty (never throw 400/404)', async () => {
      mockPrismaService.telemetry.findMany.mockResolvedValueOnce([]);
      const result = await telemetryController.getLatest({ demplotId: '0' });
      expect(result).toEqual({
        success: true,
        message: 'Latest telemetry fetched successfully',
        data: null,
      });
    });

    it('should return latest record when demplotId provided and records exist', async () => {
      const mockRecord = {
        id: 'tel-1',
        deviceId: '10000000-0000-0000-0000-000000000001',
        temperature: 28.5,
        humidity: 70.0,
        soilMoisture: 65.0,
        timestamp: new Date(),
      };
      mockPrismaService.telemetry.findMany.mockResolvedValueOnce([mockRecord]);
      const result = await telemetryController.getLatest({ demplotId: '0' });
      expect(result).toEqual({
        success: true,
        message: 'Latest telemetry fetched successfully',
        data: mockRecord,
      });
    });
  });

  describe('TASK 2: Actuation public read endpoints', () => {
    it('should allow fetching water usage analytics publicly without JWT error', async () => {
      const result = await actuationController.getWaterUsageAnalytics('week');
      expect(result).toHaveProperty('demplots');
      expect(result).toHaveProperty('totalLiters');
    });

    it('should allow fetching accumulation publicly', async () => {
      const result = await actuationController.getAccumulation('week');
      expect(result).toHaveProperty('demplots');
    });

    it('should allow fetching watering history publicly', async () => {
      mockPrismaService.watering_logs.findMany.mockResolvedValueOnce([]);
      const result = await actuationController.getHistory('10');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
