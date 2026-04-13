import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { SseService } from '../../../core/services/sse.service';
import { NotificationsApiService } from './notifications-api.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import * as AuthActions from '../../../store/auth/auth.actions';

/**
 * Una sola conexión SSE por sesión de panel taller: actualiza el badge de notificaciones,
 * emite eventos para que listas (incidentes) se refresquen, y gestiona push notifications web.
 */
@Injectable({ providedIn: 'root' })
export class WorkshopRealtimeService {
  private readonly sse = inject(SseService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly pushNotifications = inject(PushNotificationsService);
  private readonly store = inject(Store);

  private destroy$ = new Subject<void>();
  private started = false;

  /** Payload crudo de cada línea `data:` del SSE (JSON string). */
  readonly userEvent$ = new Subject<string>();

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Inicializar SSE
    this.sse.listenUserStream(this.destroy$).subscribe({
      next: (raw) => {
        this.userEvent$.next(raw);
        this.refreshUnreadBadge();
        this.playNotificationSound();
      },
      error: () => undefined,
    });

    // Inicializar Push Notifications (opcional, solo si está configurado)
    try {
      const token = await this.pushNotifications.initialize();
      if (token) {
        console.log('[WorkshopRealtime] Push notifications enabled');
      }
    } catch (error) {
      console.warn('[WorkshopRealtime] Push notifications not available:', error);
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();

    // Limpiar token push (opcional)
    this.pushNotifications.deleteToken().catch(() => {});
  }

  private refreshUnreadBadge(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: (r) =>
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: r.unread_count })),
      error: () => undefined,
    });
  }

  /**
   * Reproducir sonido de notificación cuando llega un evento SSE.
   */
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignorar si el navegador bloquea autoplay
      });
    } catch {
      // Ignorar errores de audio
    }
  }
}
