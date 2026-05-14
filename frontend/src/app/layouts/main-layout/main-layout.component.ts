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

  readonly navItems: NavItem[] = [
    { labelKey: 'nav.dashboard',    icon: 'pi-th-large',    route: '/dashboard'    },
    { labelKey: 'nav.clients',      icon: 'pi-users',       route: '/clients'      },
    { labelKey: 'nav.products',     icon: 'pi-box',         route: '/products'     },
    { labelKey: 'nav.transactions', icon: 'pi-arrows-h',    route: '/transactions' },
    { labelKey: 'nav.payments',     icon: 'pi-credit-card', route: '/payments'     },
    { labelKey: 'nav.commissions',  icon: 'pi-percentage',  route: '/commissions'  },
    { labelKey: 'nav.catalogs',     icon: 'pi-database',    route: '/catalogs'     },
  ];

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
