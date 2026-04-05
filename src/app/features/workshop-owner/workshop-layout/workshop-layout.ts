import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { Store } from '@ngrx/store';
import { selectUnreadNotifications } from '../../../store/auth/auth.selectors';
import { WorkshopOwnerService } from '../services/workshop-owner.service';

@Component({
  standalone: true,
  selector: 'app-workshop-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile() || sidenavOpen()"
        (openedChange)="onSidenavChange($event)"
        [fixedInViewport]="isMobile()"
        class="side-nav workshop-side"
      >
        <div class="brand">
          <span class="brand-mark">T</span>
          <div class="brand-text">
            <span class="brand-title">Taller</span>
            <span class="brand-sub">Panel</span>
          </div>
        </div>
        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/taller/dashboard" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/taller/incidentes" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>local_shipping</mat-icon>
            <span matListItemTitle>Incidentes</span>
          </a>
          <a mat-list-item routerLink="/taller/tecnicos" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>engineering</mat-icon>
            <span matListItemTitle>Técnicos</span>
          </a>
          <a mat-list-item routerLink="/taller/perfil" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>storefront</mat-icon>
            <span matListItemTitle>Perfil taller</span>
          </a>
          <a mat-list-item routerLink="/taller/ingresos" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>payments</mat-icon>
            <span matListItemTitle>Ingresos</span>
          </a>
          <a mat-list-item routerLink="/taller/notificaciones" routerLinkActive="active" (click)="closeNavMobile()">
            <mat-icon matListItemIcon>notifications</mat-icon>
            <span matListItemTitle>Notificaciones</span>
            @if (unread() > 0) {
              <span class="nav-badge">{{ unread() }}</span>
            }
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="main">
        <mat-toolbar class="app-top-toolbar top-bar">
          @if (isMobile()) {
            <button mat-icon-button type="button" (click)="openNav()" aria-label="Abrir menú">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="toolbar-fill"></span>
          <span class="user-name">{{ auth.currentUser()?.first_name }}</span>
          <button mat-icon-button type="button" (click)="auth.logout()" aria-label="Salir">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        @if (bannerNoWorkshop) {
          <div class="banner warn">
            <mat-icon>storefront</mat-icon>
            <span
              >Aún no registraste tu taller.
              <a routerLink="/taller/perfil">Completá el perfil del taller</a>.</span
            >
          </div>
        }
        @if (bannerPendingVerification) {
          <div class="banner info">
            <mat-icon>verified_user</mat-icon>
            <span
              >Tu taller está <strong>pendiente de verificación</strong> por administración. Podés seguir
              usando el panel; algunas acciones pueden depender de la aprobación.
              <a routerLink="/taller/perfil">Ver perfil</a></span
            >
          </div>
        }
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      background: var(--app-bg, #f1f5f9);
    }
    .side-nav.workshop-side {
      width: min(280px, 86vw);
      border-right: 1px solid var(--app-border, #e2e8f0);
      background: var(--app-nav-workshop, #fff);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 1.25rem 1rem 1rem;
      border-bottom: 1px solid var(--app-border, #e2e8f0);
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0d9488, #14b8a6);
      color: #fff;
      font-weight: 800;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.05em;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }
    .brand-title {
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
      font-weight: 500;
    }
    .nav-list a {
      border-radius: 10px !important;
      margin: 2px 8px;
      width: calc(100% - 16px) !important;
    }
    .nav-list a.active {
      background: var(--app-accent-soft, #ccfbf1) !important;
      color: var(--app-accent-hover, #0f766e) !important;
    }
    .nav-list a.active mat-icon {
      color: var(--app-accent, #0d9488) !important;
    }
    .nav-list mat-icon {
      color: var(--app-text-muted, #64748b);
    }
    .nav-badge {
      margin-left: auto;
      background: #dc2626;
      color: #fff;
      border-radius: 999px;
      padding: 0 7px;
      font-size: 11px;
      font-weight: 700;
      min-width: 1.25rem;
      text-align: center;
    }
    .main {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 4;
      min-height: 56px;
    }
    .toolbar-fill {
      flex: 1;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--app-text-muted, #64748b);
      margin-right: 4px;
      max-width: 42vw;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      flex: 1;
      padding: clamp(12px, 2.5vw, 24px);
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px clamp(12px, 3vw, 24px);
      font-size: 0.875rem;
      line-height: 1.5;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .banner mat-icon {
      flex-shrink: 0;
      margin-top: 2px;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .banner.warn {
      background: var(--app-warn-bg, #fff7ed);
      color: var(--app-warn-text, #9a3412);
      border-bottom: 1px solid rgb(251 146 60 / 25%);
    }
    .banner.info {
      background: var(--app-info-bg, #eff6ff);
      color: var(--app-info-text, #1d4ed8);
      border-bottom: 1px solid rgb(59 130 246 / 20%);
    }
    .banner a {
      color: inherit;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  `,
})
export class WorkshopLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly store = inject(Store);
  private readonly workshops = inject(WorkshopOwnerService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly platformId = inject(PLATFORM_ID);
  readonly unread = this.store.selectSignal(selectUnreadNotifications);

  readonly isMobile = toSignal(
    this.breakpoint.observe('(max-width: 959.98px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly sidenavOpen = signal(false);

  bannerNoWorkshop = false;
  bannerPendingVerification = false;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.refreshBanners();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.sidenavOpen.set(false);
        this.refreshBanners();
      });
  }

  onSidenavChange(opened: boolean): void {
    if (this.isMobile()) this.sidenavOpen.set(opened);
  }

  openNav(): void {
    this.sidenavOpen.set(true);
  }

  closeNavMobile(): void {
    if (this.isMobile()) this.sidenavOpen.set(false);
  }

  private refreshBanners() {
    this.workshops.getMyWorkshop().subscribe({
      next: (w) => {
        this.bannerNoWorkshop = false;
        this.bannerPendingVerification = !w.is_verified;
      },
      error: () => {
        this.bannerNoWorkshop = true;
        this.bannerPendingVerification = false;
      },
    });
  }
}
