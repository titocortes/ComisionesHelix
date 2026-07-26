export interface PipelineStage {
  count:  number;
  amount: number;
}

export interface TopEntity {
  name:          string;
  historicTotal: number;
  nextCutAmount: number;
}

export interface TopProduct {
  productName: string;
  totalAmount: number;
  recordCount: number;
}

export interface TopClient {
  clientName:  string;
  totalAmount: number;
  recordCount: number;
}

export interface MonthlyTrendItem {
  month:      string;
  paidAmount: number;
}

export interface LastCutFailure {
  idPaymentBatchItem: number;
  beneficiaryName:    string;
  beneficiaryType:    string;
  amount:             number;
  rejectionReason:    string | null;
}

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
  monthlyTrend:  MonthlyTrendItem[];
  pipeline: {
    ingested:    PipelineStage;
    authorized:  PipelineStage;
    paymentSent: PipelineStage;
    paid:        PipelineStage;
  };
  topSellers:      TopEntity[];
  topAffiliates:   TopEntity[];
  topAgencies:     TopEntity[];
  topProducts:     TopProduct[];
  topClients:      TopClient[];
  lastCutFailures: LastCutFailure[];
}
