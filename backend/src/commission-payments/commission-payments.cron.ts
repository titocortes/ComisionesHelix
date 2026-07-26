import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommissionPaymentsService } from './commission-payments.service.js';

@Injectable()
export class CommissionPaymentsCron {
  private readonly logger = new Logger(CommissionPaymentsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionPayments: CommissionPaymentsService,
  ) {}

  // Runs at 9:00 AM on the 20th of every month (Eastern)
  @Cron('0 9 20 * *', { timeZone: 'America/New_York' })
  async runMonthlyPaymentBatch(): Promise<void> {
    const cronLog = await this.prisma.cronExecutionLog.create({
      data: {
        cronType: 'commission_payment',
        startedAt: new Date(),
        status: 'running',
        attemptNumber: 1,
      },
    });

    try {
      const result = await this.commissionPayments.runPaymentBatch();

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: {
          finishedAt: new Date(),
          status: 'success',
          recordsProcessed: result.records,
        },
      });

      this.logger.log(
        `Payment batch cron completed. Batch: ${result.batchId}, Beneficiaries: ${result.groups}, Records: ${result.records}`,
      );
    } catch (err) {
      const errorMessage = (err as Error).message;

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'failed', errorMessage },
      });

      this.logger.error(`Payment batch cron failed: ${errorMessage}`);
    }
  }
}
