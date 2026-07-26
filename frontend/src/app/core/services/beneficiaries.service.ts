import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BeneficiaryRecord {
  idBeneficiary: number;
  name: string;
  email: string | null;
  beneficiaryType: 'seller' | 'affiliate' | 'agency';
  helixEntityId: number;
  qboVendorId: string | null;
  active: boolean;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface HelixPublicAgency {
  idAgency: number;
  agencyName: string;
  reportEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface HelixPublicAffiliate {
  idAffiliate: number;
  idAgency: number;
  affiliateName: string;
  reportEmail: string;
  agency: {
    idAgency: number;
    agencyName: string;
    reportEmail: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeneficiaryDto {
  name: string;
  email?: string;
  beneficiaryType: 'seller' | 'affiliate' | 'agency';
  helixEntityId: number;
}

export interface UpdateBeneficiaryDto {
  name?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class BeneficiariesService {
  private readonly url = '/api/v1/beneficiaries';

  constructor(private http: HttpClient) {}

  list(type?: 'agency' | 'affiliate' | 'seller'): Observable<BeneficiaryRecord[]> {
    const params: Record<string, string> = {};
    if (type) params['type'] = type;
    return this.http.get<BeneficiaryRecord[]>(this.url, { params });
  }

  getHelixAgencies(): Observable<HelixPublicAgency[]> {
    return this.http.get<HelixPublicAgency[]>(`${this.url}/helix/agencies`);
  }

  getHelixAllAffiliates(): Observable<HelixPublicAffiliate[]> {
    return this.http.get<HelixPublicAffiliate[]>(`${this.url}/helix/affiliates`);
  }

  getHelixAffiliates(idAgency: number): Observable<HelixPublicAffiliate[]> {
    return this.http.get<HelixPublicAffiliate[]>(`${this.url}/helix/agencies/${idAgency}/affiliates`);
  }

  create(dto: CreateBeneficiaryDto): Observable<BeneficiaryRecord> {
    return this.http.post<BeneficiaryRecord>(this.url, dto);
  }

  update(id: number, dto: UpdateBeneficiaryDto): Observable<BeneficiaryRecord> {
    return this.http.put<BeneficiaryRecord>(`${this.url}/${id}`, dto);
  }

  deactivate(id: number): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.url}/${id}/deactivate`, {});
  }
}
