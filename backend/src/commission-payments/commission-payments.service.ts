import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QboService } from '../qbo/qbo.service.js';
import type {
  PaymentTrackingQueryDto,
  BeneficiarySummaryQueryDto,
  BatchesQueryDto,
} from './dto/payment-tracking-query.dto.js';

interface BeneficiaryLine {
  idCommissionRecord: number;
  entityType: 'seller' | 'affiliate' | 'agency';
  amount: number;
}

interface BeneficiaryGroup {
  idBeneficiary: number;
  qboVendorId: string | null;
  name: string;
  total: number;
  lines: BeneficiaryLine[];
}

export interface QboWebhookPayload {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string;
        id: string;
        operation: string;
        lastUpdated: string;
      }>;
    };
  }>;
}

@Injectable()
export class CommissionPaymentsService {
  private readonly logger = new Logger(CommissionPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbo: QboService,
  ) {}

  // ─── Payment batch (used by cron and exposed for testing) ─────────────────

  async runPaymentBatch(): Promise<{ batchId: number; groups: number; records: number }> {
    const authorizedRecords = await this.prisma.commissionRecord.findMany({
      where: { status: 'authorized' },
      include: {
        sellerBeneficiary: true,
        affiliateBeneficiary: true,
        agencyBeneficiary: true,
      },
    });

    if (authorizedRecords.length === 0) {
      this.logger.log('No authorized commission records found for payment batch.');
      return { batchId: 0, groups: 0, records: 0 };
    }

    const groups = this.groupByBeneficiary(authorizedRecords);

    if (groups.size === 0) {
      this.logger.warn('Authorized records found but none have linked beneficiaries.');
      return { batchId: 0, groups: 0, records: authorizedRecords.length };
    }

    const totalAmount = [...groups.values()].reduce((sum, g) => sum + g.total, 0);

    const batch = await this.prisma.paymentBatch.create({
      data: { processedAt: new Date(), status: 'processing', totalAmount },
    });

    const affectedRecordIds = new Set<number>();

    for (const group of groups.values()) {
      const qboBillPaymentId = group.qboVendorId
        ? await this.qbo.createBillAndPay(group.qboVendorId, group.total, group.name)
        : null;

      const batchItem = await this.prisma.paymentBatchItem.create({
        data: {
          idPaymentBatch: batch.idPaymentBatch,
          idBeneficiary: group.idBeneficiary,
          totalAmount: group.total,
          qboBillPaymentId,
          status: qboBillPaymentId ? 'payment_sent' : 'pending_qbo',
        },
      });

      for (const line of group.lines) {
        await this.prisma.paymentBatchRecord.create({
          data: {
            idPaymentBatchItem: batchItem.idPaymentBatchItem,
            idCommissionRecord: line.idCommissionRecord,
            entityType: line.entityType,
            amount: line.amount,
          },
        });
        affectedRecordIds.add(line.idCommissionRecord);
      }
    }

    for (const idCommissionRecord of affectedRecordIds) {
      await this.prisma.commissionRecord.update({
        where: { idCommissionRecord },
        data: { status: 'payment_sent' },
      });
      await this.prisma.commissionStateHistory.create({
        data: {
          idCommissionRecord,
          fromStatus: 'authorized',
          toStatus: 'payment_sent',
          notes: `Included in payment batch ${batch.idPaymentBatch}`,
        },
      });
    }

    await this.prisma.paymentBatch.update({
      where: { idPaymentBatch: batch.idPaymentBatch },
      data: { status: 'completed' },
    });

    this.logger.log(
      `Payment batch ${batch.idPaymentBatch} completed. Beneficiaries: ${groups.size}, Records: ${affectedRecordIds.size}`,
    );

    return { batchId: batch.idPaymentBatch, groups: groups.size, records: affectedRecordIds.size };
  }

  // ─── QBO webhook processing ───────────────────────────────────────────────

  async processWebhook(payload: QboWebhookPayload): Promise<void> {
    const billPaymentIds = payload.eventNotifications
      .flatMap(n => n.dataChangeEvent.entities)
      .filter(e => e.name === 'BillPayment')
      .map(e => e.id);

    for (const billPaymentId of billPaymentIds) {
      await this.processBillPaymentUpdate(billPaymentId);
    }
  }

  private async processBillPaymentUpdate(qboBillPaymentId: string): Promise<void> {
    const batchItem = await this.prisma.paymentBatchItem.findFirst({
      where: { qboBillPaymentId },
      include: { batchRecords: true },
    });

    if (!batchItem) {
      this.logger.warn(`No PaymentBatchItem found for qboBillPaymentId=${qboBillPaymentId}`);
      return;
    }

    const qboStatus = await this.qbo.getBillPaymentStatus(qboBillPaymentId);

    if (!qboStatus) {
      this.logger.warn(
        `QBO not configured. Cannot process BillPayment ${qboBillPaymentId} status update.`,
      );
      return;
    }

    if (qboStatus.status === 'paid') {
      await this.prisma.paymentBatchItem.update({
        where: { idPaymentBatchItem: batchItem.idPaymentBatchItem },
        data: { status: 'paid', paidAt: new Date() },
      });

      for (const record of batchItem.batchRecords) {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: { status: 'paid' },
        });
        await this.prisma.commissionStateHistory.create({
          data: {
            idCommissionRecord: record.idCommissionRecord,
            fromStatus: 'payment_sent',
            toStatus: 'paid',
            notes: `Payment confirmed by QBO. BillPayment: ${qboBillPaymentId}`,
          },
        });
      }
    } else if (qboStatus.status === 'rejected') {
      await this.prisma.paymentBatchItem.update({
        where: { idPaymentBatchItem: batchItem.idPaymentBatchItem },
        data: { status: 'rejected', rejectionReason: qboStatus.reason ?? 'Rejected by QBO' },
      });

      for (const record of batchItem.batchRecords) {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: {
            status: 'authorized',
            rejectionReason: qboStatus.reason ?? 'Payment rejected by QBO',
          },
        });
        await this.prisma.commissionStateHistory.create({
          data: {
            idCommissionRecord: record.idCommissionRecord,
            fromStatus: 'payment_sent',
            toStatus: 'authorized',
            notes: `Payment rejected by QBO. Reason: ${qboStatus.reason ?? 'unknown'}. BillPayment: ${qboBillPaymentId}`,
          },
        });
      }

      this.logger.warn(
        `Payment rejected for BillPayment ${qboBillPaymentId}. Affected records reset to 'authorized'. Admin action required.`,
      );
    }
  }

  // ─── Manual retry ─────────────────────────────────────────────────────────

  async retryPayment(idCommissionRecord: number): Promise<{ success: boolean }> {
    const record = await this.prisma.commissionRecord.findUnique({
      where: { idCommissionRecord },
      include: {
        sellerBeneficiary: true,
        affiliateBeneficiary: true,
        agencyBeneficiary: true,
      },
    });

    if (!record) throw new NotFoundException(`CommissionRecord ${idCommissionRecord} not found`);
    if (record.status !== 'authorized') {
      throw new BadRequestException(
        `Record status is '${record.status}'; only 'authorized' records can be retried`,
      );
    }

    const groups = this.groupByBeneficiary([record]);

    if (groups.size === 0) {
      throw new BadRequestException('No beneficiaries linked to this commission record');
    }

    const totalAmount = [...groups.values()].reduce((sum, g) => sum + g.total, 0);

    const batch = await this.prisma.paymentBatch.create({
      data: { processedAt: new Date(), status: 'processing', totalAmount },
    });

    for (const group of groups.values()) {
      const qboBillPaymentId = group.qboVendorId
        ? await this.qbo.createBillAndPay(group.qboVendorId, group.total, group.name)
        : null;

      const batchItem = await this.prisma.paymentBatchItem.create({
        data: {
          idPaymentBatch: batch.idPaymentBatch,
          idBeneficiary: group.idBeneficiary,
          totalAmount: group.total,
          qboBillPaymentId,
          status: qboBillPaymentId ? 'payment_sent' : 'pending_qbo',
        },
      });

      await this.prisma.paymentBatchRecord.create({
        data: {
          idPaymentBatchItem: batchItem.idPaymentBatchItem,
          idCommissionRecord,
          entityType: group.lines[0]!.entityType,
          amount: group.total,
        },
      });
    }

    await this.prisma.commissionRecord.update({
      where: { idCommissionRecord },
      data: { status: 'payment_sent', rejectionReason: null },
    });

    await this.prisma.commissionStateHistory.create({
      data: {
        idCommissionRecord,
        fromStatus: 'authorized',
        toStatus: 'payment_sent',
        notes: `Manual retry. Payment batch ${batch.idPaymentBatch}`,
      },
    });

    await this.prisma.paymentBatch.update({
      where: { idPaymentBatch: batch.idPaymentBatch },
      data: { status: 'completed' },
    });

    return { success: true };
  }

  // ─── Month counts for the filter dropdown ────────────────────────────────

  async getMonthCounts(): Promise<{ month: string; count: number }[]> {
    const rows = await this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT DATE_FORMAT(coverageStartDate, '%Y-%m') AS month, COUNT(*) AS count
      FROM commission_records
      WHERE status IN ('authorized', 'payment_sent', 'paid')
      GROUP BY DATE_FORMAT(coverageStartDate, '%Y-%m')
      ORDER BY month DESC
    `;
    return rows.map(r => ({ month: r.month, count: Number(r.count) }));
  }

  // ─── Payment tracking queries ─────────────────────────────────────────────

  async getTrackingRecords(query: PaymentTrackingQueryDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // By default show records in the payment lifecycle (exclude ingested/cancelled)
    if (!query.status || query.status === 'all') {
      where.status = { in: ['authorized', 'payment_sent', 'paid'] };
    } else if (query.status === 'authorized') {
      where.status = 'authorized';
      where.rejectionReason = null;
    } else if (query.status === 'rejected') {
      where.status = 'authorized';
      where.rejectionReason = { not: null };
    } else {
      where.status = query.status;
    }

    if (query.coverageMonth) {
      const [year, month] = query.coverageMonth.split('-').map(Number);
      where.coverageStartDate = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      };
    }

    if (query.beneficiary?.trim()) {
      where.OR = [
        { sellerName: { contains: query.beneficiary.trim() } },
        { affiliateName: { contains: query.beneficiary.trim() } },
        { agencyName: { contains: query.beneficiary.trim() } },
      ];
    }

    const records = await this.prisma.commissionRecord.findMany({
      where,
      include: {
        payment: { select: { helixPaymentId: true, amount: true, paymentDate: true } },
        sellerBeneficiary: { select: { idBeneficiary: true, name: true, beneficiaryType: true } },
        affiliateBeneficiary: { select: { idBeneficiary: true, name: true, beneficiaryType: true } },
        agencyBeneficiary: { select: { idBeneficiary: true, name: true, beneficiaryType: true } },
        stateHistory: { orderBy: { createdAt: 'asc' } },
        paymentBatchRecords: {
          take: 1,
          orderBy: { idBatchRecord: 'desc' },
          include: {
            paymentBatchItem: {
              select: {
                qboBillPaymentId: true,
                status: true,
                paidAt: true,
                paymentBatch: {
                  select: { idPaymentBatch: true, processedAt: true, status: true, totalAmount: true },
                },
              },
            },
          },
        },
      },
      orderBy: { coverageStartDate: 'desc' },
    });

    return records.map(r => {
      const latestBatchRecord = r.paymentBatchRecords[0] ?? null;
      return {
        idCommissionRecord: r.idCommissionRecord,
        helixPaymentId: r.payment.helixPaymentId,
        invoiceAmount: r.payment.amount.toNumber(),
        paymentDate: r.payment.paymentDate,
        clientName: r.clientName,
        productName: r.productName,
        sellerName: r.sellerName,
        affiliateName: r.affiliateName,
        agencyName: r.agencyName,
        coverageStartDate: r.coverageStartDate,
        coverageEndDate: r.coverageEndDate,
        authorizationDate: r.authorizationDate,
        sellerAmount: r.sellerAmount.toNumber(),
        affiliateAmount: r.affiliateAmount?.toNumber() ?? 0,
        agencyAmount: r.agencyAmount?.toNumber() ?? 0,
        totalAmount:
          r.sellerAmount.toNumber() +
          (r.affiliateAmount?.toNumber() ?? 0) +
          (r.agencyAmount?.toNumber() ?? 0),
        status: r.rejectionReason ? 'rejected' : r.status,
        rejectionReason: r.rejectionReason,
        sellerBeneficiary: r.sellerBeneficiary,
        affiliateBeneficiary: r.affiliateBeneficiary,
        agencyBeneficiary: r.agencyBeneficiary,
        stateHistory: r.stateHistory,
        paymentBatch: latestBatchRecord?.paymentBatchItem?.paymentBatch
          ? {
              ...latestBatchRecord.paymentBatchItem.paymentBatch,
              totalAmount:
                latestBatchRecord.paymentBatchItem.paymentBatch.totalAmount.toNumber(),
            }
          : null,
        qboBillPaymentId: latestBatchRecord?.paymentBatchItem?.qboBillPaymentId ?? null,
        qboPaidAt: latestBatchRecord?.paymentBatchItem?.paidAt ?? null,
      };
    });
  }

  async getBeneficiarySummary(query: BeneficiarySummaryQueryDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: { in: ['authorized', 'payment_sent', 'paid'] } };

    if (query.coverageMonth) {
      const [year, month] = query.coverageMonth.split('-').map(Number);
      where.coverageStartDate = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      };
    }

    const records = await this.prisma.commissionRecord.findMany({
      where,
      include: {
        sellerBeneficiary: true,
        affiliateBeneficiary: true,
        agencyBeneficiary: true,
      },
    });

    type SummaryEntry = {
      idBeneficiary: number;
      name: string;
      type: string;
      qboVendorId: string | null;
      totalAuthorized: number;
      totalPaymentSent: number;
      totalPaid: number;
      totalRejected: number;
      invoiceCount: number;
      commissionRecordIds: number[];
    };

    const map = new Map<number, SummaryEntry>();

    const add = (
      ben: { idBeneficiary: number; name: string; beneficiaryType: string; qboVendorId: string | null } | null,
      amount: { toNumber(): number } | null,
      status: string,
      rejectionReason: string | null,
      idRecord: number,
    ) => {
      if (!ben) return;
      const amt = amount ? amount.toNumber() : 0;
      if (amt === 0) return;

      const effectiveStatus = rejectionReason ? 'rejected' : status;
      const entry = map.get(ben.idBeneficiary) ?? {
        idBeneficiary: ben.idBeneficiary,
        name: ben.name,
        type: ben.beneficiaryType,
        qboVendorId: ben.qboVendorId,
        totalAuthorized: 0,
        totalPaymentSent: 0,
        totalPaid: 0,
        totalRejected: 0,
        invoiceCount: 0,
        commissionRecordIds: [],
      };

      if (effectiveStatus === 'authorized') entry.totalAuthorized += amt;
      else if (effectiveStatus === 'payment_sent') entry.totalPaymentSent += amt;
      else if (effectiveStatus === 'paid') entry.totalPaid += amt;
      else if (effectiveStatus === 'rejected') entry.totalRejected += amt;

      if (!entry.commissionRecordIds.includes(idRecord)) {
        entry.commissionRecordIds.push(idRecord);
        entry.invoiceCount++;
      }

      map.set(ben.idBeneficiary, entry);
    };

    for (const r of records) {
      add(r.sellerBeneficiary, r.sellerAmount, r.status, r.rejectionReason, r.idCommissionRecord);
      add(r.affiliateBeneficiary, r.affiliateAmount, r.status, r.rejectionReason, r.idCommissionRecord);
      add(r.agencyBeneficiary, r.agencyAmount, r.status, r.rejectionReason, r.idCommissionRecord);
    }

    let result = Array.from(map.values());

    if (query.type && query.type !== 'all') {
      result = result.filter(b => b.type === query.type);
    }

    return result.sort(
      (a, b) =>
        b.totalPaid + b.totalPaymentSent + b.totalAuthorized + b.totalRejected -
        (a.totalPaid + a.totalPaymentSent + a.totalAuthorized + a.totalRejected),
    );
  }

  async getPaymentBatches(query: BatchesQueryDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      where.processedAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    const batches = await this.prisma.paymentBatch.findMany({
      where,
      include: {
        batchItems: {
          include: {
            beneficiary: { select: { name: true, beneficiaryType: true } },
            batchRecords: { select: { idCommissionRecord: true, entityType: true, amount: true } },
          },
          orderBy: { totalAmount: 'desc' },
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    return batches.map(b => ({
      idPaymentBatch: b.idPaymentBatch,
      processedAt: b.processedAt,
      status: b.status,
      totalAmount: b.totalAmount.toNumber(),
      batchItems: b.batchItems.map(item => ({
        idPaymentBatchItem: item.idPaymentBatchItem,
        idBeneficiary: item.idBeneficiary,
        beneficiaryName: item.beneficiary.name,
        beneficiaryType: item.beneficiary.beneficiaryType,
        totalAmount: item.totalAmount.toNumber(),
        qboBillPaymentId: item.qboBillPaymentId,
        status: item.status,
        rejectionReason: item.rejectionReason,
        paidAt: item.paidAt,
        commissionCount: item.batchRecords.length,
      })),
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private groupByBeneficiary(
    records: Array<{
      idCommissionRecord: number;
      sellerAmount: { toNumber(): number };
      affiliateAmount: { toNumber(): number } | null;
      agencyAmount: { toNumber(): number } | null;
      sellerBeneficiary: { idBeneficiary: number; qboVendorId: string | null; name: string } | null;
      affiliateBeneficiary: { idBeneficiary: number; qboVendorId: string | null; name: string } | null;
      agencyBeneficiary: { idBeneficiary: number; qboVendorId: string | null; name: string } | null;
    }>,
  ): Map<number, BeneficiaryGroup> {
    const groups = new Map<number, BeneficiaryGroup>();

    const addLine = (
      beneficiary: { idBeneficiary: number; qboVendorId: string | null; name: string } | null,
      idCommissionRecord: number,
      entityType: 'seller' | 'affiliate' | 'agency',
      amount: { toNumber(): number } | null,
    ) => {
      if (!beneficiary) return;
      // Amounts are null only while a Helix product commission rate is unresolved; the
      // authorization cron never lets such records reach this 'authorized' stage, but
      // fall back to 0 defensively rather than treating null as a real commission.
      const amountNum = amount ? amount.toNumber() : 0;
      if (amountNum === 0) return;

      const existing = groups.get(beneficiary.idBeneficiary);
      const line: BeneficiaryLine = { idCommissionRecord, entityType, amount: amountNum };

      if (existing) {
        existing.total += amountNum;
        existing.lines.push(line);
      } else {
        groups.set(beneficiary.idBeneficiary, {
          idBeneficiary: beneficiary.idBeneficiary,
          qboVendorId: beneficiary.qboVendorId,
          name: beneficiary.name,
          total: amountNum,
          lines: [line],
        });
      }
    };

    for (const record of records) {
      addLine(record.sellerBeneficiary, record.idCommissionRecord, 'seller', record.sellerAmount);
      addLine(record.affiliateBeneficiary, record.idCommissionRecord, 'affiliate', record.affiliateAmount);
      addLine(record.agencyBeneficiary, record.idCommissionRecord, 'agency', record.agencyAmount);
    }

    return groups;
  }
}
