import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HelixApiService } from './helix-api.service.js';
import { HelixController } from './helix.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [HelixController],
  providers: [HelixApiService],
  exports: [HelixApiService],
})
export class HelixModule {}
