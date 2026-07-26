export type PaymentStatus = 'authorized' | 'payment_sent' | 'paid' | 'rejected';
export type BeneficiaryType = 'seller' | 'affiliate' | 'agency';

export interface PaymentStateHistoryEntry {
  idStateHistory: number;
  fromStatus: string;
  toStatus: string;
  changedByUserId?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface PaymentBeneficiaryRef {
  idBeneficiary: number;
  name: string;
  beneficiaryType: BeneficiaryType;
}

export interface PaymentTrackingRecord {
  idCommissionRecord: number;
  helixPaymentId: number;
  invoiceAmount: number;
  paymentDate: string;
  clientName: string | null;
  productName: string | null;
  sellerName: string | null;
  affiliateName: string | null;
  agencyName: string | null;
  coverageStartDate: string;
  coverageEndDate: string;
  authorizationDate: string;
  sellerAmount: number;
  affiliateAmount: number;
  agencyAmount: number;
  totalAmount: number;
  status: PaymentStatus;
  rejectionReason?: string | null;
  sellerBeneficiary?: PaymentBeneficiaryRef | null;
  affiliateBeneficiary?: PaymentBeneficiaryRef | null;
  agencyBeneficiary?: PaymentBeneficiaryRef | null;
  stateHistory: PaymentStateHistoryEntry[];
  paymentBatch?: {
    idPaymentBatch: number;
    processedAt: string;
    status: string;
    totalAmount: number;
  } | null;
  qboBillPaymentId?: string | null;
  qboPaidAt?: string | null;
}

export interface PaymentBeneficiarySummary {
  idBeneficiary: number;
  name: string;
  type: BeneficiaryType;
  qboVendorId?: string | null;
  totalAuthorized: number;
  totalPaymentSent: number;
  totalPaid: number;
  totalRejected: number;
  invoiceCount: number;
  commissionRecordIds: number[];
}

export interface PaymentBatchItem {
  idPaymentBatchItem: number;
  idBeneficiary: number;
  beneficiaryName: string;
  beneficiaryType: BeneficiaryType;
  totalAmount: number;
  qboBillPaymentId?: string | null;
  status: string;
  rejectionReason?: string | null;
  paidAt?: string | null;
  commissionCount: number;
}

export interface PaymentBatch {
  idPaymentBatch: number;
  processedAt: string;
  status: string;
  totalAmount: number;
  batchItems: PaymentBatchItem[];
}

export interface PaymentTrackingStats {
  authorized: { count: number; total: number };
  paymentSent: { count: number; total: number };
  paid: { count: number; total: number };
  rejected: { count: number; total: number };
}
