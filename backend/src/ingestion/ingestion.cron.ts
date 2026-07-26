import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixApiService } from '../helix/helix-api.service.js';
import { IngestionService } from './ingestion.service.js';

const RETRY_DELAYS_MS = [20 * 60 * 1000, 30 * 60 * 1000]; // 20 min → 3:20 AM, 30 min → 3:50 AM
const MAX_ATTEMPTS = 3;

@Injectable()
export class IngestionCron {
  private readonly logger = new Logger(IngestionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helixApi: HelixApiService,
    private readonly ingestion: IngestionService,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'America/New_York' })
  async scheduledIngest(): Promise<void> {
    await this.runWithRetry(1);
  }

  private async runWithRetry(attempt: number): Promise<void> {
    const cronLog = await this.prisma.cronExecutionLog.create({
      data: {
        cronType: 'ingestion',
        startedAt: new Date(),
        status: 'running',
        attemptNumber: attempt,
      },
    });

    try {
      this.logger.log(`Ingestion cron attempt ${attempt} started`);
      const invoices = await this.helixApi.getPendingInvoices();
      const result = await this.ingestion.processInvoices(invoices, cronLog.idCronLog);

      const reversals = await this.helixApi.getReversedPayments();
      const reversalResult = await this.ingestion.processReversedPayments(reversals);

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'success', recordsProcessed: result.processed },
      });

      this.logger.log(
        `Ingestion cron attempt ${attempt} completed. Processed: ${result.processed}, Failed: ${result.failed}. ` +
          `Reversals tracked: ${reversalResult.tracked}, already tracked: ${reversalResult.alreadyTracked}, unmatched: ${reversalResult.unmatched}`,
      );
    } catch (err) {
      const errorMessage = (err as Error).message;

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'failed', errorMessage },
      });

      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        this.logger.warn(`Ingestion cron attempt ${attempt} failed. Retrying in ${delay / 60000} min`);
        setTimeout(() => void this.runWithRetry(attempt + 1), delay);
      } else {
        this.logger.error(
          `Ingestion cron failed after ${MAX_ATTEMPTS} attempts. Manual intervention required. Last error: ${errorMessage}`,
        );
      }
    }
  }
}
