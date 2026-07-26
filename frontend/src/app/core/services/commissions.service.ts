import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgeSegment, CancellationReason, CommissionReviewRecord } from '../models/commission.model';

@Injectable({ providedIn: 'root' })
export class CommissionsService {
  private readonly url = '/api/v1/commissions';

  constructor(private http: HttpClient) {}

  getReview(filter: { seller?: string; product?: string }): Observable<CommissionReviewRecord[]> {
    let params = new HttpParams();
    if (filter.seller?.trim()) params = params.set('seller', filter.seller.trim());
    if (filter.product?.trim()) params = params.set('product', filter.product.trim());
    return this.http.get<CommissionReviewRecord[]>(`${this.url}/review`, { params });
  }

  getCancellationReasons(): Observable<CancellationReason[]> {
    return this.http.get<CancellationReason[]>(`${this.url}/cancellation-reasons`);
  }

  cancelRecord(
    id: number,
    body: { idCancellationReason: number; notes?: string },
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.url}/${id}/cancel`, body);
  }

  recalculateOne(id: number): Observable<{ success: boolean; sellerAmount: number; affiliateAmount: number | null; agencyAmount: number | null }> {
    return this.http.post<{ success: boolean; sellerAmount: number; affiliateAmount: number | null; agencyAmount: number | null }>(`${this.url}/${id}/recalculate`, {});
  }

  recalculateAllIngested(): Observable<{ found: number; updated: number; skipped: number }> {
    return this.http.post<{ found: number; updated: number; skipped: number }>(`${this.url}/recalculate-ingested`, {});
  }
}
