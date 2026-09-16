import { CropCycle } from '@prisma/client';

export interface CropCycleWithAnalytics extends CropCycle {
  hst: number;
  phase: string;
  phaseDescription?: string;
  progressPercentage?: number;
  daysToHarvest?: number;
  durationDays?: number;
}
