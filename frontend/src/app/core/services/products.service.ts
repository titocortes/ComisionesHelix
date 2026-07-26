import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DependentDiscount, ProductWithRate } from '../models/product.model';

export interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
  total: number;
}

export interface CreateProductRequest {
  productName: string;
  shortName: string;
  helixProductId?: number;
}

export interface UpsertRateRequest {
  monthlySellerAmount: number;
  monthlyAffiliateAmount: number;
  monthlyAgencyAmount: number;
}

export interface UpsertDiscountRequest {
  dependentNumber: number;
  discountPercentage: number;
  orMore?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly url = '/api/v1/products';

  constructor(private http: HttpClient) {}

  list(): Observable<ProductWithRate[]> {
    return this.http.get<ProductWithRate[]>(this.url);
  }

  syncFromHelix(): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.url}/sync`, {});
  }

  create(body: CreateProductRequest): Observable<ProductWithRate> {
    return this.http.post<ProductWithRate>(this.url, body);
  }

  update(idProduct: number, body: Partial<CreateProductRequest & { active: boolean }>): Observable<ProductWithRate> {
    return this.http.patch<ProductWithRate>(`${this.url}/${idProduct}`, body);
  }

  upsertRate(idProduct: number, body: UpsertRateRequest): Observable<{ idCommissionRate: number } & UpsertRateRequest> {
    return this.http.put<any>(`${this.url}/${idProduct}/commission-rate`, body);
  }

  getDiscounts(idProduct: number): Observable<DependentDiscount[]> {
    return this.http.get<DependentDiscount[]>(`${this.url}/${idProduct}/discounts`);
  }

  createDiscount(idProduct: number, body: UpsertDiscountRequest): Observable<DependentDiscount> {
    return this.http.post<DependentDiscount>(`${this.url}/${idProduct}/discounts`, body);
  }

  updateDiscount(idProduct: number, idDiscount: number, body: UpsertDiscountRequest): Observable<DependentDiscount> {
    return this.http.patch<DependentDiscount>(`${this.url}/${idProduct}/discounts/${idDiscount}`, body);
  }

  deleteDiscount(idProduct: number, idDiscount: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.url}/${idProduct}/discounts/${idDiscount}`);
  }
}
