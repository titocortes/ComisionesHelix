export interface CommissionReviewRecord {
  idCommissionRecord: number;
  helixPaymentId: number;
  coverageStartDate: string;
  coverageEndDate: string;
  authorizationDate: string;
  status: string;
  clientName: string | null;
  productName: string | null;
  sellerName: string | null;
  affiliateName: string | null;
  agencyName: string | null;
  sellerAmount: number;
  affiliateAmount: number | null;
  agencyAmount: number | null;
  invoiceAmount: number;
  daysElapsed: number;
}

export interface CancellationReason {
  idCancellationReason: number;
  reason: string;
}

export type AgeSegment = 'new' | 'in_progress' | 'upcoming_authorization';
