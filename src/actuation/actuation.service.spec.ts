import { Test, TestingModule } from '@nestjs/testing';
import { ActuationService } from './actuation.service.js';
import { MqttConnectionService } from '../mqtt/mqtt-connection.service.js';
import { ActuationType } from './dto/create-actuation.dto.js';

describe('ActuationService', () => {
  let service: ActuationService;
  let mqttConnectionMock: jest.Mocked<MqttConnectionService>;

  beforeEach(async () => {
    // Mock MqttConnectionService
    mqttConnectionMock = {
      publishCommand: jest.fn(),
    } as unknown as jest.Mocked<MqttConnectionService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActuationService,
        {
          provide: MqttConnectionService,
          useValue: mqttConnectionMock,
        },
      ],
    }).compile();

    service = module.get<ActuationService>(ActuationService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    service.onModuleDestroy(); // clean up memory map
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startActuation', () => {
    it('should start an actuation timer and publish ON command', () => {
      const dto = {
        demplotIndex: 0,
        type: ActuationType.PUPUK,
        durationSeconds: 10,
      };

      const result = service.startActuation(dto);

      // Verify MQTT publish
      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledWith(
        'agrimotion/device/pumps/cmd',
        'D1_PUPUK_ON',
      );

      // Verify response
      expect(result).toMatchObject({
        key: 'D1_PUPUK',
        demplotIndex: 0,
        demplot: 'D1',
        type: ActuationType.PUPUK,
        commandOn: 'D1_PUPUK_ON',
        durationSeconds: 10,
      });

      // Advance time by 10 seconds
      jest.advanceTimersByTime(10000);

      // Verify auto stop after timeout
      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledWith(
        'agrimotion/device/pumps/cmd',
        'D1_PUPUK_OFF',
      );
      
      // Timer should be removed from map
      const active = service.getActiveActuations();
      expect(active).toHaveLength(0);
    });

    it('should overwrite existing timer if same key is started again', () => {
      const dto = {
        demplotIndex: 1, // D2
        type: ActuationType.AIR,
        durationSeconds: 30,
      };

      service.startActuation(dto);
      
      // Call again before timer expires
      const result2 = service.startActuation(dto);

      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledTimes(2);
      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledWith(
        'agrimotion/device/pumps/cmd',
        'D2_AIR_ON',
      );
      
      const active = service.getActiveActuations();
      expect(active).toHaveLength(1); // Still only 1 active item
      expect(active[0].durationSeconds).toBe(30);
    });
  });

  describe('stopActuation', () => {
    it('should stop specific pump if dto is provided', () => {
      // Start D3 PESTI
      service.startActuation({
        demplotIndex: 2,
        type: ActuationType.PESTI,
        durationSeconds: 60,
      });

      // Verify started
      let active = service.getActiveActuations();
      expect(active).toHaveLength(1);

      // Stop D3 PESTI manually
      const stopResult = service.stopActuation({
        demplotIndex: 2,
        type: ActuationType.PESTI,
      });

      expect(stopResult).toEqual({
        stopped: ['D3_PESTI'],
        commandPublished: 'D3_PESTI_OFF',
      });

      // Verify MQTT publish OFF
      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledWith(
        'agrimotion/device/pumps/cmd',
        'D3_PESTI_OFF',
      );

      // Verify memory map is cleared
      active = service.getActiveActuations();
      expect(active).toHaveLength(0);
    });

    it('should emergency stop ALL pumps if empty dto is provided', () => {
      // Start D1 AIR and D2 PUPUK
      service.startActuation({ demplotIndex: 0, type: ActuationType.AIR, durationSeconds: 60 });
      service.startActuation({ demplotIndex: 1, type: ActuationType.PUPUK, durationSeconds: 60 });

      expect(service.getActiveActuations()).toHaveLength(2);

      // Emergency stop all
      const stopResult = service.stopActuation({});

      expect(stopResult.stopped.sort()).toEqual(['D1_AIR', 'D2_PUPUK'].sort());
      expect(stopResult.commandPublished).toBe('ALL_OFF');

      expect(mqttConnectionMock.publishCommand).toHaveBeenCalledWith(
        'agrimotion/device/pumps/cmd',
        'ALL_OFF',
      );

      expect(service.getActiveActuations()).toHaveLength(0);
    });
  });

  describe('getActiveActuations', () => {
    it('should return remaining seconds correctly', () => {
      const dto = {
        demplotIndex: 0,
        type: ActuationType.AIR,
        durationSeconds: 100,
      };

      service.startActuation(dto);

      // Advance 40 seconds
      jest.advanceTimersByTime(40000);

      const active = service.getActiveActuations();
      expect(active).toHaveLength(1);
      
      // Out of 100 seconds, 40 have passed, so 60 should remain
      expect(active[0].remainingSeconds).toBeCloseTo(60, -1); // Allow slight ms variation due to Date.now in test
    });
  });
});
