import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { CommissionsService } from './commissions.service.js';
import { CommissionsController } from './commissions.controller.js';

@Module({
  imports: [PrismaModule, IngestionModule],
  providers: [CommissionsService],
  controllers: [CommissionsController],
})
export class CommissionsModule {}
