import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HelixModule } from '../helix/helix.module.js';
import { CommissionCalculatorService } from './commission-calculator.service.js';
import { IngestionService } from './ingestion.service.js';
import { IngestionCron } from './ingestion.cron.js';
import { IngestionController } from './ingestion.controller.js';

@Module({
  imports: [PrismaModule, HelixModule],
  controllers: [IngestionController],
  providers: [CommissionCalculatorService, IngestionService, IngestionCron],
  exports: [IngestionService, CommissionCalculatorService],
})
export class IngestionModule {}
