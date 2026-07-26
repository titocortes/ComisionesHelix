import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface PipelineStage { count: number; amount: number }
interface TopEntity     { name: string; historicTotal: number; nextCutAmount: number }
interface TopProduct    { productName: string; totalAmount: number; recordCount: number }
interface TopClient     { clientName:  string; totalAmount: number; recordCount: number }

export interface DashboardSummary {
  nextCutAmount:        number;
  nextCutCount:         number;
  ingestedInvoiceCount: number;
  ingestedAmount:       number;
  paid6MonthsTotal:     number;
  lastCut: {
    paidCount:     number;
    rejectedCount: number;
    processedAt:   string | null;
  };
  monthlyTrend:  Array<{ month: string; paidAmount: number }>;
  pipeline: {
    ingested:    PipelineStage;
    authorized:  PipelineStage;
    paymentSent: PipelineStage;
    paid:        PipelineStage;
  };
  topSellers:    TopEntity[];
  topAffiliates: TopEntity[];
  topAgencies:   TopEntity[];
  topProducts:   TopProduct[];
  topClients:    TopClient[];
  lastCutFailures: Array<{
    idPaymentBatchItem: number;
    beneficiaryName:    string;
    beneficiaryType:    string;
    amount:             number;
    rejectionReason:    string | null;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    // Current month + 5 previous = 6 months of trend
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      authorizedAgg,
      ingestedInvoiceGroups,
      ingestedAmountAgg,
      paymentSentAgg,
      allPaidAgg,
      paidRecentRecords,
      lastBatch,
      sellerHistoric,
      sellerNextCut,
      affiliateHistoric,
      affiliateNextCut,
      agencyHistoric,
      agencyNextCut,
      productGroups,
      clientGroups,
    ] = await Promise.all([
      this.prisma.commissionRecord.aggregate({
        where: { status: 'authorized' },
        _count: { idCommissionRecord: true },
        _sum:  { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['idPayment'],
        where: { status: 'ingested' },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { status: 'ingested' },
        _sum: { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { status: 'payment_sent' },
        _count: { idCommissionRecord: true },
        _sum:  { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { status: 'paid' },
        _count: { idCommissionRecord: true },
        _sum:  { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
      }),
      this.prisma.commissionRecord.findMany({
        where: { status: 'paid', updatedAt: { gte: sixMonthsAgo } },
        select: { sellerAmount: true, affiliateAmount: true, agencyAmount: true, updatedAt: true },
      }),
      this.prisma.paymentBatch.findFirst({
        orderBy: { processedAt: 'desc' },
        include: {
          batchItems: {
            select: {
              idPaymentBatchItem: true,
              status:             true,
              totalAmount:        true,
              rejectionReason:    true,
              beneficiary:        { select: { name: true, beneficiaryType: true } },
            },
          },
        },
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['sellerName'],
        where: { status: 'paid', sellerName: { not: null } },
        _sum: { sellerAmount: true },
        orderBy: { _sum: { sellerAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['sellerName'],
        where: { status: 'authorized', sellerName: { not: null } },
        _sum: { sellerAmount: true },
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['affiliateName'],
        where: { status: 'paid', affiliateName: { not: null } },
        _sum: { affiliateAmount: true },
        orderBy: { _sum: { affiliateAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['affiliateName'],
        where: { status: 'authorized', affiliateName: { not: null } },
        _sum: { affiliateAmount: true },
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['agencyName'],
        where: { status: 'paid', agencyName: { not: null } },
        _sum: { agencyAmount: true },
        orderBy: { _sum: { agencyAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['agencyName'],
        where: { status: 'authorized', agencyName: { not: null } },
        _sum: { agencyAmount: true },
      }),
      // Fetch more than needed; re-sort by combined total in JS
      this.prisma.commissionRecord.groupBy({
        by: ['productName'],
        where: { status: 'paid', productName: { not: null } },
        _sum:     { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
        _count:   { idCommissionRecord: true },
        orderBy:  { _sum: { sellerAmount: 'desc' } },
        take: 50,
      }),
      this.prisma.commissionRecord.groupBy({
        by: ['clientName'],
        where: { status: 'paid', clientName: { not: null } },
        _sum:     { sellerAmount: true, affiliateAmount: true, agencyAmount: true },
        _count:   { idCommissionRecord: true },
        orderBy:  { _sum: { sellerAmount: 'desc' } },
        take: 50,
      }),
    ]);

    const sumFields = (s: { sellerAmount?: any; affiliateAmount?: any; agencyAmount?: any } | null) =>
      Number(s?.sellerAmount ?? 0) + Number(s?.affiliateAmount ?? 0) + Number(s?.agencyAmount ?? 0);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const nextCutAmount        = sumFields(authorizedAgg._sum);
    const nextCutCount         = authorizedAgg._count.idCommissionRecord;
    const ingestedInvoiceCount = ingestedInvoiceGroups.length;
    const ingestedAmount       = sumFields(ingestedAmountAgg._sum);
    const paid6MonthsTotal     = paidRecentRecords.reduce(
      (s, r) => s + Number(r.sellerAmount) + Number(r.affiliateAmount) + Number(r.agencyAmount), 0,
    );

    // ── Last cut ──────────────────────────────────────────────────────────────
    const lastCut = lastBatch
      ? {
          paidCount:     lastBatch.batchItems.filter(i => i.status === 'paid').length,
          rejectedCount: lastBatch.batchItems.filter(i => i.status === 'rejected').length,
          processedAt:   lastBatch.processedAt.toISOString(),
        }
      : { paidCount: 0, rejectedCount: 0, processedAt: null };

    // ── Monthly trend ─────────────────────────────────────────────────────────
    const monthlyTrend = this.buildMonthlyTrend(paidRecentRecords, now);

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const pipeline = {
      ingested:    { count: ingestedInvoiceCount,                        amount: ingestedAmount },
      authorized:  { count: nextCutCount,                               amount: nextCutAmount  },
      paymentSent: { count: paymentSentAgg._count.idCommissionRecord,   amount: sumFields(paymentSentAgg._sum) },
      paid:        { count: allPaidAgg._count.idCommissionRecord,       amount: sumFields(allPaidAgg._sum) },
    };

    // ── Top sellers ───────────────────────────────────────────────────────────
    const sellerNextMap = new Map(sellerNextCut.map(r => [r.sellerName, Number(r._sum.sellerAmount ?? 0)]));
    const topSellers: TopEntity[] = sellerHistoric.map(r => ({
      name:          r.sellerName!,
      historicTotal: Number(r._sum.sellerAmount ?? 0),
      nextCutAmount: sellerNextMap.get(r.sellerName!) ?? 0,
    }));

    // ── Top affiliates ────────────────────────────────────────────────────────
    const affiliateNextMap = new Map(affiliateNextCut.map(r => [r.affiliateName, Number(r._sum.affiliateAmount ?? 0)]));
    const topAffiliates: TopEntity[] = affiliateHistoric.map(r => ({
      name:          r.affiliateName!,
      historicTotal: Number(r._sum.affiliateAmount ?? 0),
      nextCutAmount: affiliateNextMap.get(r.affiliateName!) ?? 0,
    }));

    // ── Top agencies ──────────────────────────────────────────────────────────
    const agencyNextMap = new Map(agencyNextCut.map(r => [r.agencyName, Number(r._sum.agencyAmount ?? 0)]));
    const topAgencies: TopEntity[] = agencyHistoric.map(r => ({
      name:          r.agencyName!,
      historicTotal: Number(r._sum.agencyAmount ?? 0),
      nextCutAmount: agencyNextMap.get(r.agencyName!) ?? 0,
    }));

    // ── Top products (sort by total of all 3 fields) ───────────────────────
    const topProducts: TopProduct[] = productGroups
      .map(r => ({
        productName: r.productName!,
        totalAmount: sumFields(r._sum),
        recordCount: r._count.idCommissionRecord,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // ── Top clients ───────────────────────────────────────────────────────────
    const topClients: TopClient[] = clientGroups
      .map(r => ({
        clientName:  r.clientName!,
        totalAmount: sumFields(r._sum),
        recordCount: r._count.idCommissionRecord,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // ── Last cut failures ─────────────────────────────────────────────────────
    const lastCutFailures = (lastBatch?.batchItems ?? [])
      .filter(i => i.status === 'rejected')
      .map(i => ({
        idPaymentBatchItem: i.idPaymentBatchItem,
        beneficiaryName:    i.beneficiary.name,
        beneficiaryType:    i.beneficiary.beneficiaryType,
        amount:             Number(i.totalAmount),
        rejectionReason:    i.rejectionReason,
      }));

    return {
      nextCutAmount, nextCutCount,
      ingestedInvoiceCount, ingestedAmount,
      paid6MonthsTotal,
      lastCut,
      monthlyTrend,
      pipeline,
      topSellers, topAffiliates, topAgencies,
      topProducts, topClients,
      lastCutFailures,
    };
  }

  private buildMonthlyTrend(
    records: Array<{ sellerAmount: any; affiliateAmount: any; agencyAmount: any; updatedAt: Date }>,
    now: Date,
  ): Array<{ month: string; paidAmount: number }> {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(this.ym(d), 0);
    }
    for (const r of records) {
      const key = this.ym(r.updatedAt);
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0)
          + Number(r.sellerAmount) + Number(r.affiliateAmount) + Number(r.agencyAmount));
      }
    }
    return Array.from(map.entries()).map(([month, paidAmount]) => ({ month, paidAmount }));
  }

  private ym(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
