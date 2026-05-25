import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PanelNotificationsApiService } from '../../../core/services/panel-notifications-api.service';
import { PanelRealtimeService } from '../../../core/services/panel-realtime.service';
import { selectUnreadNotifications } from '../../../store/auth/auth.selectors';
import { AppNotification } from '../../models/notification.model';
import * as AuthActions from '../../../store/auth/auth.actions';

@Component({
  standalone: true,
  selector: 'app-toolbar-notifications',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    RouterLink,
  ],
  template: `
    <button
      mat-icon-button
      type="button"
      [matMenuTriggerFor]="notifMenu"
      (menuOpened)="onMenuOpen()"
      aria-label="Notificaciones"
      class="notif-btn"
    >
      <mat-icon
        [matBadge]="badgeLabel()"
        matBadgeColor="warn"
        matBadgeSize="small"
        [matBadgeHidden]="unread() === 0"
        aria-hidden="true"
        >notifications</mat-icon
      >
    </button>

    <mat-menu #notifMenu="matMenu" class="toolbar-notif-menu" xPosition="before">
      <div class="menu-head" (click)="$event.stopPropagation()">
        <span class="menu-title">Notificaciones</span>
        @if (unread() > 0) {
          <span class="menu-count">{{ unread() }} sin leer</span>
        }
      </div>
      <mat-divider />
      @if (loading()) {
        <button mat-menu-item disabled>Cargando…</button>
      } @else if (preview().length === 0) {
        <button mat-menu-item disabled>No hay notificaciones</button>
      } @else {
        @for (n of preview(); track n.id) {
          <button
            mat-menu-item
            class="notif-item"
            [class.unread]="!n.is_read"
            (click)="openList()"
          >
            <span class="item-title">{{ n.title }}</span>
            <span class="item-body">{{ n.body }}</span>
          </button>
        }
      }
      <mat-divider />
      <button mat-menu-item [routerLink]="listUrl" (click)="openList()">
        <mat-icon>list</mat-icon>
        <span>Ver todas</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .notif-btn mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    ::ng-deep .toolbar-notif-menu {
      max-width: min(360px, 92vw);
    }
    .menu-head {
      padding: 12px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .menu-title {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--app-text, #0f172a);
    }
    .menu-count {
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
    }
    .notif-item {
      height: auto !important;
      min-height: 48px;
      line-height: 1.35 !important;
      white-space: normal !important;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }
    .notif-item.unread .item-title {
      font-weight: 700;
    }
    .item-title {
      display: block;
      font-size: 0.875rem;
      color: var(--app-text, #0f172a);
    }
    .item-body {
      display: block;
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
      margin-top: 2px;
    }
  `,
})
export class ToolbarNotificationsComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PanelNotificationsApiService);
  private readonly realtime = inject(PanelRealtimeService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly unread = this.store.selectSignal(selectUnreadNotifications);
  readonly preview = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  readonly listUrl = this.auth.isAdmin() ? '/admin/notificaciones' : '/taller/notificaciones';

  private sub?: Subscription;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.refreshUnread();
    this.sub = this.realtime.userEvent$.subscribe(() => {
      this.refreshUnread();
      if (this.preview().length > 0) {
        this.loadPreview();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  badgeLabel(): string {
    const n = this.unread();
    return n > 99 ? '99+' : String(n);
  }

  onMenuOpen(): void {
    this.loadPreview();
  }

  openList(): void {
    void this.router.navigateByUrl(this.listUrl);
  }

  private refreshUnread(): void {
    this.api.unreadCount().subscribe({
      next: (r) =>
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: r.unread_count })),
      error: () => undefined,
    });
  }

  private loadPreview(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (list) => {
        this.preview.set(list.slice(0, 6));
        this.loading.set(false);
        const unread = list.filter((x) => !x.is_read).length;
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: unread }));
      },
      error: () => this.loading.set(false),
    });
  }
}
