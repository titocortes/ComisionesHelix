import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, ClientListResponse, Country } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly baseUrl = '/api/v1/clients';
  private readonly catalogsUrl = '/api/v1/catalogs';

  constructor(private http: HttpClient) {}

  getAll(params: Record<string, any> = {}): Observable<ClientListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });
    return this.http.get<ClientListResponse>(this.baseUrl, { params: httpParams });
  }

  getOne(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.baseUrl, data);
  }

  update(id: number, data: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.catalogsUrl}/countries`);
  }
}
