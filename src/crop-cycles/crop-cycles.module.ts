import { Module } from '@nestjs/common';
import { CropCyclesService } from './crop-cycles.service.js';
import { CropCyclesController } from './crop-cycles.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CropCyclesController],
  providers: [CropCyclesService],
  exports: [CropCyclesService],
})
export class CropCyclesModule {}
