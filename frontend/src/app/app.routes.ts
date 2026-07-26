import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'commissions',
        loadComponent: () => import('./features/commissions/commission-review.component').then(m => m.CommissionReviewComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'payments',
        loadComponent: () => import('./features/payments/payment-tracking.component').then(m => m.PaymentTrackingComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'beneficiaries',
        loadComponent: () => import('./features/beneficiaries/beneficiaries.component').then(m => m.BeneficiariesComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'admin/ingestion',
        loadComponent: () => import('./features/admin/ingestion-trigger/ingestion-trigger.component').then(m => m.IngestionTriggerComponent),
        canActivate: [adminGuard]
      },
      {
        path: '',
        redirectTo: 'commissions',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
