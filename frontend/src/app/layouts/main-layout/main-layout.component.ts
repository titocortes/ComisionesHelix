import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/auth.model';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, ButtonModule, ToastModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  currentUser: AuthUser | null = null;

  private readonly allNavItems: NavItem[] = [
    { labelKey: 'nav.dashboard',      icon: 'pi-th-large',    route: '/dashboard'        },
    { labelKey: 'nav.commissions',    icon: 'pi-percentage',  route: '/commissions'      },
    { labelKey: 'nav.beneficiaries',   icon: 'pi-id-card',     route: '/beneficiaries',   adminOnly: true },
    { labelKey: 'nav.payments',       icon: 'pi-credit-card', route: '/payments',        adminOnly: true },
    { labelKey: 'nav.products',       icon: 'pi-box',         route: '/products',        adminOnly: true },
    { labelKey: 'nav.admin_ingestion',icon: 'pi-sync',        route: '/admin/ingestion', adminOnly: true },
  ];

  get navItems(): NavItem[] {
    const isAdmin = this.currentUser?.roleName?.toLowerCase() === 'admin';
    return this.allNavItems.filter(item => !item.adminOnly || isAdmin);
  }

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    const first = this.currentUser.firstName?.[0] ?? '';
    const last  = this.currentUser.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  }
}
