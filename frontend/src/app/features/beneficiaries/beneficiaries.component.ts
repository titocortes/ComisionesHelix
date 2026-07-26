import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService, MessageService } from 'primeng/api';

import {
  BeneficiariesService,
  BeneficiaryRecord,
  HelixPublicAffiliate,
  HelixPublicAgency,
} from '../../core/services/beneficiaries.service';

export interface AgencyRow {
  idAgency: number;
  agencyName: string;
  reportEmail: string;
  beneficiary: BeneficiaryRecord | null;
}

export interface AffiliateRow {
  idAffiliate: number;
  affiliateName: string;
  reportEmail: string;
  idAgency: number;
  agencyName: string;
  beneficiary: BeneficiaryRecord | null;
}

interface AgencyOption {
  label: string;
  value: number | null;
}

@Component({
  selector: 'app-beneficiaries',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    TagModule, DialogModule, SelectModule, ToastModule, TabsModule, DividerModule,
    ConfirmPopupModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './beneficiaries.component.html',
  styleUrl: './beneficiaries.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiariesComponent implements OnInit {
  activeTab = '0';
  loading = false;

  // ── Agencies tab ───────────────────────────────────────────────────────────
  agencyRows: AgencyRow[] = [];
  filteredAgencyRows: AgencyRow[] = [];
  agencySearch = '';

  // ── Affiliates tab ─────────────────────────────────────────────────────────
  affiliateRows: AffiliateRow[] = [];
  filteredAffiliateRows: AffiliateRow[] = [];
  affiliateSearch = '';
  affiliateAgencyFilter: number | null = null;
  agencyFilterOptions: AgencyOption[] = [];

  // ── Internal state ─────────────────────────────────────────────────────────
  private helixAgencies: HelixPublicAgency[] = [];
  private allBeneficiaries: BeneficiaryRecord[] = [];

  // ── Register / Edit dialog ─────────────────────────────────────────────────
  dialogVisible = false;
  dialogMode: 'create' | 'edit' = 'create';
  dialogSaving = false;
  dialogTitle = '';
  dialogEntityLabel = '';

  formName = '';
  formEmail = '';
  private dialogHelixEntityId = 0;
  private dialogBeneficiaryType: 'agency' | 'affiliate' = 'agency';
  private editingBeneficiary: BeneficiaryRecord | null = null;

  constructor(
    private beneficiariesService: BeneficiariesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;

    forkJoin({
      agencies:      this.beneficiariesService.getHelixAgencies().pipe(catchError(() => of([] as HelixPublicAgency[]))),
      affiliates:    this.beneficiariesService.getHelixAllAffiliates().pipe(catchError(() => of([] as HelixPublicAffiliate[]))),
      beneficiaries: this.beneficiariesService.list().pipe(catchError(() => of([] as BeneficiaryRecord[]))),
    }).subscribe({
      next: ({ agencies, affiliates, beneficiaries }) => {
        this.helixAgencies = agencies;
        this.allBeneficiaries = beneficiaries;

        this.agencyFilterOptions = [
          { label: 'Todas las agencias', value: null },
          ...agencies.map(a => ({ label: a.agencyName, value: a.idAgency })),
        ];

        this.computeAgencyRows();
        this.computeAffiliateRows(affiliates);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'Error', 'No se pudieron cargar los datos.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  applyAgencySearch(): void {
    const q = this.agencySearch.toLowerCase().trim();
    this.filteredAgencyRows = q
      ? this.agencyRows.filter(r => r.agencyName.toLowerCase().includes(q))
      : [...this.agencyRows];
  }

  applyAffiliateFilters(): void {
    let rows = this.affiliateRows;

    if (this.affiliateAgencyFilter !== null) {
      rows = rows.filter(r => r.idAgency === this.affiliateAgencyFilter);
    }

    const q = this.affiliateSearch.toLowerCase().trim();
    if (q) {
      rows = rows.filter(r =>
        r.affiliateName.toLowerCase().includes(q) ||
        r.agencyName.toLowerCase().includes(q),
      );
    }

    this.filteredAffiliateRows = rows;
  }

  clearAgencySearch(): void {
    this.agencySearch = '';
    this.applyAgencySearch();
  }

  clearAffiliateSearch(): void {
    this.affiliateSearch = '';
    this.applyAffiliateFilters();
  }

  // ── Register dialog ────────────────────────────────────────────────────────

  openRegisterAgency(row: AgencyRow): void {
    this.dialogMode = 'create';
    this.dialogTitle = 'Registrar Beneficiario — Agencia';
    this.dialogEntityLabel = row.agencyName;
    this.dialogHelixEntityId = row.idAgency;
    this.dialogBeneficiaryType = 'agency';
    this.formName = row.agencyName;
    this.formEmail = row.reportEmail ?? '';
    this.editingBeneficiary = null;
    this.dialogVisible = true;
  }

  openRegisterAffiliate(row: AffiliateRow): void {
    this.dialogMode = 'create';
    this.dialogTitle = 'Registrar Beneficiario — Afiliado';
    this.dialogEntityLabel = `${row.affiliateName} · ${row.agencyName}`;
    this.dialogHelixEntityId = row.idAffiliate;
    this.dialogBeneficiaryType = 'affiliate';
    this.formName = row.affiliateName;
    this.formEmail = row.reportEmail ?? '';
    this.editingBeneficiary = null;
    this.dialogVisible = true;
  }

  openEdit(beneficiary: BeneficiaryRecord): void {
    this.dialogMode = 'edit';
    this.dialogTitle = 'Editar Beneficiario';
    this.dialogEntityLabel = '';
    this.formName = beneficiary.name;
    this.formEmail = beneficiary.email ?? '';
    this.editingBeneficiary = beneficiary;
    this.dialogVisible = true;
  }

  save(): void {
    if (!this.formName.trim()) return;
    this.dialogSaving = true;

    const obs = this.dialogMode === 'create'
      ? this.beneficiariesService.create({
          name: this.formName.trim(),
          email: this.formEmail.trim() || undefined,
          beneficiaryType: this.dialogBeneficiaryType,
          helixEntityId: this.dialogHelixEntityId,
        })
      : this.beneficiariesService.update(this.editingBeneficiary!.idBeneficiary, {
          name: this.formName.trim(),
          email: this.formEmail.trim() || undefined,
        });

    obs.subscribe({
      next: () => {
        this.dialogSaving = false;
        this.dialogVisible = false;
        this.toast('success', 'Guardado', 'Beneficiario guardado correctamente.');
        this.refreshBeneficiaries();
      },
      error: err => {
        this.dialogSaving = false;
        const detail = err?.error?.message ?? 'No se pudo guardar el beneficiario.';
        this.toast('error', 'Error', detail);
        this.cdr.markForCheck();
      },
    });
  }

  confirmDeactivate(beneficiary: BeneficiaryRecord, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Desactivar este beneficiario?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deactivate(beneficiary),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getStatusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  getStatusLabel(active: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  get registeredAgencies(): number {
    return this.agencyRows.filter(r => r.beneficiary !== null).length;
  }

  get registeredAffiliates(): number {
    return this.affiliateRows.filter(r => r.beneficiary !== null).length;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private computeAgencyRows(): void {
    const beneficiaryMap = new Map<number, BeneficiaryRecord>();
    for (const b of this.allBeneficiaries) {
      if (b.beneficiaryType === 'agency') {
        beneficiaryMap.set(b.helixEntityId, b);
      }
    }

    this.agencyRows = this.helixAgencies.map(a => ({
      idAgency: a.idAgency,
      agencyName: a.agencyName,
      reportEmail: a.reportEmail,
      beneficiary: beneficiaryMap.get(a.idAgency) ?? null,
    }));

    this.applyAgencySearch();
  }

  private computeAffiliateRows(affiliates: HelixPublicAffiliate[]): void {
    const beneficiaryMap = new Map<number, BeneficiaryRecord>();
    for (const b of this.allBeneficiaries) {
      if (b.beneficiaryType === 'affiliate') {
        beneficiaryMap.set(b.helixEntityId, b);
      }
    }

    this.affiliateRows = affiliates.map(af => ({
      idAffiliate: af.idAffiliate,
      affiliateName: af.affiliateName,
      reportEmail: af.reportEmail,
      idAgency: af.idAgency,
      agencyName: af.agency.agencyName,
      beneficiary: beneficiaryMap.get(af.idAffiliate) ?? null,
    }));

    this.applyAffiliateFilters();
  }

  private deactivate(beneficiary: BeneficiaryRecord): void {
    this.beneficiariesService.deactivate(beneficiary.idBeneficiary).subscribe({
      next: () => {
        this.toast('success', 'Desactivado', 'Beneficiario desactivado.');
        this.refreshBeneficiaries();
      },
      error: () => {
        this.toast('error', 'Error', 'No se pudo desactivar el beneficiario.');
        this.cdr.markForCheck();
      },
    });
  }

  private refreshBeneficiaries(): void {
    this.beneficiariesService.list().subscribe({
      next: beneficiaries => {
        this.allBeneficiaries = beneficiaries;
        this.computeAgencyRows();
        // Re-compute affiliate rows from current data
        const affiliates: HelixPublicAffiliate[] = this.affiliateRows.map(r => ({
          idAffiliate: r.idAffiliate,
          idAgency: r.idAgency,
          affiliateName: r.affiliateName,
          reportEmail: r.reportEmail,
          agency: { idAgency: r.idAgency, agencyName: r.agencyName, reportEmail: '' },
          createdAt: '',
          updatedAt: '',
        }));
        this.computeAffiliateRows(affiliates);
        this.cdr.markForCheck();
      },
    });
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}
