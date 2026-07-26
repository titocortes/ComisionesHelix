import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { BeneficiariesService } from './beneficiaries.service.js';

@Injectable()
export class BeneficiariesCron {
  private readonly logger = new Logger(BeneficiariesCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
  ) {}

  @Cron('0 5 * * *', { timeZone: 'America/New_York' })
  async syncDeactivations(): Promise<void> {
    const cronLog = await this.prisma.cronExecutionLog.create({
      data: {
        cronType: 'beneficiary_sync',
        startedAt: new Date(),
        status: 'running',
        attemptNumber: 1,
      },
    });

    try {
      const deactivated = await this.beneficiaries.syncDeactivations();

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'success', recordsProcessed: deactivated },
      });

      this.logger.log(`Beneficiary sync completed. Deactivated: ${deactivated}`);
    } catch (err) {
      const errorMessage = (err as Error).message;

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'failed', errorMessage },
      });

      this.logger.error(`Beneficiary sync failed: ${errorMessage}`);
    }
  }
}
