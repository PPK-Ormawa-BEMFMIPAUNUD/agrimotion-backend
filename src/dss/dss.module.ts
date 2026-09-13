import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DssService } from './dss.service.js';
import { DssController } from './dss.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [DssService],
  controllers: [DssController],
  exports: [DssService],
})
export class DssModule {}
