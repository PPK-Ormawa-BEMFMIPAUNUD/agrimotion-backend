import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StartCropCycleDto } from './dto/start-crop-cycle.dto.js';
import { HarvestCropCycleDto } from './dto/harvest-crop-cycle.dto.js';
import { CropCycleWithAnalytics } from './crop-cycle.types.js';
import { CropCycle } from '@prisma/client';

@Injectable()
export class CropCyclesService {
  private readonly logger = new Logger(CropCyclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to normalize a date to midnight in WITA (UTC+8) timezone.
   * This ensures HST (Hari Setelah Tanam) increments exactly at 00:00 WITA.
   */
  private getWitaDateOnly(date: Date): Date {
    const witaTime = new Date(date.getTime() + 8 * 3600 * 1000);
    return new Date(Date.UTC(witaTime.getUTCFullYear(), witaTime.getUTCMonth(), witaTime.getUTCDate()));
  }

  private calculateHst(plantingDate: Date): number {
    const plantingWita = this.getWitaDateOnly(plantingDate);
    const nowWita = this.getWitaDateOnly(new Date());
    const msPerDay = 24 * 3600 * 1000;
    return Math.max(0, Math.floor((nowWita.getTime() - plantingWita.getTime()) / msPerDay));
  }

  private enrichCropCycle(cycle: CropCycle): CropCycleWithAnalytics {
    const hst = this.calculateHst(cycle.plantingDate);
    let phase = 'Masa Tanam';
    let phaseDescription = '';
    
    // Determine phase based on demplot (0: Pacah, 1: Sawi, 2: Cabai)
    if (cycle.demplotId === 0) { // Bunga Pacah
      if (hst <= 14) {
        phase = 'Vegetatif Awal';
        phaseDescription = 'Persemaian & Aklimatisasi';
      } else if (hst <= 35) {
        phase = 'Vegetatif Lanjut';
        phaseDescription = 'Pertumbuhan Batang & Daun';
      } else if (hst <= 55) {
        phase = 'Generatif / Pembungaan';
        phaseDescription = 'Kuncup & Mekar';
      } else {
        phase = 'Masa Panen';
        phaseDescription = 'Pemetikan Bunga Berkala';
      }
    } else if (cycle.demplotId === 1) { // Sawi
      if (hst <= 10) {
        phase = 'Vegetatif Awal';
        phaseDescription = 'Adaptasi Bibit';
      } else if (hst <= 25) {
        phase = 'Vegetatif Aktif';
        phaseDescription = 'Pembentukan Daun Cepat';
      } else if (hst <= 35) {
        phase = 'Siap Panen';
        phaseDescription = 'Pemanenan';
      } else {
        phase = 'Pasca Panen';
        phaseDescription = 'Lewat Masa Panen Optimal';
      }
    } else if (cycle.demplotId === 2) { // Cabai
      if (hst <= 20) {
        phase = 'Vegetatif Awal';
        phaseDescription = 'Pertumbuhan Akar & Tunas';
      } else if (hst <= 50) {
        phase = 'Vegetatif Lanjut';
        phaseDescription = 'Percabangan & Ranting';
      } else if (hst <= 80) {
        phase = 'Generatif';
        phaseDescription = 'Berbunga & Pembentukan Buah';
      } else {
        phase = 'Masa Panen';
        phaseDescription = 'Pemetikan Buah Cabai';
      }
    }

    let progressPercentage = 0;
    let daysToHarvest: number | undefined = undefined;

    if (cycle.targetHarvestDate) {
      const targetWita = this.getWitaDateOnly(cycle.targetHarvestDate);
      const plantingWita = this.getWitaDateOnly(cycle.plantingDate);
      const totalDays = Math.max(1, Math.floor((targetWita.getTime() - plantingWita.getTime()) / (24 * 3600 * 1000)));
      progressPercentage = Math.min(100, Math.max(0, Math.round((hst / totalDays) * 100)));
      
      const nowWita = this.getWitaDateOnly(new Date());
      daysToHarvest = Math.max(0, Math.floor((targetWita.getTime() - nowWita.getTime()) / (24 * 3600 * 1000)));
    }

    return {
      ...cycle,
      hst,
      phase,
      phaseDescription,
      progressPercentage,
      daysToHarvest,
    };
  }

  async getActiveCycle(demplotId: number): Promise<CropCycleWithAnalytics | null> {
    const activeCycle = await this.prisma.cropCycle.findFirst({
      where: {
        demplotId,
        status: 'ACTIVE',
      },
      orderBy: {
        plantingDate: 'desc',
      },
    });

    if (!activeCycle) {
      return null;
    }

    return this.enrichCropCycle(activeCycle);
  }

  async startCycle(dto: StartCropCycleDto): Promise<CropCycleWithAnalytics> {
    const existingActive = await this.prisma.cropCycle.findFirst({
      where: {
        demplotId: dto.demplotId,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      throw new BadRequestException('Demplot ini sudah memiliki siklus tanam yang sedang aktif. Selesaikan/panen siklus saat ini terlebih dahulu.');
    }

    const newCycle = await this.prisma.cropCycle.create({
      data: {
        demplotId: dto.demplotId,
        commodityName: dto.commodityName,
        plantingDate: new Date(dto.plantingDate),
        targetHarvestDate: dto.targetHarvestDate ? new Date(dto.targetHarvestDate) : null,
        notes: dto.notes,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Memulai siklus tanam baru untuk demplot ${dto.demplotId} (${dto.commodityName})`);
    return this.enrichCropCycle(newCycle);
  }

  async harvestCycle(id: string, dto: HarvestCropCycleDto): Promise<CropCycleWithAnalytics> {
    const cycle = await this.prisma.cropCycle.findUnique({ where: { id } });
    if (!cycle) {
      throw new NotFoundException('Siklus tanam tidak ditemukan.');
    }
    if (cycle.status === 'COMPLETED') {
      throw new BadRequestException('Siklus tanam ini sudah berstatus selesai/dipanen.');
    }

    const harvestDate = dto.harvestDate ? new Date(dto.harvestDate) : new Date();
    
    // Append or replace notes
    let updatedNotes = cycle.notes || '';
    if (dto.notes) {
      updatedNotes = updatedNotes ? `${updatedNotes}\n\n[Evaluasi Panen]: ${dto.notes}` : `[Evaluasi Panen]: ${dto.notes}`;
    }

    const updatedCycle = await this.prisma.cropCycle.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        harvestDate,
        yieldKg: dto.yieldKg,
        notes: updatedNotes,
      },
    });

    this.logger.log(`Menyelesaikan panen untuk siklus ${id} (Demplot ${updatedCycle.demplotId})`);
    return this.enrichCropCycle(updatedCycle);
  }

  async getHistory(demplotId: number): Promise<CropCycleWithAnalytics[]> {
    const cycles = await this.prisma.cropCycle.findMany({
      where: {
        demplotId,
        status: 'COMPLETED',
      },
      orderBy: {
        harvestDate: 'desc',
      },
    });

    return cycles.map(cycle => {
      // Calculate duration of the completed cycle
      const startWita = this.getWitaDateOnly(cycle.plantingDate);
      const endWita = this.getWitaDateOnly(cycle.harvestDate!);
      const durationDays = Math.max(1, Math.floor((endWita.getTime() - startWita.getTime()) / (24 * 3600 * 1000)));

      return {
        ...cycle,
        hst: durationDays,
        durationDays,
        phase: 'Pasca Panen',
      };
    });
  }
}
