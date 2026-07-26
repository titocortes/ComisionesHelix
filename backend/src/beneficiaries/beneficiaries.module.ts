import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HelixModule } from '../helix/helix.module.js';
import { QboModule } from '../qbo/qbo.module.js';
import { BeneficiariesService } from './beneficiaries.service.js';
import { BeneficiariesController } from './beneficiaries.controller.js';
import { BeneficiariesCron } from './beneficiaries.cron.js';

@Module({
  imports: [PrismaModule, HelixModule, QboModule],
  providers: [BeneficiariesService, BeneficiariesCron],
  controllers: [BeneficiariesController],
})
export class BeneficiariesModule {}
