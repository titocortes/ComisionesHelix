import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HelixApiService, HelixProductCommissionRate } from '../helix/helix-api.service.js';

export interface CoveragePeriod {
  start: Date;
  end: Date;
  authorizationDate: Date;
}

export interface FlatEntityResult {
  amount: number | null;
  idProductCommissionRate: number | null;
}

@Injectable()
export class CommissionCalculatorService {
  private readonly logger = new Logger(CommissionCalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helixApi: HelixApiService,
  ) {}

  splitIntoCoveragePeriods(coverageStart: Date, coverageEnd: Date): CoveragePeriod[] {
    const periods: CoveragePeriod[] = [];
    let current = new Date(coverageStart);

    while (current <= coverageEnd) {
      const day = current.getDate();
      let periodEnd: Date;

      if (day <= 14) {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      } else {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 2, 0);
      }

      if (periodEnd > coverageEnd) {
        periodEnd = new Date(coverageEnd);
      }

      periods.push({
        start: new Date(current),
        end: new Date(periodEnd),
        authorizationDate: this.addDays(new Date(current), 45),
      });

      current = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1);
    }

    return periods;
  }

  /**
   * Resolves the Helix per-product commission rate applicable on the period's own
   * start date (no proration across a rate change mid-period). One response carries
   * both agencyCommission and affiliateCommission, so callers fetch it once per
   * period and reuse it for both entities via computeFlatAmount.
   */
  async resolveRate(helixProductId: number, periodStart: Date): Promise<HelixProductCommissionRate | null> {
    const dateParam = this.toDateOnly(periodStart);
    const rate = await this.helixApi.getProductCommissionRate(helixProductId, dateParam);

    if (!rate) {
      this.logger.warn(
        `No Helix product commission rate defined for helixProductId=${helixProductId} at ${dateParam}`,
      );
    }

    return rate;
  }

  /**
   * Applies an already-resolved flat rate, then layers the existing per-dependent
   * discount schedule on top. Returns amount: null (never 0) when rate is null.
   */
  async computeFlatAmount(
    rate: HelixProductCommissionRate | null,
    entityType: 'agency' | 'affiliate',
    helixProductId: number,
    periodStart: Date,
    periodEnd: Date,
    numDependents: number,
  ): Promise<FlatEntityResult> {
    if (!rate) return { amount: null, idProductCommissionRate: null };

    const flatAmount = Number(
      entityType === 'agency' ? rate.agencyCommission : rate.affiliateCommission,
    );

    const multiplier =
      rate.periodUnit === 'day' ? this.daysBetweenInclusive(periodStart, periodEnd) : 1;

    const principal = flatAmount * multiplier;
    let total = principal;

    for (let dep = 1; dep <= numDependents; dep++) {
      const pct = await this.getDependentDiscountPct(helixProductId, dep);
      total += principal * pct;
    }

    return {
      amount: Math.round(total * 100) / 100,
      idProductCommissionRate: rate.idProductCommissionRate,
    };
  }

  private async getDependentDiscountPct(helixProductId: number, depNumber: number): Promise<number> {
    const product = await this.prisma.product.findUnique({ where: { helixProductId } });
    if (!product) return 0;

    const discounts = await this.prisma.dependentDiscount.findMany({
      where: { idProduct: product.idProduct },
      orderBy: { dependentNumber: 'asc' },
    });

    const exact = discounts.find((d) => d.dependentNumber === depNumber && !d.orMore);
    if (exact) return Number(exact.discountPercentage) / 100;

    const orMoreEntries = discounts
      .filter((d) => d.orMore && d.dependentNumber <= depNumber)
      .sort((a, b) => b.dependentNumber - a.dependentNumber);

    if (orMoreEntries.length > 0) return Number(orMoreEntries[0].discountPercentage) / 100;

    return 0;
  }

  private daysBetweenInclusive(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateOnly(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
