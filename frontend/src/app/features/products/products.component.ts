import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ProductsService, SyncResult, UpsertDiscountRequest, UpsertRateRequest } from '../../core/services/products.service';
import { DependentDiscount, ProductWithRate } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, DecimalPipe,
    TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    InputNumberModule, CheckboxModule, TagModule, DialogModule, DividerModule,
    ToastModule, ConfirmPopupModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent implements OnInit {
  products: ProductWithRate[] = [];
  filteredProducts: ProductWithRate[] = [];
  loading = false;
  searchFilter = '';
  syncing = false;

  // ── Product dialog ─────────────────────────────────────────────────────────
  productDialogVisible = false;
  editingProduct: ProductWithRate | null = null;
  productForm = { productName: '', shortName: '', helixProductId: null as number | null };
  productSaving = false;

  // ── Commission rate dialog ─────────────────────────────────────────────────
  rateDialogVisible = false;
  rateProduct: ProductWithRate | null = null;
  rateForm: UpsertRateRequest = { monthlySellerAmount: 0, monthlyAffiliateAmount: 0, monthlyAgencyAmount: 0 };
  rateSaving = false;

  // ── Discounts dialog ───────────────────────────────────────────────────────
  discountsDialogVisible = false;
  discountsProduct: ProductWithRate | null = null;
  discounts: DependentDiscount[] = [];
  discountsLoading = false;
  discountForm: { dependentNumber: number | null; discountPercentage: number | null; orMore: boolean } = {
    dependentNumber:    null,
    discountPercentage: null,
    orMore:             false,
  };
  editingDiscount: DependentDiscount | null = null;
  discountSaving = false;

  constructor(
    private productsService: ProductsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.list().subscribe({
      next: data => {
        this.products = data;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'Error', 'No se pudieron cargar los productos.');
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter(): void {
    const q = this.searchFilter.toLowerCase().trim();
    this.filteredProducts = q
      ? this.products.filter(
          p =>
            p.productName.toLowerCase().includes(q) ||
            p.shortName.toLowerCase().includes(q) ||
            String(p.helixProductId ?? '').includes(q),
        )
      : [...this.products];
  }

  // ── Product CRUD ────────────────────────────────────────────────────────────

  openEditProduct(p: ProductWithRate): void {
    this.editingProduct = p;
    this.productForm = {
      productName:    p.productName,
      shortName:      p.shortName,
      helixProductId: p.helixProductId,
    };
    this.productDialogVisible = true;
  }

  saveProduct(): void {
    if (!this.productForm.shortName.trim() || !this.editingProduct) return;
    this.productSaving = true;

    const body = { shortName: this.productForm.shortName.trim() };

    const obs = this.productsService.update(this.editingProduct.idProduct, body);

    obs.subscribe({
      next: () => {
        this.productSaving = false;
        this.productDialogVisible = false;
        this.toast('success', 'Guardado', 'Producto guardado correctamente.');
        this.cdr.markForCheck();
        this.loadProducts();
      },
      error: () => {
        this.productSaving = false;
        this.toast('error', 'Error', 'No se pudo guardar el producto.');
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(p: ProductWithRate): void {
    this.productsService.update(p.idProduct, { active: !p.active }).subscribe({
      next: () => {
        this.toast('success', 'Actualizado', `Producto ${p.active ? 'desactivado' : 'activado'}.`);
        this.loadProducts();
      },
      error: () => this.toast('error', 'Error', 'No se pudo actualizar el estado.'),
    });
  }

  // ── Helix sync ─────────────────────────────────────────────────────────────

  syncFromHelix(): void {
    this.syncing = true;
    this.productsService.syncFromHelix().subscribe({
      next: (result: SyncResult) => {
        this.syncing = false;
        this.toast(
          'success',
          'Sincronización completada',
          `Creados: ${result.created} · Actualizados: ${result.updated} · Desactivados: ${result.deactivated}`,
        );
        this.cdr.markForCheck();
        this.loadProducts();
      },
      error: () => {
        this.syncing = false;
        this.toast('error', 'Error', 'No se pudo sincronizar con Helix.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Commission rate ─────────────────────────────────────────────────────────

  openRateDialog(p: ProductWithRate): void {
    this.rateProduct = p;
    this.rateForm = {
      monthlySellerAmount:    p.commissionRate?.monthlySellerAmount    ?? 0,
      monthlyAffiliateAmount: p.commissionRate?.monthlyAffiliateAmount ?? 0,
      monthlyAgencyAmount:    p.commissionRate?.monthlyAgencyAmount    ?? 0,
    };
    this.rateDialogVisible = true;
  }

  saveRate(): void {
    if (!this.rateProduct) return;
    this.rateSaving = true;
    this.productsService.upsertRate(this.rateProduct.idProduct, this.rateForm).subscribe({
      next: () => {
        this.rateSaving = false;
        this.rateDialogVisible = false;
        this.toast('success', 'Guardado', 'Tarifa actualizada correctamente.');
        this.cdr.markForCheck();
        this.loadProducts();
      },
      error: () => {
        this.rateSaving = false;
        this.toast('error', 'Error', 'No se pudo guardar la tarifa.');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Dependent discounts ─────────────────────────────────────────────────────

  openDiscountsDialog(p: ProductWithRate): void {
    this.discountsProduct     = p;
    this.discounts            = [];
    this.editingDiscount      = null;
    this.discountsDialogVisible = true;
    this.resetDiscountForm();
    this.loadDiscounts(p.idProduct);
  }

  loadDiscounts(idProduct: number): void {
    this.discountsLoading = true;
    this.productsService.getDiscounts(idProduct).subscribe({
      next: data => {
        this.discounts        = data;
        this.discountsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.discountsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  startEditDiscount(d: DependentDiscount): void {
    this.editingDiscount = d;
    this.discountForm = {
      dependentNumber:    d.dependentNumber,
      discountPercentage: d.discountPercentage,
      orMore:             d.orMore,
    };
  }

  cancelEditDiscount(): void {
    this.editingDiscount = null;
    this.resetDiscountForm();
  }

  saveDiscount(): void {
    if (
      !this.discountsProduct ||
      this.discountForm.dependentNumber === null ||
      this.discountForm.discountPercentage === null
    ) return;

    this.discountSaving = true;
    const body: UpsertDiscountRequest = {
      dependentNumber:    this.discountForm.dependentNumber!,
      discountPercentage: this.discountForm.discountPercentage!,
      orMore:             this.discountForm.orMore ?? false,
    };

    const obs = this.editingDiscount
      ? this.productsService.updateDiscount(
          this.discountsProduct.idProduct,
          this.editingDiscount.idDependentDiscount,
          body,
        )
      : this.productsService.createDiscount(this.discountsProduct.idProduct, body);

    obs.subscribe({
      next: () => {
        this.discountSaving  = false;
        this.editingDiscount = null;
        this.resetDiscountForm();
        this.loadDiscounts(this.discountsProduct!.idProduct);
        this.toast('success', 'Guardado', 'Descuento guardado correctamente.');
        this.cdr.markForCheck();
      },
      error: err => {
        this.discountSaving = false;
        const detail = err?.error?.message ?? 'No se pudo guardar el descuento.';
        this.toast('error', 'Error', detail);
        this.cdr.markForCheck();
      },
    });
  }

  confirmDeleteDiscount(d: DependentDiscount, event: Event): void {
    this.confirmationService.confirm({
      target:  event.target as EventTarget,
      message: '¿Eliminar este descuento?',
      icon:    'pi pi-exclamation-triangle',
      accept:  () => this.deleteDiscount(d),
    });
  }

  private deleteDiscount(d: DependentDiscount): void {
    this.productsService
      .deleteDiscount(this.discountsProduct!.idProduct, d.idDependentDiscount)
      .subscribe({
        next: () => {
          this.loadDiscounts(this.discountsProduct!.idProduct);
          this.toast('success', 'Eliminado', 'Descuento eliminado.');
          this.cdr.markForCheck();
        },
        error: () => {
          this.toast('error', 'Error', 'No se pudo eliminar el descuento.');
          this.cdr.markForCheck();
        },
      });
  }

  private resetDiscountForm(): void {
    this.discountForm = { dependentNumber: null, discountPercentage: null, orMore: false as boolean };
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }
}
