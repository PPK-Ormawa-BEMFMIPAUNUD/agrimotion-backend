import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto.js';

@Injectable()
export class MqttHandlerService {
  private readonly logger = new Logger(MqttHandlerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleTelemetry(message: Buffer): Promise<void> {
    let raw: Record<string, unknown>;

    // 1. Parse JSON
    try {
      raw = JSON.parse(message.toString()) as Record<string, unknown>;
    } catch {
      this.logger.warn('Invalid Payload: message is not valid JSON');
      return;
    }

    // 2. Validate with DTO
    const dto = plainToInstance(TelemetryPayloadDto, raw);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const details = errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('; ');
      this.logger.warn(`Invalid Payload: ${details}`);
      return;
    }

    // 3. Find device
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ deviceCode: dto.deviceId }, { espSerial: dto.deviceId }],
      },
    });

    if (!device) {
      this.logger.warn(`Unknown Device: ${dto.deviceId}`);
      return;
    }

    // 4. Save telemetry + update device status in a transaction
    try {
      await this.prisma.$transaction([
        this.prisma.telemetry.create({
          data: {
            deviceId: device.id,
            temperature: dto.temperature,
            humidity: dto.humidity,
            soilMoisture: dto.soilMoisture,
            ph: dto.ph,
            nitrogen: dto.nitrogen,
            phosphorus: dto.phosphorus,
            potassium: dto.potassium,
            lux: dto.lux,
          },
        }),
        this.prisma.device.update({
          where: { id: device.id },
          data: {
            lastOnline: new Date(),
            status: 'ONLINE',
            battery: dto.battery ?? device.battery,
            signal: dto.signal ?? device.signal,
          },
        }),
      ]);

      this.logger.log(
        `Telemetry Saved: ${device.deviceCode} | T:${dto.temperature ?? '-'}°C H:${dto.humidity ?? '-'}% SM:${dto.soilMoisture ?? '-'}%`,
      );
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `MQTT Error: failed to save telemetry — ${error.message}`,
      );
    }
  }

  async handleStatus(deviceIdentifier: string, message: Buffer): Promise<void> {
    const statusText = message.toString().trim().toUpperCase();

    if (statusText !== 'ONLINE' && statusText !== 'OFFLINE') {
      this.logger.warn(
        `Invalid Payload: unknown status "${statusText}" from ${deviceIdentifier}`,
      );
      return;
    }

    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ deviceCode: deviceIdentifier }, { espSerial: deviceIdentifier }],
      },
    });

    if (!device) {
      this.logger.warn(`Unknown Device: ${deviceIdentifier}`);
      return;
    }

    const updateData: { status: string; lastOnline?: Date } = {
      status: statusText,
    };

    if (statusText === 'ONLINE') {
      updateData.lastOnline = new Date();
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: updateData,
    });

    if (statusText === 'ONLINE') {
      this.logger.log(`Device Connected: ${device.deviceCode}`);
    } else {
      this.logger.warn(`Device Offline: ${device.deviceCode}`);
    }
  }
}
