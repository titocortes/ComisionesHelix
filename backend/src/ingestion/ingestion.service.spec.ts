import { jest } from '@jest/globals';
import { IngestionService } from './ingestion.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CommissionCalculatorService } from './commission-calculator.service.js';

describe('IngestionService.deleteBatch', () => {
  let prisma: {
    cronExecutionLog: { findUnique: jest.Mock; findFirst: jest.Mock };
    payment: { findMany: jest.Mock; groupBy: jest.Mock; deleteMany: jest.Mock };
    commissionStateHistory: { deleteMany: jest.Mock };
    commissionRecord: { deleteMany: jest.Mock };
    paymentTrackingEvent: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: IngestionService;

  beforeEach(() => {
    prisma = {
      cronExecutionLog: { findUnique: jest.fn(), findFirst: jest.fn() },
      payment: { findMany: jest.fn(), groupBy: jest.fn(), deleteMany: jest.fn() },
      commissionStateHistory: { deleteMany: jest.fn() },
      commissionRecord: { deleteMany: jest.fn() },
      paymentTrackingEvent: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new IngestionService(
      prisma as unknown as PrismaService,
      {} as unknown as CommissionCalculatorService,
    );
  });

  it('throws NotFoundException when the batch does not exist', async () => {
    prisma.cronExecutionLog.findUnique.mockResolvedValue(null);

    await expect(service.deleteBatch(999)).rejects.toThrow('Batch 999 not found');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes payments whose commission records are all still ingested', async () => {
    prisma.cronExecutionLog.findUnique.mockResolvedValue({ idCronLog: 1 });
    prisma.payment.findMany.mockResolvedValue([
      { idPayment: 10, helixPaymentId: 100, commissionRecords: [{ status: 'ingested' }, { status: 'ingested' }] },
    ]);

    const result = await service.deleteBatch(1);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ idCronLog: 1, totalInBatch: 1, deleted: 1, skipped: [] });
  });

  it('never deletes a payment with any commission record past ingested (authorized/paid/etc) — reports it as skipped instead', async () => {
    prisma.cronExecutionLog.findUnique.mockResolvedValue({ idCronLog: 1 });
    prisma.payment.findMany.mockResolvedValue([
      { idPayment: 10, helixPaymentId: 100, commissionRecords: [{ status: 'ingested' }] }, // safe
      { idPayment: 11, helixPaymentId: 101, commissionRecords: [{ status: 'authorized' }] }, // blocked
      { idPayment: 12, helixPaymentId: 102, commissionRecords: [{ status: 'ingested' }, { status: 'paid' }] }, // blocked (mixed)
    ]);

    const result = await service.deleteBatch(1);

    expect(result.deleted).toBe(1);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.map((s) => s.idPayment).sort()).toEqual([11, 12]);

    // Only the deletable payment (10) should be in the delete transaction's filters
    const deleteManyCalls = prisma.commissionRecord.deleteMany.mock.calls[0] as unknown as [
      { where: { idPayment: { in: number[] } } },
    ];
    expect(deleteManyCalls[0].where.idPayment.in).toEqual([10]);
  });

  it('does not run a delete transaction at all when nothing in the batch is safely deletable', async () => {
    prisma.cronExecutionLog.findUnique.mockResolvedValue({ idCronLog: 1 });
    prisma.payment.findMany.mockResolvedValue([
      { idPayment: 11, helixPaymentId: 101, commissionRecords: [{ status: 'payment_sent' }] },
    ]);

    const result = await service.deleteBatch(1);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      idCronLog: 1,
      totalInBatch: 1,
      deleted: 0,
      skipped: [
        { idPayment: 11, helixPaymentId: 101, reason: "has commission record(s) already past 'ingested' (payment_sent)" },
      ],
    });
  });
});

describe('IngestionService.deleteLastBatch', () => {
  it('resolves the most recent ingestion batch and delegates to deleteBatch', async () => {
    const prisma = {
      cronExecutionLog: {
        findFirst: jest.fn().mockResolvedValue({ idCronLog: 42 }),
        findUnique: jest.fn().mockResolvedValue({ idCronLog: 42 }),
      },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    const service = new IngestionService(
      prisma as unknown as PrismaService,
      {} as unknown as CommissionCalculatorService,
    );

    const result = await service.deleteLastBatch();

    expect(prisma.cronExecutionLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cronType: 'ingestion' } }),
    );
    expect(result.idCronLog).toBe(42);
  });

  it('throws NotFoundException when there are no ingestion batches yet', async () => {
    const prisma = {
      cronExecutionLog: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new IngestionService(
      prisma as unknown as PrismaService,
      {} as unknown as CommissionCalculatorService,
    );

    await expect(service.deleteLastBatch()).rejects.toThrow('No ingestion batches found');
  });
});

describe('IngestionService.processReversedPayments', () => {
  let prisma: {
    payment: { findFirst: jest.Mock; update: jest.Mock };
    paymentReversal: { create: jest.Mock };
    commissionRecord: { update: jest.Mock };
    commissionStateHistory: { create: jest.Mock };
    commissionAdjustment: { create: jest.Mock };
  };
  let service: IngestionService;

  const reversal = {
    idPayment: 1001,
    previousPaymentStatus: 3,
    currentPaymentStatus: 1,
    reversedAt: '2026-07-20T14:32:00.000Z',
    reason: 'refund',
  };

  beforeEach(() => {
    prisma = {
      payment: { findFirst: jest.fn(), update: jest.fn() },
      paymentReversal: { create: jest.fn().mockResolvedValue({ idPaymentReversal: 500 }) },
      commissionRecord: { update: jest.fn() },
      commissionStateHistory: { create: jest.fn() },
      commissionAdjustment: { create: jest.fn() },
    };
    service = new IngestionService(
      prisma as unknown as PrismaService,
      {} as unknown as CommissionCalculatorService,
    );
  });

  it('reports "unmatched" and writes nothing when no local Payment exists for the helixPaymentId', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    const result = await service.processReversedPayments([reversal]);

    expect(result).toEqual({ tracked: 0, alreadyTracked: 0, unmatched: 1 });
    expect(prisma.paymentReversal.create).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('reports "alreadyTracked" and skips reprocessing when the Payment already has a reversal', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      idPayment: 10,
      reversal: { idPaymentReversal: 1 },
      commissionRecords: [],
    });

    const result = await service.processReversedPayments([reversal]);

    expect(result).toEqual({ tracked: 0, alreadyTracked: 1, unmatched: 0 });
    expect(prisma.paymentReversal.create).not.toHaveBeenCalled();
  });

  it('auto-cancels commission records still in ingested/authorized — no beneficiary was ever paid', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      idPayment: 10,
      reversal: null,
      commissionRecords: [
        { idCommissionRecord: 100, status: 'ingested' },
        { idCommissionRecord: 101, status: 'authorized' },
      ],
    });

    const result = await service.processReversedPayments([reversal]);

    expect(result).toEqual({ tracked: 1, alreadyTracked: 0, unmatched: 0 });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { idPayment: 10 },
      data: { paymentStatus: 1 },
    });
    expect(prisma.paymentReversal.create).toHaveBeenCalledWith({
      data: {
        idPayment: 10,
        previousPaymentStatus: 3,
        currentPaymentStatus: 1,
        reason: 'refund',
        helixReversedAt: new Date(reversal.reversedAt),
      },
    });
    expect(prisma.commissionRecord.update).toHaveBeenCalledTimes(2);
    expect(prisma.commissionRecord.update).toHaveBeenCalledWith({
      where: { idCommissionRecord: 100 },
      data: { status: 'reversed_in_helix' },
    });
    expect(prisma.commissionAdjustment.create).not.toHaveBeenCalled();
  });

  it('flags payment_sent records for manual review without changing their status', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      idPayment: 10,
      reversal: null,
      commissionRecords: [{ idCommissionRecord: 102, status: 'payment_sent' }],
    });

    await service.processReversedPayments([reversal]);

    expect(prisma.commissionRecord.update).toHaveBeenCalledWith({
      where: { idCommissionRecord: 102 },
      data: {
        flaggedForReview: true,
        reviewNotes: expect.stringContaining('BillPayment'),
      },
    });
  });

  it('creates a CommissionAdjustment per non-zero beneficiary line for records already paid', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      idPayment: 10,
      reversal: null,
      commissionRecords: [
        {
          idCommissionRecord: 103,
          status: 'paid',
          sellerAmount: { toNumber: () => 0 },
          affiliateAmount: { toNumber: () => 25.5 },
          agencyAmount: { toNumber: () => 0 },
          idSellerBeneficiary: 1,
          idAffiliateBeneficiary: 2,
          idAgencyBeneficiary: 3,
        },
      ],
    });

    await service.processReversedPayments([reversal]);

    expect(prisma.commissionAdjustment.create).toHaveBeenCalledTimes(1);
    expect(prisma.commissionAdjustment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idBeneficiary: 2,
        idCommissionRecord: 103,
        idPaymentReversal: 500,
        entityType: 'affiliate',
        amount: 25.5,
      }),
    });
    expect(prisma.commissionRecord.update).toHaveBeenCalledWith({
      where: { idCommissionRecord: 103 },
      data: expect.objectContaining({ status: 'reversed_after_payment', flaggedForReview: true }),
    });
  });

  it('processes multiple reversals and keeps counting even if one throws', async () => {
    prisma.payment.findFirst
      .mockResolvedValueOnce({ idPayment: 10, reversal: null, commissionRecords: [] })
      .mockRejectedValueOnce(new Error('DB unavailable'));

    const result = await service.processReversedPayments([
      reversal,
      { ...reversal, idPayment: 1002 },
    ]);

    expect(result).toEqual({ tracked: 1, alreadyTracked: 0, unmatched: 1 });
  });
});
