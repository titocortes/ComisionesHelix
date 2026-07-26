import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommissionCalculatorService } from '../ingestion/commission-calculator.service.js';
import { ReviewQueryDto } from './dto/review-query.dto.js';
import { CancelCommissionDto } from './dto/cancel-commission.dto.js';

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: CommissionCalculatorService,
  ) {}

  async getReviewList(query: ReviewQueryDto) {
    const today = this.startOfToday();

    const records = await this.prisma.commissionRecord.findMany({
      where: {
        status: 'ingested',
        coverageStartDate: this.buildDateRangeFilter(today, query.ageSegment),
        ...(query.product ? { productName: { contains: query.product } } : {}),
        ...(query.seller ? { sellerName: { contains: query.seller } } : {}),
        ...(query.client ? { clientName: { contains: query.client } } : {}),
      },
      include: { payment: { select: { helixPaymentId: true, amount: true } } },
      orderBy: { coverageStartDate: 'asc' },
    });

    return records.map(({ payment, sellerAmount, affiliateAmount, agencyAmount, ...record }) => ({
      ...record,
      helixPaymentId:  payment.helixPaymentId,
      invoiceAmount:   Number(payment.amount),
      sellerAmount:    Number(sellerAmount),
      affiliateAmount: affiliateAmount === null ? null : Number(affiliateAmount),
      agencyAmount:    agencyAmount === null ? null : Number(agencyAmount),
      daysElapsed:     this.daysElapsed(record.coverageStartDate, today),
    }));
  }

  getCancellationReasons() {
    return this.prisma.cancellationReason.findMany({
      where: { active: true },
      select: { idCancellationReason: true, reason: true },
      orderBy: { reason: 'asc' },
    });
  }

  async cancelRecord(idCommissionRecord: number, dto: CancelCommissionDto, cancelledByUserId: number) {
    const record = await this.prisma.commissionRecord.findUnique({
      where: { idCommissionRecord },
    });

    if (!record) throw new NotFoundException(`CommissionRecord ${idCommissionRecord} not found`);
    if (record.status !== 'ingested') {
      throw new BadRequestException(
        `Record status is '${record.status}'; only 'ingested' records can be cancelled`,
      );
    }

    await this.prisma.commissionRecord.update({
      where: { idCommissionRecord },
      data: {
        status: 'cancelled_by_admin',
        idCancellationReason: dto.idCancellationReason,
        cancellationNotes: dto.notes ?? null,
        cancelledByUserId,
      },
    });

    await this.prisma.commissionStateHistory.create({
      data: {
        idCommissionRecord,
        fromStatus: 'ingested',
        toStatus: 'cancelled_by_admin',
        changedByUserId: cancelledByUserId,
        notes: dto.notes ?? null,
      },
    });

    return { success: true };
  }

  async recalculateOne(idCommissionRecord: number) {
    const record = await this.prisma.commissionRecord.findUnique({
      where: { idCommissionRecord },
      include: { payment: { select: { helixProductId: true, numDependents: true } } },
    });

    if (!record) throw new NotFoundException(`CommissionRecord ${idCommissionRecord} not found`);
    if (record.status !== 'ingested') {
      throw new BadRequestException(`Only 'ingested' records can be recalculated`);
    }

    const { helixProductId, numDependents } = record.payment;
    if (!helixProductId) throw new BadRequestException('No helixProductId on payment');

    const rate = await this.calculator.resolveRate(helixProductId, record.coverageStartDate);

    const [affiliateResult, agencyResult] = await Promise.all([
      this.calculator.computeFlatAmount(rate, 'affiliate', helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
      this.calculator.computeFlatAmount(rate, 'agency',    helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
    ]);

    await this.prisma.commissionRecord.update({
      where: { idCommissionRecord },
      data: {
        sellerAmount: 0,
        affiliateAmount: affiliateResult.amount,
        agencyAmount: agencyResult.amount,
        idAffiliateProductCommissionRate: affiliateResult.idProductCommissionRate,
        idAgencyProductCommissionRate: agencyResult.idProductCommissionRate,
      },
    });

    return {
      success: true,
      idCommissionRecord,
      sellerAmount: 0,
      affiliateAmount: affiliateResult.amount,
      agencyAmount: agencyResult.amount,
    };
  }

  async recalculateAllIngested(dryRun = false) {
    const records = await this.prisma.commissionRecord.findMany({
      where: { status: 'ingested' },
      include: {
        payment: {
          select: { helixProductId: true, numDependents: true },
        },
      },
    });

    let updated = 0;
    let skipped = 0;
    const details: Array<{ idCommissionRecord: number; reason: string; affiliateAmount?: number | null; agencyAmount?: number | null }> = [];

    for (const record of records) {
      const { helixProductId, numDependents } = record.payment;

      if (!helixProductId) {
        skipped++;
        details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'no helixProductId on payment' });
        continue;
      }

      const rate = await this.calculator.resolveRate(helixProductId, record.coverageStartDate);

      const [affiliateResult, agencyResult] = await Promise.all([
        this.calculator.computeFlatAmount(rate, 'affiliate', helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
        this.calculator.computeFlatAmount(rate, 'agency',    helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
      ]);

      if (affiliateResult.amount === null && agencyResult.amount === null) {
        skipped++;
        details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'no Helix product commission rate defined yet' });
        continue;
      }

      if (!dryRun) {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: {
            affiliateAmount: affiliateResult.amount,
            agencyAmount: agencyResult.amount,
            idAffiliateProductCommissionRate: affiliateResult.idProductCommissionRate,
            idAgencyProductCommissionRate: agencyResult.idProductCommissionRate,
          },
        });
      }

      updated++;
      details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'recalculated', affiliateAmount: affiliateResult.amount, agencyAmount: agencyResult.amount });
    }

    return { dryRun, found: records.length, updated, skipped, details };
  }

  async recalculateZeroAmounts(dryRun = false) {
    const records = await this.prisma.commissionRecord.findMany({
      where: {
        status: 'ingested',
        OR: [{ affiliateAmount: null }, { agencyAmount: null }],
      },
      include: {
        payment: {
          select: { helixProductId: true, numDependents: true },
        },
      },
    });

    let updated = 0;
    let skipped = 0;
    const details: Array<{ idCommissionRecord: number; reason: string; affiliateAmount?: number | null; agencyAmount?: number | null }> = [];

    for (const record of records) {
      const { helixProductId, numDependents } = record.payment;

      if (!helixProductId) {
        skipped++;
        details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'no helixProductId on payment' });
        continue;
      }

      const rate = await this.calculator.resolveRate(helixProductId, record.coverageStartDate);

      const [affiliateResult, agencyResult] = await Promise.all([
        this.calculator.computeFlatAmount(rate, 'affiliate', helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
        this.calculator.computeFlatAmount(rate, 'agency',    helixProductId, record.coverageStartDate, record.coverageEndDate, numDependents),
      ]);

      if (affiliateResult.amount === null && agencyResult.amount === null) {
        skipped++;
        details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'no Helix product commission rate defined yet' });
        continue;
      }

      if (!dryRun) {
        await this.prisma.commissionRecord.update({
          where: { idCommissionRecord: record.idCommissionRecord },
          data: {
            affiliateAmount: affiliateResult.amount,
            agencyAmount: agencyResult.amount,
            idAffiliateProductCommissionRate: affiliateResult.idProductCommissionRate,
            idAgencyProductCommissionRate: agencyResult.idProductCommissionRate,
          },
        });
      }

      updated++;
      details.push({ idCommissionRecord: record.idCommissionRecord, reason: 'recalculated', affiliateAmount: affiliateResult.amount, agencyAmount: agencyResult.amount });
    }

    return { dryRun, found: records.length, updated, skipped, details };
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private daysElapsed(coverageStartDate: Date, today: Date): number {
    return Math.round((today.getTime() - new Date(coverageStartDate).getTime()) / 86_400_000) + 1;
  }

  private buildDateRangeFilter(today: Date, segment?: string) {
    const addDays = (d: Date, n: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + n);
      return copy;
    };

    switch (segment) {
      case 'new':
        // daysElapsed 1–15 → coverageStartDate in [today-14, today]
        return { gte: addDays(today, -14), lte: today };
      case 'in_progress':
        // daysElapsed 16–35 → coverageStartDate in [today-34, today-15]
        return { gte: addDays(today, -34), lte: addDays(today, -15) };
      case 'upcoming_authorization':
        // daysElapsed 36–45 → coverageStartDate in [today-44, today-35]
        return { gte: addDays(today, -44), lte: addDays(today, -35) };
      default:
        return { lte: today };
    }
  }
}
