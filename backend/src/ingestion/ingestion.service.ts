import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixInvoice, HelixReversedPayment } from '../helix/helix-api.service.js';
import { CommissionCalculatorService } from './commission-calculator.service.js';

const PRE_PAYMENT_STATUSES = ['ingested', 'authorized'];

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: CommissionCalculatorService,
  ) {}

  async processInvoices(
    invoices: HelixInvoice[],
    idCronLog?: number,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const invoice of invoices) {
      try {
        await this.processInvoice(invoice, idCronLog);
        processed++;
      } catch (err) {
        failed++;
        this.logger.error(
          `Failed to process invoice helixPaymentId=${invoice.idPayment}: ${(err as Error).message}`,
        );
      }
    }

    return { processed, failed };
  }

  private async processInvoice(invoice: HelixInvoice, idCronLog?: number): Promise<void> {
    // helixPaymentId is no longer unique: a refunded payment can be re-paid later
    // under the same Helix id, which Helix reports as a brand new pending invoice
    // once we confirm the reversal. Only the *active* (not-yet-reversed) episode
    // counts as "existing" here — a fully reversed episode must fall through and
    // create a new Payment + CommissionRecord set for the new financial event.
    const existing = await this.prisma.payment.findFirst({
      where: { helixPaymentId: invoice.idPayment, reversal: null },
    });

    if (existing) {
      if (existing.paymentStatus === invoice.paymentStatus) return;

      await this.prisma.payment.update({
        where: { idPayment: existing.idPayment },
        data: { paymentStatus: invoice.paymentStatus },
      });

      if (invoice.paymentStatus === -1) {
        await this.cancelCommissionRecords(existing.idPayment);
      }

      return;
    }

    const payment = await this.prisma.payment.create({
      data: {
        helixPaymentId: invoice.idPayment,
        idCronLog: idCronLog ?? null,
        helixProductTransactionId: invoice.productTransaction.idProductTransaction,
        helixTransactionId: invoice.transaction.idTransaction,
        helixClientId: invoice.client.idClient,
        helixSellerId: invoice.user?.idUser ?? null,
        helixProductId: invoice.productTransaction.productId,
        paymentOrder: invoice.paymentOrder,
        idTraceAR: invoice.idTraceAR,
        reference: invoice.reference,
        invoiceLink: invoice.invoiceLink,
        paymentDate: new Date(invoice.paymentDate),
        paymentFrequency: invoice.paymentFrequency,
        amount: parseFloat(invoice.amount),
        paymentStatus: invoice.paymentStatus,
        numDependents: invoice.transaction.numDependents,
        paidAmount: invoice.paidAmount != null ? parseFloat(invoice.paidAmount) : null,
        payoutDate: invoice.payoutDate ? new Date(invoice.payoutDate) : null,
        paymentInstrument: invoice.paymentInstrument,
        finalFolioPaymentInstrument: invoice.finalFolioPaymentInstrument,
        coverageStartDate: invoice.coverageStartDate ? new Date(invoice.coverageStartDate) : null,
        coverageEndDate: invoice.coverageEndDate ? new Date(invoice.coverageEndDate) : null,
      },
    });

    // No user assigned to client → no commission
    if (!invoice.user) {
      this.logger.warn(
        `Invoice helixPaymentId=${invoice.idPayment} has no assigned user. Payment saved, no commission created.`,
      );
      return;
    }

    await this.createCommissionRecords(payment.idPayment, invoice);
  }

  private async createCommissionRecords(idPayment: number, invoice: HelixInvoice): Promise<void> {
    const { user, productTransaction, transaction, coverageStartDate, coverageEndDate } = invoice;
    if (!user || !coverageStartDate || !coverageEndDate) return;

    const isFullPayment = invoice.paymentFrequency === 'full';
    const start = new Date(coverageStartDate);
    const end = new Date(coverageEndDate);

    const periods = isFullPayment
      ? this.calculator.splitIntoCoveragePeriods(start, end)
      : [
          {
            start,
            end,
            authorizationDate: (() => {
              const d = new Date(start);
              d.setDate(d.getDate() + 45);
              return d;
            })(),
          },
        ];

    const [sellerBeneficiary, affiliateBeneficiary, agencyBeneficiary] = await Promise.all([
      this.findBeneficiary('seller', user.idUser),
      this.findBeneficiary('affiliate', user.affiliate.idAffiliate),
      this.findBeneficiary('agency', user.affiliate.agency.idAgency),
    ]);

    for (const period of periods) {
      const rate = await this.calculator.resolveRate(productTransaction.productId, period.start);

      const [affiliateResult, agencyResult] = await Promise.all([
        this.calculator.computeFlatAmount(
          rate,
          'affiliate',
          productTransaction.productId,
          period.start,
          period.end,
          transaction.numDependents,
        ),
        this.calculator.computeFlatAmount(
          rate,
          'agency',
          productTransaction.productId,
          period.start,
          period.end,
          transaction.numDependents,
        ),
      ]);

      const record = await this.prisma.commissionRecord.create({
        data: {
          idPayment,
          coverageStartDate: period.start,
          coverageEndDate: period.end,
          authorizationDate: period.authorizationDate,
          status: 'ingested',
          sellerAmount: 0,
          affiliateAmount: affiliateResult.amount,
          agencyAmount: agencyResult.amount,
          idAffiliateProductCommissionRate: affiliateResult.idProductCommissionRate,
          idAgencyProductCommissionRate: agencyResult.idProductCommissionRate,
          idSellerBeneficiary: sellerBeneficiary?.idBeneficiary ?? null,
          idAffiliateBeneficiary: affiliateBeneficiary?.idBeneficiary ?? null,
          idAgencyBeneficiary: agencyBeneficiary?.idBeneficiary ?? null,
          helixClientId: invoice.client.idClient,
          clientName: `${invoice.client.firstName} ${invoice.client.lastName}`,
          productName: productTransaction.productName,
          sellerName: `${user.firstName} ${user.lastName}`,
          affiliateName: user.affiliate.affiliateName,
          agencyName: user.affiliate.agency.agencyName,
        },
      });

      await this.prisma.commissionStateHistory.create({
        data: {
          idCommissionRecord: record.idCommissionRecord,
          fromStatus: 'new',
          toStatus: 'ingested',
          notes: `Ingested from Helix invoice ${invoice.idPayment}`,
        },
      });
    }
  }

  private async cancelCommissionRecords(idPayment: number): Promise<void> {
    const records = await this.prisma.commissionRecord.findMany({
      where: { idPayment, status: 'ingested' },
    });

    for (const record of records) {
      await this.prisma.commissionRecord.update({
        where: { idCommissionRecord: record.idCommissionRecord },
        data: { status: 'cancelled_in_helix' },
      });

      await this.prisma.commissionStateHistory.create({
        data: {
          idCommissionRecord: record.idCommissionRecord,
          fromStatus: 'ingested',
          toStatus: 'cancelled_in_helix',
          notes: 'Payment cancelled in Helix (paymentStatus = -1)',
        },
      });
    }
  }

  // ─── Reversed payments (Helix refunds) ─────────────────────────────────────

  async processReversedPayments(
    reversals: HelixReversedPayment[],
  ): Promise<{ tracked: number; alreadyTracked: number; unmatched: number }> {
    let tracked = 0;
    let alreadyTracked = 0;
    let unmatched = 0;

    for (const reversal of reversals) {
      try {
        const outcome = await this.processReversedPayment(reversal);
        if (outcome === 'tracked') tracked++;
        else if (outcome === 'already_tracked') alreadyTracked++;
        else unmatched++;
      } catch (err) {
        unmatched++;
        this.logger.error(
          `Failed to process reversed payment helixPaymentId=${reversal.idPayment}: ${(err as Error).message}`,
        );
      }
    }

    return { tracked, alreadyTracked, unmatched };
  }

  private async processReversedPayment(
    reversal: HelixReversedPayment,
  ): Promise<'tracked' | 'already_tracked' | 'unmatched'> {
    // The most recent Payment row for a given helixPaymentId is always the episode
    // Helix is referring to: an already-confirmed (reversed) episode can't reappear
    // here, because Helix only stops reporting a reversal once we confirm it via
    // confirmed-reversals — and a fresh re-payment after that always starts a new
    // Payment row (see the `reversal: null` lookup in processInvoice above).
    const payment = await this.prisma.payment.findFirst({
      where: { helixPaymentId: reversal.idPayment },
      orderBy: { createdAt: 'desc' },
      include: { reversal: true, commissionRecords: true },
    });

    if (!payment) {
      // Helix's filter (commissionsIngested = true) means it believes we ingested
      // this payment at some point — not finding it locally is a data integrity
      // issue (e.g. restored from an old backup), not a normal flow. Skip without
      // confirming so it keeps surfacing until investigated.
      this.logger.error(
        `Reversed payment helixPaymentId=${reversal.idPayment} has no matching local Payment record. Skipping.`,
      );
      return 'unmatched';
    }

    if (payment.reversal) return 'already_tracked'; // already processed in a prior run

    await this.prisma.payment.update({
      where: { idPayment: payment.idPayment },
      data: { paymentStatus: reversal.currentPaymentStatus },
    });

    const paymentReversal = await this.prisma.paymentReversal.create({
      data: {
        idPayment: payment.idPayment,
        previousPaymentStatus: reversal.previousPaymentStatus,
        currentPaymentStatus: reversal.currentPaymentStatus,
        reason: reversal.reason,
        helixReversedAt: new Date(reversal.reversedAt),
      },
    });

    for (const record of payment.commissionRecords) {
      if (PRE_PAYMENT_STATUSES.includes(record.status)) {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: { status: 'reversed_in_helix' },
        });
        await this.prisma.commissionStateHistory.create({
          data: {
            idCommissionRecord: record.idCommissionRecord,
            fromStatus: record.status,
            toStatus: 'reversed_in_helix',
            notes: `Payment refunded in Helix (${reversal.reason}) before commission was paid — no cash movement, auto-cancelled.`,
          },
        });
      } else if (record.status === 'payment_sent') {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: {
            flaggedForReview: true,
            reviewNotes:
              'Payment refunded in Helix while a BillPayment was already in flight (payment_sent). ' +
              'Verify QBO BillPayment status before deciding whether to void it or treat as paid.',
          },
        });
        await this.prisma.commissionStateHistory.create({
          data: {
            idCommissionRecord: record.idCommissionRecord,
            fromStatus: record.status,
            toStatus: record.status,
            notes: `Payment refunded in Helix (${reversal.reason}). Flagged for manual review — BillPayment may already be in flight.`,
          },
        });
      } else if (record.status === 'paid') {
        await this.createReversalAdjustments(record, paymentReversal.idPaymentReversal);
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: {
            status: 'reversed_after_payment',
            flaggedForReview: true,
            reviewNotes:
              'Payment refunded in Helix after commission was already paid. A CommissionAdjustment was ' +
              "created per beneficiary, pending netting against next month's payment batch.",
          },
        });
        await this.prisma.commissionStateHistory.create({
          data: {
            idCommissionRecord: record.idCommissionRecord,
            fromStatus: 'paid',
            toStatus: 'reversed_after_payment',
            notes: `Payment refunded in Helix (${reversal.reason}) after commission was paid. CommissionAdjustment created.`,
          },
        });
      }
      // Already terminal (cancelled_by_admin, cancelled_in_helix, reversed_*) — nothing to do.
    }

    return 'tracked';
  }

  private async createReversalAdjustments(
    record: {
      idCommissionRecord: number;
      sellerAmount: { toNumber(): number };
      affiliateAmount: { toNumber(): number } | null;
      agencyAmount: { toNumber(): number } | null;
      idSellerBeneficiary: number | null;
      idAffiliateBeneficiary: number | null;
      idAgencyBeneficiary: number | null;
    },
    idPaymentReversal: number,
  ): Promise<void> {
    const lines: Array<{
      entityType: 'seller' | 'affiliate' | 'agency';
      idBeneficiary: number | null;
      amount: { toNumber(): number } | null;
    }> = [
      { entityType: 'seller', idBeneficiary: record.idSellerBeneficiary, amount: record.sellerAmount },
      { entityType: 'affiliate', idBeneficiary: record.idAffiliateBeneficiary, amount: record.affiliateAmount },
      { entityType: 'agency', idBeneficiary: record.idAgencyBeneficiary, amount: record.agencyAmount },
    ];

    for (const line of lines) {
      const amount = line.amount?.toNumber() ?? 0;
      if (!line.idBeneficiary || amount === 0) continue;

      await this.prisma.commissionAdjustment.create({
        data: {
          idBeneficiary: line.idBeneficiary,
          idCommissionRecord: record.idCommissionRecord,
          idPaymentReversal,
          entityType: line.entityType,
          amount,
          notes: `Reversal of paid ${line.entityType} commission for CommissionRecord ${record.idCommissionRecord} (payment refunded in Helix).`,
        },
      });
    }
  }

  private async findBeneficiary(type: string, helixEntityId: number) {
    return this.prisma.beneficiary.findUnique({
      where: { beneficiaryType_helixEntityId: { beneficiaryType: type, helixEntityId } },
    });
  }

  // ─── Ingestion batches (CronExecutionLog rows for cronType='ingestion') ────

  async listBatches() {
    const logs = await this.prisma.cronExecutionLog.findMany({
      where: { cronType: 'ingestion' },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    if (logs.length === 0) return [];

    const counts = await this.prisma.payment.groupBy({
      by: ['idCronLog'],
      where: { idCronLog: { in: logs.map((l) => l.idCronLog) } },
      _count: { idPayment: true },
    });
    const countMap = new Map(counts.map((c) => [c.idCronLog, c._count.idPayment]));

    return logs.map((log) => ({ ...log, paymentCount: countMap.get(log.idCronLog) ?? 0 }));
  }

  async deleteLastBatch() {
    const last = await this.prisma.cronExecutionLog.findFirst({
      where: { cronType: 'ingestion' },
      orderBy: { startedAt: 'desc' },
    });

    if (!last) throw new NotFoundException('No ingestion batches found');

    return this.deleteBatch(last.idCronLog);
  }

  /**
   * Deletes only the payments of a batch whose commission records never left
   * 'ingested' — anything that already advanced (authorized, cancelled,
   * payment_sent, paid) is left untouched and reported back as skipped.
   */
  async deleteBatch(idCronLog: number) {
    const log = await this.prisma.cronExecutionLog.findUnique({ where: { idCronLog } });
    if (!log) throw new NotFoundException(`Batch ${idCronLog} not found`);

    const payments = await this.prisma.payment.findMany({
      where: { idCronLog },
      include: { commissionRecords: { select: { status: true } } },
    });

    const deletableIds: number[] = [];
    const skipped: Array<{ idPayment: number; helixPaymentId: number; reason: string }> = [];

    for (const payment of payments) {
      const blocking = payment.commissionRecords.filter((r) => r.status !== 'ingested');

      if (blocking.length > 0) {
        const statuses = [...new Set(blocking.map((r) => r.status))].join(', ');
        skipped.push({
          idPayment: payment.idPayment,
          helixPaymentId: payment.helixPaymentId,
          reason: `has commission record(s) already past 'ingested' (${statuses})`,
        });
      } else {
        deletableIds.push(payment.idPayment);
      }
    }

    if (deletableIds.length > 0) {
      await this.prisma.$transaction([
        this.prisma.commissionStateHistory.deleteMany({
          where: { commissionRecord: { idPayment: { in: deletableIds } } },
        }),
        this.prisma.commissionRecord.deleteMany({ where: { idPayment: { in: deletableIds } } }),
        this.prisma.paymentTrackingEvent.deleteMany({ where: { idPayment: { in: deletableIds } } }),
        this.prisma.payment.deleteMany({ where: { idPayment: { in: deletableIds } } }),
      ]);
    }

    this.logger.log(
      `Batch ${idCronLog}: deleted ${deletableIds.length}/${payments.length} payment(s), ${skipped.length} skipped`,
    );

    return { idCronLog, totalInBatch: payments.length, deleted: deletableIds.length, skipped };
  }
}
