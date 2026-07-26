import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { PaymentTrackingService } from '../../core/services/payment-tracking.service';
import type {
  PaymentBatch,
  PaymentBeneficiarySummary,
  PaymentStatus,
  PaymentTrackingRecord,
  PaymentTrackingStats,
} from '../../core/models/payment-tracking.model';

interface StatusOption {
  label: string;
  value: string | null;
}

interface TypeOption {
  label: string;
  value: string;
}

interface MonthOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-payment-tracking',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, CurrencyPipe, DatePipe,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, SelectButtonModule, SelectModule,
    TagModule, DialogModule, ToastModule, TabsModule, DividerModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './payment-tracking.component.html',
  styleUrl: './payment-tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTrackingComponent implements OnInit {
  // ── State ──────────────────────────────────────────────────────────────────
  allRecords: PaymentTrackingRecord[] = [];
  filteredRecords: PaymentTrackingRecord[] = [];
  beneficiarySummary: PaymentBeneficiarySummary[] = [];
  filteredBeneficiaries: PaymentBeneficiarySummary[] = [];
  batches: PaymentBatch[] = [];

  loading = false;
  loadingBeneficiaries = false;
  loadingBatches = false;

  activeTab = '0';

  // ── Filters ────────────────────────────────────────────────────────────────
  selectedMonth: string | null = null;
  batchMonth: string | null = null;
  statusFilter: PaymentStatus | 'all' | null = null;
  beneficiaryFilter = '';
  beneficiaryTypeFilter = 'all';

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: PaymentTrackingStats = {
    authorized:  { count: 0, total: 0 },
    paymentSent: { count: 0, total: 0 },
    paid:        { count: 0, total: 0 },
    rejected:    { count: 0, total: 0 },
  };

  // ── Detail modal ───────────────────────────────────────────────────────────
  detailVisible = false;
  selectedRecord: PaymentTrackingRecord | null = null;

  // ── Retry confirmation ─────────────────────────────────────────────────────
  retryVisible = false;
  retryRecord: PaymentTrackingRecord | null = null;
  retrying = false;

  // ── Month counts (loaded async, used in dropdown items) ───────────────────
  monthCounts = new Map<string, number>();

  // ── Static options ─────────────────────────────────────────────────────────
  readonly monthOptions: MonthOption[] = this.buildMonthOptions();
  readonly batchMonthOptions: MonthOption[] = this.monthOptions;

  readonly statusOptions: StatusOption[] = [
    { label: 'Todos',          value: null            },
    { label: 'Autorizados',    value: 'authorized'    },
    { label: 'Env. a QBO',     value: 'payment_sent'  },
    { label: 'Pagados',        value: 'paid'          },
    { label: 'Rechazados',     value: 'rejected'      },
  ];

  readonly typeOptions: TypeOption[] = [
    { label: 'Todos',     value: 'all'       },
    { label: 'Vendedor',  value: 'seller'    },
    { label: 'Afiliado',  value: 'affiliate' },
    { label: 'Agencia',   value: 'agency'    },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  constructor(
    private trackingService: PaymentTrackingService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.selectedMonth = null;
    this.loadRecords();
    this.loadMonthCounts();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadRecords(): void {
    this.loading = true;
    this.trackingService
      .getRecords({
        coverageMonth: this.selectedMonth ?? undefined,
        status: this.statusFilter ?? undefined,
        beneficiary: this.beneficiaryFilter || undefined,
      })
      .subscribe({
        next: data => {
          this.allRecords = data;
          this.applyFilters();
          this.computeStats();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.toast('error', 'Error', 'No se pudieron cargar los registros de pago.');
          this.cdr.markForCheck();
        },
      });
  }

  loadMonthCounts(): void {
    this.trackingService.getMonthCounts().subscribe({
      next: counts => {
        this.monthCounts = new Map(counts.map(c => [c.month, c.count]));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  loadBeneficiarySummary(): void {
    this.loadingBeneficiaries = true;
    this.trackingService
      .getBeneficiarySummary({ coverageMonth: this.selectedMonth ?? undefined })
      .subscribe({
        next: data => {
          this.beneficiarySummary = data;
          this.filterBeneficiaries();
          this.loadingBeneficiaries = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingBeneficiaries = false;
          this.toast('error', 'Error', 'No se pudo cargar el resumen de beneficiarios.');
          this.cdr.markForCheck();
        },
      });
  }

  loadBatches(): void {
    this.loadingBatches = true;
    this.trackingService.getBatches(this.batchMonth ?? undefined).subscribe({
      next: data => {
        this.batches = data;
        this.loadingBatches = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingBatches = false;
        this.toast('error', 'Error', 'No se pudieron cargar los batches de pago.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Filter & navigation events ─────────────────────────────────────────────

  onMonthChange(): void {
    this.loadRecords();
    if (this.activeTab === '1') this.loadBeneficiarySummary();
  }

  onBatchMonthChange(): void {
    this.loadBatches();
  }

  onTabChange(tab: string | number | undefined): void {
    const t = String(tab ?? '0');
    this.activeTab = t;
    if (t === '1' && this.beneficiarySummary.length === 0) this.loadBeneficiarySummary();
    if (t === '2' && this.batches.length === 0) {
      if (!this.batchMonth) this.batchMonth = this.selectedMonth;
      this.loadBatches();
    }
  }

  setStatusFilter(status: PaymentStatus | null): void {
    this.statusFilter = this.statusFilter === status ? null : status;
    this.applyFilters();
  }

  onSearchKeyEnter(): void {
    this.loadRecords();
  }

  clearFilters(): void {
    this.beneficiaryFilter = '';
    this.statusFilter = null;
    this.loadRecords();
  }

  onBeneficiaryTypeChange(): void {
    this.filterBeneficiaries();
  }

  // ── Detail / retry dialogs ─────────────────────────────────────────────────

  openDetail(record: PaymentTrackingRecord): void {
    this.selectedRecord = record;
    this.detailVisible = true;
  }

  openRetry(record: PaymentTrackingRecord, event: Event): void {
    event.stopPropagation();
    this.retryRecord = record;
    this.retryVisible = true;
  }

  confirmRetry(): void {
    if (!this.retryRecord) return;
    this.retrying = true;
    this.trackingService.retryPayment(this.retryRecord.idCommissionRecord).subscribe({
      next: () => {
        this.retrying = false;
        this.retryVisible = false;
        this.toast('success', 'Reintento enviado', 'El pago fue reenviado a QuickBooks.');
        this.cdr.markForCheck();
        this.loadRecords();
      },
      error: () => {
        this.retrying = false;
        this.toast('error', 'Error', 'No se pudo reintentar el pago. Intenta de nuevo.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    switch (status) {
      case 'authorized':   return 'Autorizado';
      case 'payment_sent': return 'Enviado a QBO';
      case 'paid':         return 'Pagado';
      case 'rejected':     return 'Rechazado';
      default:             return status;
    }
  }

  getStatusSeverity(status: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
    switch (status) {
      case 'authorized':   return 'info';
      case 'payment_sent': return 'warn';
      case 'paid':         return 'success';
      case 'rejected':     return 'danger';
      default:             return 'secondary';
    }
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' {
    if (type === 'seller')    return 'success';
    if (type === 'affiliate') return 'info';
    return 'warn';
  }

  getTypeLabel(type: string): string {
    if (type === 'seller')    return 'Vendedor';
    if (type === 'affiliate') return 'Afiliado';
    return 'Agencia';
  }

  getBatchStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'completed':   return 'success';
      case 'processing':  return 'warn';
      case 'failed':      return 'danger';
      default:            return 'secondary';
    }
  }

  getBatchStatusLabel(status: string): string {
    switch (status) {
      case 'completed':  return 'Completado';
      case 'processing': return 'Procesando';
      case 'failed':     return 'Fallido';
      default:           return status;
    }
  }

  getItemStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'paid':          return 'success';
      case 'payment_sent':  return 'warn';
      case 'rejected':      return 'danger';
      case 'pending_qbo':   return 'info';
      default:              return 'secondary';
    }
  }

  getItemStatusLabel(status: string): string {
    switch (status) {
      case 'paid':         return 'Pagado';
      case 'payment_sent': return 'Env. a QBO';
      case 'rejected':     return 'Rechazado';
      case 'pending_qbo':  return 'Pendiente QBO';
      default:             return status;
    }
  }

  get top3Agencies(): { name: string; total: number }[] {
    const map = new Map<string, number>();
    for (const r of this.allRecords) {
      if (r.agencyName) map.set(r.agencyName, (map.get(r.agencyName) ?? 0) + r.agencyAmount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, total]) => ({ name, total }));
  }

  get top3Affiliates(): { name: string; total: number }[] {
    const map = new Map<string, number>();
    for (const r of this.allRecords) {
      if (r.affiliateName) map.set(r.affiliateName, (map.get(r.affiliateName) ?? 0) + r.affiliateAmount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, total]) => ({ name, total }));
  }

  beneficiarySummaryTotal(b: PaymentBeneficiarySummary): number {
    return b.totalAuthorized + b.totalPaymentSent + b.totalPaid + b.totalRejected;
  }

  batchBeneficiaryCount(batch: PaymentBatch): number {
    return batch.batchItems.length;
  }

  // ── Internal (also called from template via ngModelChange) ────────────────

  applyFilters(): void {
    this.filteredRecords = this.statusFilter
      ? this.allRecords.filter(r => r.status === this.statusFilter)
      : this.allRecords;
  }

  private computeStats(): void {
    this.stats = {
      authorized:  { count: 0, total: 0 },
      paymentSent: { count: 0, total: 0 },
      paid:        { count: 0, total: 0 },
      rejected:    { count: 0, total: 0 },
    };
    for (const r of this.allRecords) {
      switch (r.status) {
        case 'authorized':
          this.stats.authorized.count++;
          this.stats.authorized.total += r.totalAmount;
          break;
        case 'payment_sent':
          this.stats.paymentSent.count++;
          this.stats.paymentSent.total += r.totalAmount;
          break;
        case 'paid':
          this.stats.paid.count++;
          this.stats.paid.total += r.totalAmount;
          break;
        case 'rejected':
          this.stats.rejected.count++;
          this.stats.rejected.total += r.totalAmount;
          break;
      }
    }
  }

  private filterBeneficiaries(): void {
    this.filteredBeneficiaries =
      this.beneficiaryTypeFilter === 'all'
        ? this.beneficiarySummary
        : this.beneficiarySummary.filter(b => b.type === this.beneficiaryTypeFilter);
  }

  private buildMonthOptions(): MonthOption[] {
    const opts: MonthOption[] = [];
    const now = new Date();
    for (let i = -11; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d
        .toLocaleString('es-MX', { month: 'long', year: 'numeric' })
        .replace(/^\w/, c => c.toUpperCase());
      opts.push({ label, value });
    }
    return opts.reverse();
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}
