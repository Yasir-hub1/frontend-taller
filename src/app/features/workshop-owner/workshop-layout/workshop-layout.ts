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
import { Store } from '@ngrx/store';
import { selectUnreadNotifications } from '../../../store/auth/auth.selectors';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { WorkshopRealtimeService } from '../services/workshop-realtime.service';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner';
import { ToolbarNotificationsComponent } from '../../../shared/components/toolbar-notifications/toolbar-notifications';
import { PanelSidenavState, PANEL_MOBILE_MEDIA, panelIsMobileViewport } from '../../../shared/utils/panel-sidenav.state';

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
              <span class="app-panel-brand-mark app-panel-brand-mark--workshop">
                <mat-icon>build_circle</mat-icon>
              </span>
              <div class="app-panel-brand-text">
                <span class="app-panel-brand-title">Taller</span>
                <span class="app-panel-brand-sub">Mecanic La Leyenda</span>
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
              routerLink="/taller/dashboard"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Dashboard"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>space_dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/incidentes"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Incidentes"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>minor_crash</mat-icon>
              <span matListItemTitle>Incidentes</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/tecnicos"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Técnicos"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>engineering</mat-icon>
              <span matListItemTitle>Técnicos</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/suscripcion"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Suscripción"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>verified_user</mat-icon>
              <span matListItemTitle>Suscripción</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/perfil"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Perfil taller"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>store</mat-icon>
              <span matListItemTitle>Perfil taller</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/ingresos"
              routerLinkActive="active"
              (click)="closeNavMobile()"
              matTooltip="Ingresos"
              matTooltipPosition="right"
              [matTooltipDisabled]="!nav.isCompact(isMobile())"
            >
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Ingresos</span>
            </a>
            <a
              mat-list-item
              routerLink="/taller/notificaciones"
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
        @if (bannerNoWorkshop) {
          <div class="app-panel-banner app-panel-banner--warn">
            <mat-icon>storefront</mat-icon>
            <span
              >Aún no registraste tu taller.
              <a routerLink="/taller/perfil">Completá el perfil del taller</a>.</span
            >
          </div>
        }
        @if (bannerPendingVerification) {
          <div class="app-panel-banner app-panel-banner--info">
            <mat-icon>verified_user</mat-icon>
            <span
              >Tu taller está <strong>pendiente de verificación</strong> por administración. Podés seguir
              usando el panel; algunas acciones pueden depender de la aprobación.
              <a routerLink="/taller/perfil">Ver perfil</a></span
            >
          </div>
        }
        <app-offline-banner />
        <div class="app-panel-content workshop-content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: ``,
})
export class WorkshopLayoutComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly store = inject(Store);
  private readonly workshops = inject(WorkshopOwnerService);
  private readonly realtime = inject(WorkshopRealtimeService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly platformId = inject(PLATFORM_ID);
  readonly unread = this.store.selectSignal(selectUnreadNotifications);

  protected readonly nav = new PanelSidenavState('panel-nav-workshop', this.platformId);

  readonly isMobile = toSignal(
    this.breakpoint.observe(PANEL_MOBILE_MEDIA).pipe(map((r) => r.matches)),
    { initialValue: panelIsMobileViewport(this.platformId) },
  );

  protected readonly sidenavOpen = signal(false);
  protected readonly drawerOpened = computed(() => !this.isMobile() || this.sidenavOpen());

  bannerNoWorkshop = false;
  bannerPendingVerification = false;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.realtime.start();
    this.refreshBanners();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.sidenavOpen.set(false);
        this.refreshBanners();
      });
  }

  ngOnDestroy(): void {
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

  private refreshBanners() {
    this.workshops.getMyWorkshop().subscribe({
      next: (w) => {
        this.bannerNoWorkshop = w.id <= 0 && !this.workshops.hasPendingWorkshopSync();
        this.bannerPendingVerification = w.id > 0 && !w.is_verified;
      },
      error: () => {
        this.bannerNoWorkshop = !this.workshops.hasPendingWorkshopSync();
        this.bannerPendingVerification = false;
      },
    });
  }
}
