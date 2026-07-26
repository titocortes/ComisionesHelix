import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthorizationCron {
  private readonly logger = new Logger(AuthorizationCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('* * * * *', { timeZone: 'America/New_York' }) // TEMP: cada minuto para pruebas locales — revertir a '0 1 * * *'
  async authorizeEligibleCommissions(): Promise<void> {
    const cronLog = await this.prisma.cronExecutionLog.create({
      data: {
        cronType: 'authorization',
        startedAt: new Date(),
        status: 'running',
        attemptNumber: 1,
      },
    });

    try {
      const count = await this.runAuthorization();

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'success', recordsProcessed: count },
      });

      this.logger.log(`Authorization cron completed. Authorized: ${count} records`);
    } catch (err) {
      const errorMessage = (err as Error).message;

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'failed', errorMessage },
      });

      this.logger.error(`Authorization cron failed: ${errorMessage}`);
    }
  }

  private async runAuthorization(): Promise<number> {
    const now = new Date();

    const eligible = await this.prisma.commissionRecord.findMany({
      where: {
        status: 'ingested',
        authorizationDate: { lte: now },
        affiliateAmount: { not: null },
        agencyAmount: { not: null },
      },
      select: { idCommissionRecord: true, authorizationDate: true },
    });

    const heldBack = await this.prisma.commissionRecord.count({
      where: {
        status: 'ingested',
        authorizationDate: { lte: now },
        OR: [{ affiliateAmount: null }, { agencyAmount: null }],
      },
    });

    if (heldBack > 0) {
      this.logger.warn(
        `${heldBack} commission record(s) past authorization date are held in 'ingested' pending a Helix product commission rate.`,
      );
    }

    if (eligible.length === 0) return 0;

    this.logger.log(`Authorizing ${eligible.length} commission records`);

    for (const record of eligible) {
      await this.prisma.commissionRecord.update({
        where: { idCommissionRecord: record.idCommissionRecord },
        data: { status: 'authorized' },
      });

      await this.prisma.commissionStateHistory.create({
        data: {
          idCommissionRecord: record.idCommissionRecord,
          fromStatus: 'ingested',
          toStatus: 'authorized',
          notes: `Auto-authorized. Authorization date: ${record.authorizationDate.toISOString().split('T')[0]}`,
        },
      });
    }

    return eligible.length;
  }
}
