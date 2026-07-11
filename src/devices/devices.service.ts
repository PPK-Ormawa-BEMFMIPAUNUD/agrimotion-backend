import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import type { Device } from '@prisma/client';

export interface DeviceStatusItem {
  id: string;
  deviceCode: string;
  espSerial: string;
  farmName: string;
  status: string;
  lastSeen: Date | null;
  battery: number | null;
  signal: number | null;
}

export interface DeviceStatusResponse {
  summary: {
    total: number;
    online: number;
    offline: number;
  };
  devices: DeviceStatusItem[];
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
      include: { farm: true, sensors: true },
    });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        farm: true,
        sensors: true,
        telemetry: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
    });
    if (!device)
      throw new NotFoundException(`Device with ID "${id}" not found`);
    return device;
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    return this.prisma.device.create({
      data: dto,
      include: { farm: true },
    });
  }

  async getDeviceStatus(): Promise<DeviceStatusResponse> {
    const devices = await this.prisma.device.findMany({
      include: { farm: true },
      orderBy: { updatedAt: 'desc' },
    });

    const statusItems: DeviceStatusItem[] = devices.map((d) => ({
      id: d.id,
      deviceCode: d.deviceCode,
      espSerial: d.espSerial,
      farmName: d.farm.name,
      status: d.status,
      lastSeen: d.lastOnline,
      battery: d.battery,
      signal: d.signal,
    }));

    const online = devices.filter((d) => d.status === 'ONLINE').length;
    const offline = devices.filter((d) => d.status !== 'ONLINE').length;

    return {
      summary: {
        total: devices.length,
        online,
        offline,
      },
      devices: statusItems,
    };
  }
}
