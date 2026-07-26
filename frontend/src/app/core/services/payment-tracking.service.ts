import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaymentBatch,
  PaymentBeneficiarySummary,
  PaymentTrackingRecord,
} from '../models/payment-tracking.model';

@Injectable({ providedIn: 'root' })
export class PaymentTrackingService {
  private readonly base = '/api/v1/commission-payments';

  constructor(private http: HttpClient) {}

  getRecords(filters: {
    coverageMonth?: string;
    status?: string;
    beneficiary?: string;
  }): Observable<PaymentTrackingRecord[]> {
    let params = new HttpParams();
    if (filters.coverageMonth) params = params.set('coverageMonth', filters.coverageMonth);
    if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters.beneficiary?.trim()) params = params.set('beneficiary', filters.beneficiary.trim());
    return this.http.get<PaymentTrackingRecord[]>(this.base, { params });
  }

  getBeneficiarySummary(filters: {
    coverageMonth?: string;
    type?: string;
  }): Observable<PaymentBeneficiarySummary[]> {
    let params = new HttpParams();
    if (filters.coverageMonth) params = params.set('coverageMonth', filters.coverageMonth);
    if (filters.type && filters.type !== 'all') params = params.set('type', filters.type);
    return this.http.get<PaymentBeneficiarySummary[]>(`${this.base}/beneficiary-summary`, { params });
  }

  getBatches(month?: string): Observable<PaymentBatch[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<PaymentBatch[]>(`${this.base}/batches`, { params });
  }

  getMonthCounts(): Observable<{ month: string; count: number }[]> {
    return this.http.get<{ month: string; count: number }[]>(`${this.base}/month-counts`);
  }

  retryPayment(idCommissionRecord: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/${idCommissionRecord}/retry`, {});
  }
}
