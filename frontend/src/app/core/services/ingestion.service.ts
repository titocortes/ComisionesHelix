import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IngestionResult {
  success: boolean;
  invoicesReceived: number;
  processed: number;
  failed: number;
  executedAt: string;
}

@Injectable({ providedIn: 'root' })
export class IngestionService {
  private readonly url = '/api/v1/ingestion';

  constructor(private http: HttpClient) {}

  trigger(): Observable<IngestionResult> {
    return this.http.post<IngestionResult>(`${this.url}/trigger`, {});
  }
}
