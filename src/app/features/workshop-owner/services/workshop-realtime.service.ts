import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { SseService } from '../../../core/services/sse.service';
import { NotificationsApiService } from './notifications-api.service';
import * as AuthActions from '../../../store/auth/auth.actions';

/**
 * Una sola conexión SSE por sesión de panel taller: actualiza el badge de notificaciones
 * y emite eventos para que listas (incidentes) se refresquen.
 */
@Injectable({ providedIn: 'root' })
export class WorkshopRealtimeService {
  private readonly sse = inject(SseService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly store = inject(Store);

  private destroy$ = new Subject<void>();
  private started = false;

  /** Payload crudo de cada línea `data:` del SSE (JSON string). */
  readonly userEvent$ = new Subject<string>();

  start(): void {
    if (this.started) return;
    this.started = true;
    this.sse.listenUserStream(this.destroy$).subscribe({
      next: (raw) => {
        this.userEvent$.next(raw);
        this.refreshUnreadBadge();
      },
      error: () => undefined,
    });
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
  }

  private refreshUnreadBadge(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: (r) =>
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: r.unread_count })),
      error: () => undefined,
    });
  }
}
