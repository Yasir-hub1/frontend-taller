import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { selectUser } from '../../store/auth/auth.selectors';
import { PanelRealtimeService } from './panel-realtime.service';
import { PushNotificationsService } from './push-notifications.service';
import { PanelNotificationsApiService } from './panel-notifications-api.service';
import * as AuthActions from '../../store/auth/auth.actions';

const PANEL_ROLES = new Set(['admin', 'workshop_owner']);
const HIDDEN_POLL_MS = 45_000;

/**
 * Proceso en segundo plano del panel web (admin + taller):
 * Service Worker, Web Push, SSE con reconexión y sondeo si la pestaña está oculta.
 */
@Injectable({ providedIn: 'root' })
export class PanelBackgroundNotificationsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(Store);
  private readonly realtime = inject(PanelRealtimeService);
  private readonly push = inject(PushNotificationsService);
  private readonly notificationsApi = inject(PanelNotificationsApiService);

  private subs = new Subscription();
  private running = false;
  private lastUnread = 0;

  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.running) return;
    this.running = true;

    void this.registerServiceWorker();

    this.subs.add(
      this.store
        .select(selectUser)
        .pipe(filter((u): u is NonNullable<typeof u> => u != null))
        .subscribe((user) => {
          if (PANEL_ROLES.has(user.role)) {
            void this.ensurePanelNotifications();
          } else {
            this.realtime.stop();
          }
        }),
    );

    this.subs.add(
      this.store
        .select(selectUser)
        .pipe(filter((u) => u == null))
        .subscribe(() => {
          this.realtime.stop();
          this.lastUnread = 0;
        }),
    );

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.subs.add(
      interval(HIDDEN_POLL_MS).subscribe(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          this.pollUnread();
        }
      }),
    );
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.subs.unsubscribe();
    this.subs = new Subscription();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.realtime.stop();
  }

  private readonly onVisibilityChange = () => {
    if (!document.hidden) {
      this.pollUnread();
    }
  };

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (err) {
      console.warn('[PanelBG] Service Worker no registrado:', err);
    }
  }

  private async ensurePanelNotifications(): Promise<void> {
    await this.realtime.start();
    try {
      await this.push.initialize();
    } catch {
      /* permiso denegado */
    }
    this.pollUnread();
  }

  private pollUnread(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: (r) => {
        const count = r.unread_count;
        if (count > this.lastUnread && typeof document !== 'undefined' && document.hidden) {
          this.push.showLocalNotification({
            title: 'Tienes notificaciones nuevas',
            body: `${count - this.lastUnread} sin leer en el panel`,
            data: { type: 'unread_poll' },
          });
        }
        this.lastUnread = count;
        this.store.dispatch(AuthActions.setUnreadNotifications({ count }));
      },
      error: () => undefined,
    });
  }
}
