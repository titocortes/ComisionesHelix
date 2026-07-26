import { jest } from '@jest/globals';
import { CommissionCalculatorService } from './commission-calculator.service.js';
import type { HelixApiService, HelixProductCommissionRate } from '../helix/helix-api.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeRate(overrides: Partial<HelixProductCommissionRate> = {}): HelixProductCommissionRate {
  return {
    idProductCommissionRate: 1,
    idProduct: 8,
    agencyCommission: '10.00',
    affiliateCommission: '5.00',
    periodUnit: 'month',
    effectiveDate: null,
    endDate: null,
    ...overrides,
  };
}

describe('CommissionCalculatorService', () => {
  let prisma: { product: { findUnique: jest.Mock }; dependentDiscount: { findMany: jest.Mock } };
  let helixApi: { getProductCommissionRate: jest.Mock };
  let calculator: CommissionCalculatorService;

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      dependentDiscount: { findMany: jest.fn().mockResolvedValue([]) },
    };
    helixApi = { getProductCommissionRate: jest.fn() };
    calculator = new CommissionCalculatorService(
      prisma as unknown as PrismaService,
      helixApi as unknown as HelixApiService,
    );
  });

  describe('resolveRate', () => {
    it('resolves the rate using the period start date, not the invoice/today date', async () => {
      helixApi.getProductCommissionRate.mockResolvedValue(makeRate());

      await calculator.resolveRate(8, new Date(2026, 1, 20));

      expect(helixApi.getProductCommissionRate).toHaveBeenCalledWith(8, '2026-02-20');
    });

    it('never treats a null Helix rate as $0 — returns null and only fetches once', async () => {
      helixApi.getProductCommissionRate.mockResolvedValue(null);

      const rate = await calculator.resolveRate(8, new Date(2026, 1, 1));

      expect(rate).toBeNull();
      expect(helixApi.getProductCommissionRate).toHaveBeenCalledTimes(1);
    });
  });

  describe('computeFlatAmount', () => {
    it('returns amount: null when no rate was resolved (never $0)', async () => {
      const result = await calculator.computeFlatAmount(
        null,
        'agency',
        8,
        new Date(2026, 1, 1),
        new Date(2026, 1, 28),
        0,
      );

      expect(result).toEqual({ amount: null, idProductCommissionRate: null });
    });

    it('trusts whatever single rate Helix resolves for an open-started (effectiveDate: null) rate', async () => {
      const rate = makeRate({ effectiveDate: null, endDate: '2026-06-30', agencyCommission: '7.50' });

      const result = await calculator.computeFlatAmount(rate, 'agency', 8, new Date(2026, 0, 1), new Date(2026, 0, 31), 0);

      expect(result.amount).toBe(7.5);
    });

    it('for periodUnit=month, uses a flat multiplier of 1 regardless of the actual day count (extended period)', async () => {
      const rate = makeRate({ periodUnit: 'month', agencyCommission: '10.00' });

      // Feb 20 -> Mar 31 is a 40-day extended coverage period, still "one covered month"
      const result = await calculator.computeFlatAmount(rate, 'agency', 8, new Date(2026, 1, 20), new Date(2026, 2, 31), 0);

      expect(result.amount).toBe(10);
    });

    it('for periodUnit=day, multiplies the flat rate by the inclusive day count', async () => {
      const rate = makeRate({ periodUnit: 'day', agencyCommission: '2.00' });

      // Feb 1 -> Feb 28 inclusive = 28 days
      const result = await calculator.computeFlatAmount(rate, 'agency', 8, new Date(2026, 1, 1), new Date(2026, 1, 28), 0);

      expect(result.amount).toBe(56);
    });

    it('applies the existing per-dependent discount schedule on top of the flat principal', async () => {
      const rate = makeRate({ periodUnit: 'month', affiliateCommission: '10.00' });
      prisma.product.findUnique.mockResolvedValue({ idProduct: 42, helixProductId: 8 });
      prisma.dependentDiscount.findMany.mockResolvedValue([
        { dependentNumber: 1, discountPercentage: 75, orMore: false },
        { dependentNumber: 2, discountPercentage: 70, orMore: false },
      ]);

      const result = await calculator.computeFlatAmount(rate, 'affiliate', 8, new Date(2026, 1, 1), new Date(2026, 1, 28), 2);

      // principal 10 + dep1 (10*0.75=7.5) + dep2 (10*0.70=7.0) = 24.5
      expect(result.amount).toBe(24.5);
    });

    it('reports back the idProductCommissionRate that Helix returned, for later confirmation', async () => {
      const rate = makeRate({ idProductCommissionRate: 777 });

      const result = await calculator.computeFlatAmount(rate, 'agency', 8, new Date(2026, 1, 1), new Date(2026, 1, 28), 0);

      expect(result.idProductCommissionRate).toBe(777);
    });

    it('computes agency and affiliate amounts from a single shared rate lookup (no duplicate Helix calls)', async () => {
      helixApi.getProductCommissionRate.mockResolvedValue(
        makeRate({ periodUnit: 'month', agencyCommission: '10.00', affiliateCommission: '5.00' }),
      );

      const rate = await calculator.resolveRate(8, new Date(2026, 1, 1));
      const [agency, affiliate] = await Promise.all([
        calculator.computeFlatAmount(rate, 'agency', 8, new Date(2026, 1, 1), new Date(2026, 1, 28), 0),
        calculator.computeFlatAmount(rate, 'affiliate', 8, new Date(2026, 1, 1), new Date(2026, 1, 28), 0),
      ]);

      expect(helixApi.getProductCommissionRate).toHaveBeenCalledTimes(1);
      expect(agency.amount).toBe(10);
      expect(affiliate.amount).toBe(5);
    });
  });
});
