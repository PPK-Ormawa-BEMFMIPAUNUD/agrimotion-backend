import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EwsService } from './ews.service.js';
import { EwsController } from './ews.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [EwsService],
  controllers: [EwsController],
  exports: [EwsService],
})
export class EwsModule {}
