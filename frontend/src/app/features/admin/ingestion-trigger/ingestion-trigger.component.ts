import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';

import { IngestionService, IngestionResult } from '../../../core/services/ingestion.service';

@Component({
  selector: 'app-ingestion-trigger',
  standalone: true,
  imports: [
    CommonModule, DatePipe, TranslateModule,
    ButtonModule, CardModule, TagModule, MessageModule, DividerModule,
  ],
  templateUrl: './ingestion-trigger.component.html',
  styleUrl: './ingestion-trigger.component.scss',
})
export class IngestionTriggerComponent {
  running = false;
  result: IngestionResult | null = null;
  errorMessage: string | null = null;
  errorDetail: string | null = null;

  constructor(private ingestionService: IngestionService) {}

  trigger(): void {
    this.result = null;
    this.errorMessage = null;
    this.errorDetail = null;
    this.running = true;

    this.ingestionService.trigger().pipe(
      finalize(() => { this.running = false; })
    ).subscribe({
      next: res => {
        this.result = res;
      },
      error: err => {
        const body = err?.error;
        const msg  = body?.message;
        this.errorMessage = Array.isArray(msg)
          ? msg.join(' · ')
          : (typeof msg === 'string' ? msg : null)
            ?? err?.message
            ?? 'Error al conectar con el servidor. Intenta de nuevo.';
        this.errorDetail = body?.statusCode
          ? `HTTP ${body.statusCode}${body.error ? ' – ' + body.error : ''}`
          : (err?.status ? `HTTP ${err.status}` : null);
      },
    });
  }

  get hasFailures(): boolean {
    return (this.result?.failed ?? 0) > 0;
  }
}
