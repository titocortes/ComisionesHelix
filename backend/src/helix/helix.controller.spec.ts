import { jest } from '@jest/globals';
import { HelixController } from './helix.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('HelixController.getConfirmedCommissionRates', () => {
  let prisma: { commissionRecord: { findMany: jest.Mock } };
  let controller: HelixController;

  beforeEach(() => {
    prisma = { commissionRecord: { findMany: jest.fn() } };
    controller = new HelixController(prisma as unknown as PrismaService);
  });

  it('only queries finalized statuses (authorized, payment_sent, paid)', async () => {
    prisma.commissionRecord.findMany.mockResolvedValue([]);

    await controller.getConfirmedCommissionRates();

    const args = prisma.commissionRecord.findMany.mock.calls[0][0];
    expect(args.where.status.in).toEqual(['authorized', 'payment_sent', 'paid']);
  });

  it('dedupes and merges agency + affiliate rate ids across records', async () => {
    prisma.commissionRecord.findMany.mockResolvedValue([
      { idAgencyProductCommissionRate: 1, idAffiliateProductCommissionRate: 2 },
      { idAgencyProductCommissionRate: 1, idAffiliateProductCommissionRate: null },
      { idAgencyProductCommissionRate: null, idAffiliateProductCommissionRate: 3 },
    ]);

    const result = await controller.getConfirmedCommissionRates();

    expect(result.success).toBe(true);
    expect(result.confirmed.sort()).toEqual([1, 2, 3]);
  });

  it('returns an empty confirmed list when there are no finalized rate usages', async () => {
    prisma.commissionRecord.findMany.mockResolvedValue([]);

    const result = await controller.getConfirmedCommissionRates();

    expect(result).toEqual({ success: true, confirmed: [] });
  });
});

describe('HelixController.getConfirmedReversals', () => {
  let prisma: { paymentReversal: { findMany: jest.Mock } };
  let controller: HelixController;

  beforeEach(() => {
    prisma = { paymentReversal: { findMany: jest.fn() } };
    controller = new HelixController(prisma as unknown as PrismaService);
  });

  it('returns the helixPaymentId of every tracked reversal, regardless of resolution status', async () => {
    prisma.paymentReversal.findMany.mockResolvedValue([
      { payment: { helixPaymentId: 1001 } },
      { payment: { helixPaymentId: 1005 } },
    ]);

    const result = await controller.getConfirmedReversals();

    expect(result).toEqual({ success: true, confirmed: [1001, 1005] });
  });

  it('returns an empty confirmed list when nothing has been tracked yet', async () => {
    prisma.paymentReversal.findMany.mockResolvedValue([]);

    const result = await controller.getConfirmedReversals();

    expect(result).toEqual({ success: true, confirmed: [] });
  });
});
