import { jest } from '@jest/globals';
import { AuthorizationCron } from './authorization.cron.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('AuthorizationCron', () => {
  let prisma: {
    cronExecutionLog: { create: jest.Mock; update: jest.Mock };
    commissionRecord: { findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    commissionStateHistory: { create: jest.Mock };
  };
  let cron: AuthorizationCron;

  beforeEach(() => {
    prisma = {
      cronExecutionLog: {
        create: jest.fn().mockResolvedValue({ idCronLog: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      commissionRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      commissionStateHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    cron = new AuthorizationCron(prisma as unknown as PrismaService);
  });

  it('only authorizes ingested records whose affiliate and agency amounts are resolved (not null)', async () => {
    await cron.authorizeEligibleCommissions();

    const where = prisma.commissionRecord.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ingested');
    expect(where.affiliateAmount).toEqual({ not: null });
    expect(where.agencyAmount).toEqual({ not: null });
  });

  it('holds back records past their authorization date with an unresolved rate, without authorizing them', async () => {
    prisma.commissionRecord.findMany.mockResolvedValue([]); // none eligible (both amounts unresolved)
    prisma.commissionRecord.count.mockResolvedValue(3); // 3 held back

    await cron.authorizeEligibleCommissions();

    expect(prisma.commissionRecord.update).not.toHaveBeenCalled();
    expect(prisma.cronExecutionLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'success', recordsProcessed: 0 }) }),
    );
  });

  it('authorizes eligible records with resolved amounts and records state history', async () => {
    prisma.commissionRecord.findMany.mockResolvedValue([
      { idCommissionRecord: 10, authorizationDate: new Date(2026, 0, 1) },
    ]);

    await cron.authorizeEligibleCommissions();

    expect(prisma.commissionRecord.update).toHaveBeenCalledWith({
      where: { idCommissionRecord: 10 },
      data: { status: 'authorized' },
    });
    expect(prisma.commissionStateHistory.create).toHaveBeenCalledTimes(1);
  });
});
