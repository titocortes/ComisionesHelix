import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';

import { CommissionsService } from '../../core/services/commissions.service';
import {
  AgeSegment,
  CancellationReason,
  CommissionReviewRecord,
} from '../../core/models/commission.model';

interface AgeOption {
  label: string;
  value: AgeSegment | null;
}

export interface BeneficiarySummary {
  name: string;
  type: 'Vendedor' | 'Afiliado' | 'Agencia';
  typeKey: 'seller' | 'affiliate' | 'agency';
  invoiceCount: number;
  totalAmount: number;
  records: CommissionReviewRecord[];
}

interface TypeOption {
  label: string;
  value: 'all' | 'seller' | 'affiliate' | 'agency';
}

@Component({
  selector: 'app-commission-review',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, CurrencyPipe, DatePipe,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, SelectButtonModule,
    TagModule, DialogModule, SelectModule, TextareaModule, ToastModule,
    TabsModule, DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './commission-review.component.html',
  styleUrl: './commission-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommissionReviewComponent implements OnInit {
  records: CommissionReviewRecord[] = [];
  filteredRecords: CommissionReviewRecord[] = [];
  loading = false;

  activeTab = '0';

  // ── Tab 1 filters ──────────────────────────────────────────────────────────
  sellerFilter = '';
  productFilter = '';
  ageSegment: AgeSegment | null = null;

  readonly ageOptions: AgeOption[] = [
    { label: 'Todos',       value: null },
    { label: '1–15 días',  value: 'new' },
    { label: '16–35 días', value: 'in_progress' },
    { label: '36–45 días', value: 'upcoming_authorization' },
  ];

  counts = { new: 0, in_progress: 0, upcoming_authorization: 0 };

  // ── Tab 2 — beneficiary summary ────────────────────────────────────────────
  beneficiarySummary: BeneficiarySummary[]    = [];
  filteredBeneficiaries: BeneficiarySummary[] = [];
  beneficiaryTypeFilter: 'all' | 'seller' | 'affiliate' | 'agency' = 'all';

  readonly typeOptions: TypeOption[] = [
    { label: 'Todos',     value: 'all'       },
    { label: 'Vendedor',  value: 'seller'    },
    { label: 'Afiliado',  value: 'affiliate' },
    { label: 'Agencia',   value: 'agency'    },
  ];

  // ── Invoice detail modal ───────────────────────────────────────────────────
  detailVisible  = false;
  selectedRecord: CommissionReviewRecord | null = null;

  // ── Beneficiary drill-down modal ───────────────────────────────────────────
  beneficiaryDetailVisible = false;
  selectedBeneficiary: BeneficiarySummary | null = null;

  // ── Cancel dialog ──────────────────────────────────────────────────────────
  cancelVisible = false;
  activeRecord: CommissionReviewRecord | null = null;
  cancellationReasons: CancellationReason[] = [];
  selectedReasonId: number | null = null;
  cancelNotes = '';
  cancelSaving = false;
  private reasonsLoaded = false;

  // ── Recalculate ────────────────────────────────────────────────────────────
  recalculatingId: number | null = null;
  recalculateAllVisible = false;
  recalculatingAll = false;

  constructor(
    private commissionsService: CommissionsService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadRecords(): void {
    this.loading = true;
    this.commissionsService
      .getReview({ seller: this.sellerFilter, product: this.productFilter })
      .subscribe({
        next: data => {
          this.records = data;
          this.applyFilters();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los registros.',
          });
          this.cdr.markForCheck();
        },
      });
  }

  // ── Tab 1 actions ──────────────────────────────────────────────────────────

  selectSegment(segment: AgeSegment | null): void {
    this.ageSegment = this.ageSegment === segment ? null : segment;
    this.applyFilters();
  }

  onSegmentButtonChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.sellerFilter = '';
    this.productFilter = '';
    this.ageSegment = null;
    this.loadRecords();
  }

  openDetail(record: CommissionReviewRecord): void {
    this.selectedRecord = record;
    this.detailVisible  = true;
  }

  // ── Tab 2 actions ──────────────────────────────────────────────────────────

  onBeneficiaryTypeChange(): void {
    this.filterBeneficiaries();
  }

  openBeneficiaryDetail(b: BeneficiarySummary): void {
    this.selectedBeneficiary     = b;
    this.beneficiaryDetailVisible = true;
  }

  amountFor(record: CommissionReviewRecord, typeKey: string): number {
    switch (typeKey) {
      case 'seller':    return record.sellerAmount;
      case 'affiliate': return record.affiliateAmount ?? 0;
      case 'agency':    return record.agencyAmount ?? 0;
      default:          return 0;
    }
  }

  // ── Cancel dialog ──────────────────────────────────────────────────────────

  openCancelDialog(record: CommissionReviewRecord, event: Event): void {
    event.stopPropagation();
    this.activeRecord     = record;
    this.selectedReasonId = null;
    this.cancelNotes      = '';
    this.cancelVisible    = true;

    if (!this.reasonsLoaded) {
      this.commissionsService.getCancellationReasons().subscribe(reasons => {
        this.cancellationReasons = reasons;
        this.reasonsLoaded       = true;
        this.cdr.markForCheck();
      });
    }
  }

  closeCancelDialog(): void {
    this.cancelVisible = false;
    this.activeRecord  = null;
  }

  confirmCancel(): void {
    if (!this.activeRecord || !this.selectedReasonId) return;

    this.cancelSaving = true;
    this.commissionsService
      .cancelRecord(this.activeRecord.idCommissionRecord, {
        idCancellationReason: this.selectedReasonId,
        notes: this.cancelNotes || undefined,
      })
      .subscribe({
        next: () => {
          this.cancelSaving  = false;
          this.cancelVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Cancelado',
            detail:  'El registro de comisión fue cancelado.',
            life:    4000,
          });
          this.cdr.markForCheck();
          this.loadRecords();
        },
        error: () => {
          this.cancelSaving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:  'No se pudo cancelar el registro. Intenta de nuevo.',
            life:    5000,
          });
          this.cdr.markForCheck();
        },
      });
  }

  // ── Recalculate actions ────────────────────────────────────────────────────

  recalculateRecord(record: CommissionReviewRecord, event: Event): void {
    event.stopPropagation();
    this.recalculatingId = record.idCommissionRecord;
    this.commissionsService.recalculateOne(record.idCommissionRecord).subscribe({
      next: res => {
        this.recalculatingId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Recalculado',
          detail: `Invoice #${record.helixPaymentId}: vendedor $${res.sellerAmount.toFixed(2)}, afiliado $${(res.affiliateAmount ?? 0).toFixed(2)}, agencia $${(res.agencyAmount ?? 0).toFixed(2)}`,
          life: 6000,
        });
        this.loadRecords();
        this.cdr.markForCheck();
      },
      error: () => {
        this.recalculatingId = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo recalcular el registro.',
        });
        this.cdr.markForCheck();
      },
    });
  }

  openRecalculateAllDialog(): void {
    this.recalculateAllVisible = true;
  }

  confirmRecalculateAll(): void {
    this.recalculatingAll = true;
    this.commissionsService.recalculateAllIngested().subscribe({
      next: res => {
        this.recalculatingAll  = false;
        this.recalculateAllVisible = false;
        this.messageService.add({
          severity: res.skipped > 0 ? 'warn' : 'success',
          summary: 'Recálculo completado',
          detail: `${res.updated} actualizados, ${res.skipped} omitidos de ${res.found} registros ingested.`,
          life: 7000,
        });
        this.loadRecords();
        this.cdr.markForCheck();
      },
      error: () => {
        this.recalculatingAll = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo completar el recálculo masivo.',
        });
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getTotal(r: CommissionReviewRecord): number {
    return r.sellerAmount + (r.affiliateAmount ?? 0) + (r.agencyAmount ?? 0);
  }

  getDaysSeverity(days: number): 'success' | 'warn' | 'danger' {
    if (days <= 15) return 'success';
    if (days <= 35) return 'warn';
    return 'danger';
  }

  getDaysLabel(days: number): string {
    return days === 1 ? '1 día' : `${days} días`;
  }

  getTypeSeverity(typeKey: string): 'success' | 'info' | 'warn' {
    if (typeKey === 'seller')    return 'success';
    if (typeKey === 'affiliate') return 'info';
    return 'warn';
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private applyFilters(): void {
    this.counts = {
      new:                    this.records.filter(r => r.daysElapsed <= 15).length,
      in_progress:            this.records.filter(r => r.daysElapsed >= 16 && r.daysElapsed <= 35).length,
      upcoming_authorization: this.records.filter(r => r.daysElapsed >= 36).length,
    };

    this.filteredRecords = !this.ageSegment
      ? this.records
      : this.records.filter(r => {
          switch (this.ageSegment) {
            case 'new':                    return r.daysElapsed <= 15;
            case 'in_progress':            return r.daysElapsed >= 16 && r.daysElapsed <= 35;
            case 'upcoming_authorization': return r.daysElapsed >= 36;
            default:                       return true;
          }
        });

    this.computeBeneficiarySummary();
  }

  private computeBeneficiarySummary(): void {
    const map = new Map<string, BeneficiarySummary>();

    for (const r of this.records) {
      if (r.sellerName) {
        const key = `seller:${r.sellerName}`;
        if (!map.has(key)) {
          map.set(key, { name: r.sellerName, type: 'Vendedor', typeKey: 'seller', invoiceCount: 0, totalAmount: 0, records: [] });
        }
        const e = map.get(key)!;
        e.invoiceCount++;
        e.totalAmount += r.sellerAmount;
        e.records.push(r);
      }
      if (r.affiliateName) {
        const key = `affiliate:${r.affiliateName}`;
        if (!map.has(key)) {
          map.set(key, { name: r.affiliateName, type: 'Afiliado', typeKey: 'affiliate', invoiceCount: 0, totalAmount: 0, records: [] });
        }
        const e = map.get(key)!;
        e.invoiceCount++;
        e.totalAmount += r.affiliateAmount ?? 0;
        e.records.push(r);
      }
      if (r.agencyName) {
        const key = `agency:${r.agencyName}`;
        if (!map.has(key)) {
          map.set(key, { name: r.agencyName, type: 'Agencia', typeKey: 'agency', invoiceCount: 0, totalAmount: 0, records: [] });
        }
        const e = map.get(key)!;
        e.invoiceCount++;
        e.totalAmount += r.agencyAmount ?? 0;
        e.records.push(r);
      }
    }

    this.beneficiarySummary = Array.from(map.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    this.filterBeneficiaries();
  }

  private filterBeneficiaries(): void {
    this.filteredBeneficiaries = this.beneficiaryTypeFilter === 'all'
      ? this.beneficiarySummary
      : this.beneficiarySummary.filter(b => b.typeKey === this.beneficiaryTypeFilter);
  }
}
