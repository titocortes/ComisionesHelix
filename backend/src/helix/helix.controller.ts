import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixApiKeyGuard } from './guards/helix-api-key.guard.js';

@Controller('helix')
export class HelixController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('confirmed-payments')
  @UseGuards(HelixApiKeyGuard)
  async getConfirmedPayments() {
    const [ingested, cancelled] = await Promise.all([
      this.prisma.payment.findMany({
        where: { paymentStatus: { not: -1 } },
        select: { helixPaymentId: true },
      }),
      this.prisma.payment.findMany({
        where: { paymentStatus: -1 },
        select: { helixPaymentId: true },
      }),
    ]);

    return {
      success: true,
      ingested: ingested.map((p) => p.helixPaymentId),
      cancelled: cancelled.map((p) => p.helixPaymentId),
    };
  }

  @Get('confirmed-commission-rates')
  @UseGuards(HelixApiKeyGuard)
  async getConfirmedCommissionRates() {
    // "Finalized" = past the cancellable review window (Module 3): authorized, sent
    // for payment, or paid. Reporting an id here freezes that rate row in Helix, so
    // only rates actually used by a finalized calculation may be included.
    const records = await this.prisma.commissionRecord.findMany({
      where: {
        status: { in: ['authorized', 'payment_sent', 'paid'] },
        OR: [
          { idAgencyProductCommissionRate: { not: null } },
          { idAffiliateProductCommissionRate: { not: null } },
        ],
      },
      select: { idAgencyProductCommissionRate: true, idAffiliateProductCommissionRate: true },
    });

    const confirmed = new Set<number>();
    for (const r of records) {
      if (r.idAgencyProductCommissionRate != null) confirmed.add(r.idAgencyProductCommissionRate);
      if (r.idAffiliateProductCommissionRate != null) confirmed.add(r.idAffiliateProductCommissionRate);
    }

    return { success: true, confirmed: [...confirmed] };
  }

  @Get('confirmed-reversals')
  @UseGuards(HelixApiKeyGuard)
  async getConfirmedReversals() {
    // "Confirmed" here only means "we're tracking this reversal in PaymentReversal" —
    // not that the money side is fully resolved. payment_sent/paid cases needing a
    // CommissionAdjustment or manual review keep going through their own flow inside
    // Commissions; Helix doesn't need to know more once it stops seeing the idPayment
    // in reversed-payments.
    const reversals = await this.prisma.paymentReversal.findMany({
      select: { payment: { select: { helixPaymentId: true } } },
    });

    return { success: true, confirmed: reversals.map((r) => r.payment.helixPaymentId) };
  }
}
