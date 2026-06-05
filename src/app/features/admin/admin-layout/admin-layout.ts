import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner';
import { AdminRealtimeService } from '../services/admin-realtime.service';
import { Store } from '@ngrx/store';
import { selectUnreadNotifications } from '../../../store/auth/auth.selectors';
import { ToolbarNotificationsComponent } from '../../../shared/components/toolbar-notifications/toolbar-notifications';
import { PanelSidenavState, PANEL_MOBILE_MEDIA, panelIsMobileViewport } from '../../../shared/utils/panel-sidenav.state';

@Component({
  standalone: true,
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    OfflineBannerComponent,
    ToolbarNotificationsComponent,
  ],
  template: `
    <mat-sidenav-container class="app-panel-shell">
      <mat-sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="drawerOpened()"
        (openedChange)="onSidenavChange($event)"
        [fixedInViewport]="isMobile()"
        [autoFocus]="false"
        class="app-panel-sidenav"
        [class.app-panel-sidenav--mobile]="isMobile()"
        [class.app-panel-sidenav--collapsed]="nav.isCompact(isMobile())"
        [class.app-panel-sidenav--peek]="!isMobile() && nav.collapsed() && nav.peek()"
      >
        <div
          class="app-panel-sidenav-inner"
          (mouseenter)="nav.onMouseEnter(isMobile())"
          (mouseleave)="nav.onMouseLeave()"
        >
          <div class="app-panel-brand">
            <div class="app-panel-brand-main">
              <span class="app-panel-brand-mark app-panel-brand-mark--admin">
                <mat-icon>admin_panel_settings</mat-icon>
              </span>
              <div class="app-panel-brand-text">
                <span class="app-panel-brand-title">Admin</span>
                <span class="app-panel-brand-sub">Plataforma</span>
              </div>
            </div>
            @if (isMobile()) {
              <button
                mat-icon-button
                type="button"
                class="app-panel-mobile-close"
                (click)="closeNavMobile()"
                aria-label="Cerrar menú"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <mat-nav-list class="app-panel-nav">
            <a
              mat-list-item
              routerLink="/admin/dashboard"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="KPIs operativos"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>insights</mat-icon>
              <span matListItemTitle>KPIs operativos</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/usuarios"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Usuarios"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>manage_accounts</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/talleres"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Talleres"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>home_repair_service</mat-icon>
              <span matListItemTitle>Talleres</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/comision"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Comisión"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>sell</mat-icon>
              <span matListItemTitle>Comisión</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/planes"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Planes suscripción"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>workspace_premium</mat-icon>
              <span matListItemTitle>Planes suscripción</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/incidentes"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Incidentes"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>emergency</mat-icon>
              <span matListItemTitle>Incidentes</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/pagos"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Pagos"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>payments</mat-icon>
              <span matListItemTitle>Pagos</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/reportes"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Reportes"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>bar_chart</mat-icon>
              <span matListItemTitle>Reportes</span>
            </a>
            <a
              mat-list-item
              routerLink="/admin/notificaciones"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Notificaciones"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>notifications_active</mat-icon>
              <span matListItemTitle>Notificaciones</span>
              @if (unread() > 0) {
                <span class="nav-badge">{{ unread() }}</span>
              }
            </a>
          </mat-nav-list>

          @if (!isMobile()) {
            <button
              type="button"
              class="app-panel-collapse-btn"
              (click)="nav.toggle()"
              [attr.aria-label]="nav.collapsed() ? 'Expandir menú' : 'Contraer menú'"
            >
              <mat-icon>{{ nav.collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
              <span class="app-panel-collapse-label">{{
                nav.collapsed() ? 'Expandir' : 'Contraer'
              }}</span>
            </button>
          }
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="app-panel-main">
        <mat-toolbar class="app-panel-toolbar app-top-toolbar">
          <button
            mat-icon-button
            type="button"
            (click)="onMenuClick()"
            [attr.aria-label]="isMobile() ? (sidenavOpen() ? 'Cerrar menú' : 'Abrir menú') : nav.collapsed() ? 'Expandir menú' : 'Contraer menú'"
          >
            <mat-icon>{{ isMobile() ? 'menu' : nav.collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
          </button>
          <span class="toolbar-fill"></span>
          <app-toolbar-notifications />
          <span class="user-name">{{ auth.currentUser()?.first_name }}</span>
          <button mat-icon-button type="button" (click)="auth.logout()" aria-label="Salir">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <app-offline-banner />
        <div class="app-panel-content admin-content"><router-outlet /></div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: ``,
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly realtime = inject(AdminRealtimeService);
  private readonly store = inject(Store);
  private readonly platformId = inject(PLATFORM_ID);
  readonly unread = this.store.selectSignal(selectUnreadNotifications);

  protected readonly nav = new PanelSidenavState('panel-nav-admin', this.platformId);

  readonly isMobile = toSignal(
    this.breakpoint.observe(PANEL_MOBILE_MEDIA).pipe(map((r) => r.matches)),
    { initialValue: panelIsMobileViewport(this.platformId) },
  );

  protected readonly sidenavOpen = signal(false);
  protected readonly drawerOpened = computed(() => !this.isMobile() || this.sidenavOpen());

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.sidenavOpen.set(false);
      });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      void this.realtime.start();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.realtime.stop();
    }
  }

  onSidenavChange(opened: boolean): void {
    if (this.isMobile()) this.sidenavOpen.set(opened);
  }

  onMenuClick(): void {
    if (this.isMobile()) {
      this.sidenavOpen.update((v) => !v);
      this.nav.peek.set(false);
      return;
    }
    this.nav.toggle();
  }

  closeNavMobile(): void {
    if (this.isMobile()) this.sidenavOpen.set(false);
  }
}
