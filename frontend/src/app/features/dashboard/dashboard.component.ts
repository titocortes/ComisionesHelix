import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { DashboardService } from '../../core/services/dashboard.service';
import type {
  DashboardSummary,
  TopEntity,
  TopProduct,
  TopClient,
} from '../../core/models/dashboard.model';

interface RankingModeOption { label: string; value: 'historic' | 'nextCut' }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe,
    ButtonModule, TagModule, SelectButtonModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  @ViewChild('failuresSection') failuresSectionRef?: ElementRef<HTMLElement>;

  summary: DashboardSummary | null = null;
  loading  = false;
  hasError = false;

  rankingMode: 'historic' | 'nextCut' = 'historic';
  readonly rankingModeOptions: RankingModeOption[] = [
    { label: 'Histórico',      value: 'historic' },
    { label: 'Próximo corte',  value: 'nextCut'  },
  ];

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly messageService:   MessageService,
    private readonly cdr:              ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading  = true;
    this.hasError = false;
    this.dashboardService.getSummary().subscribe({
      next: data => {
        this.summary = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading  = false;
        this.hasError = true;
        this.messageService.add({
          severity: 'error',
          summary:  'Error',
          detail:   'No se pudo cargar el dashboard. Intenta de nuevo.',
          life:     5000,
        });
        this.cdr.markForCheck();
      },
    });
  }

  scrollToFailures(): void {
    if (!this.summary?.lastCutFailures.length) return;
    setTimeout(() => {
      this.failuresSectionRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  // ── Monthly trend helpers ──────────────────────────────────────────────────

  get maxTrendAmount(): number {
    const vals = this.summary?.monthlyTrend.map(m => m.paidAmount) ?? [0];
    return Math.max(...vals, 1);
  }

  trendBarWidth(amount: number): number {
    return (amount / this.maxTrendAmount) * 100;
  }

  formatMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d
      .toLocaleString('es-MX', { month: 'short', year: '2-digit' })
      .replace('.', '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  // ── Ranking helpers ────────────────────────────────────────────────────────

  rankingAmount(entity: TopEntity): number {
    return this.rankingMode === 'historic' ? entity.historicTotal : entity.nextCutAmount;
  }

  // ── Product bar helpers ────────────────────────────────────────────────────

  get maxProductAmount(): number {
    const vals = this.summary?.topProducts.map(p => p.totalAmount) ?? [0];
    return Math.max(...vals, 1);
  }

  productBarWidth(amount: number): number {
    return (amount / this.maxProductAmount) * 100;
  }

  get maxClientAmount(): number {
    const vals = this.summary?.topClients.map(c => c.totalAmount) ?? [0];
    return Math.max(...vals, 1);
  }

  clientBarWidth(amount: number): number {
    return (amount / this.maxClientAmount) * 100;
  }

  // ── Beneficiary type helpers ───────────────────────────────────────────────

  typeLabel(type: string): string {
    if (type === 'seller')    return 'Vendedor';
    if (type === 'affiliate') return 'Afiliado';
    return 'Agencia';
  }

  typeSeverity(type: string): 'success' | 'info' | 'warn' {
    if (type === 'seller')    return 'success';
    if (type === 'affiliate') return 'info';
    return 'warn';
  }

  // ── Pipeline helpers ───────────────────────────────────────────────────────

  get totalInFlight(): number {
    if (!this.summary) return 0;
    const { ingested, authorized, paymentSent } = this.summary.pipeline;
    return ingested.amount + authorized.amount + paymentSent.amount;
  }
}
