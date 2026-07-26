import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  BadGatewayException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixApiService, HelixInvoice } from '../helix/helix-api.service.js';
import { IngestionService } from './ingestion.service.js';

@Controller('ingestion')
@UseGuards(JwtAuthGuard, AdminGuard)
export class IngestionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helixApi: HelixApiService,
    private readonly ingestion: IngestionService,
  ) {}

  @Post('trigger')
  async triggerIngestion() {
    const cronLog = await this.prisma.cronExecutionLog.create({
      data: { cronType: 'ingestion', startedAt: new Date(), status: 'running', attemptNumber: 1 },
    });

    let invoices: HelixInvoice[];

    try {
      invoices = await this.helixApi.getPendingInvoices();
    } catch (err: any) {
      const helixMessage: string =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        'Error al conectar con el API de Helix';

      await this.prisma.cronExecutionLog.update({
        where: { idCronLog: cronLog.idCronLog },
        data: { finishedAt: new Date(), status: 'failed', errorMessage: helixMessage },
      });

      throw new BadGatewayException(helixMessage);
    }

    const { processed, failed } = await this.ingestion.processInvoices(invoices, cronLog.idCronLog);

    const reversals = await this.helixApi.getReversedPayments();
    const reversalResult = await this.ingestion.processReversedPayments(reversals);

    await this.prisma.cronExecutionLog.update({
      where: { idCronLog: cronLog.idCronLog },
      data: { finishedAt: new Date(), status: 'success', recordsProcessed: processed },
    });

    return {
      success: true,
      idCronLog: cronLog.idCronLog,
      invoicesReceived: invoices.length,
      processed,
      failed,
      reversals: reversalResult,
      executedAt: cronLog.startedAt.toISOString(),
    };
  }

  @Get('batches')
  listBatches() {
    return this.ingestion.listBatches();
  }

  @Delete('batches/last')
  deleteLastBatch() {
    return this.ingestion.deleteLastBatch();
  }

  @Delete('batches/:idCronLog')
  deleteBatch(@Param('idCronLog', ParseIntPipe) idCronLog: number) {
    return this.ingestion.deleteBatch(idCronLog);
  }
}
