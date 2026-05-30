import { Injectable, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { SseService } from './sse.service';
import { PanelNotificationsApiService } from './panel-notifications-api.service';
import { PushNotificationsService } from './push-notifications.service';
import { MessagesService } from './messages.service';
import { WorkshopOwnerService } from '../../features/workshop-owner/services/workshop-owner.service';
import { selectUser } from '../../store/auth/auth.selectors';
import * as AuthActions from '../../store/auth/auth.actions';

/**
 * SSE + Web Push para panel taller o admin (misma API /api/web/notifications/).
 */
@Injectable({ providedIn: 'root' })
export class PanelRealtimeService {
  private readonly sse = inject(SseService);
  private readonly notificationsApi = inject(PanelNotificationsApiService);
  private readonly push = inject(PushNotificationsService);
  private readonly messages = inject(MessagesService);
  private readonly store = inject(Store);
  private readonly workshopOwner = inject(WorkshopOwnerService);
  private readonly ownerWorkshopIds = signal<number[]>([]);

  private destroy$ = new Subject<void>();
  private started = false;

  readonly userEvent$ = new Subject<string>();

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.refreshUnreadBadge();
    this.loadOwnerWorkshopScope();

    this.sse.listenUserStream(this.destroy$).subscribe({
      next: (raw) => {
        this.userEvent$.next(raw);
        this.refreshUnreadBadge();
        this.handleSsePayload(raw);
        this.playNotificationSound();
      },
      error: () => undefined,
    });

    try {
      await this.push.initialize();
    } catch {
      /* opcional */
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
    void this.push.deleteToken();
  }

  private refreshUnreadBadge(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: (r) =>
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: r.unread_count })),
      error: () => undefined,
    });
  }

  private loadOwnerWorkshopScope(): void {
    const user = this.store.selectSignal(selectUser)();
    if (user?.role !== 'workshop_owner') {
      this.ownerWorkshopIds.set([]);
      return;
    }
    this.workshopOwner.getMyWorkshop().subscribe({
      next: (w) => this.ownerWorkshopIds.set([w.id]),
      error: () => this.ownerWorkshopIds.set([]),
    });
  }

  /** Evita toasts/SSE de otro taller u otra cuenta en el mismo navegador. */
  private shouldShowPanelEvent(data: Record<string, unknown>): boolean {
    const user = this.store.selectSignal(selectUser)();
    const ev = String(data['event'] ?? data['type'] ?? '');

    if (user?.role === 'admin') {
      const workshopOnly = [
        'new_assignment_offer',
        'new_rating',
        'workshop_verified',
        'payment_confirmed',
      ];
      return !workshopOnly.includes(ev);
    }

    if (user?.role === 'workshop_owner') {
      const adminOnly = ['admin_new_incident', 'workshop_pending_review', 'incident_created'];
      if (adminOnly.includes(ev)) return false;

      const ws = data['workshop_id'];
      if (ws !== undefined && ws !== null && ws !== '') {
        const ids = this.ownerWorkshopIds();
        if (ids.length && !ids.includes(Number(ws))) return false;
      }
    }

    return true;
  }

  private handleSsePayload(raw: string): void {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (!this.shouldShowPanelEvent(data)) {
        this.refreshUnreadBadge();
        return;
      }
      const title = typeof data['title'] === 'string' ? data['title'] : this.titleForEvent(data);
      const body = typeof data['body'] === 'string' ? data['body'] : this.bodyForEvent(data);
      if (title) {
        const text = body || this.bodyForEvent(data);
        this.messages.notify(title, text || undefined);
        this.push.showLocalNotification({ title, body: text, data });
      }
    } catch {
      const ev = String(raw).slice(0, 80);
      if (ev) this.messages.notify('Nueva notificación', ev);
    }
  }

  private titleForEvent(data: Record<string, unknown>): string {
    const ev = String(data['event'] ?? data['type'] ?? '');
    const map: Record<string, string> = {
      new_assignment_offer: 'Nueva solicitud de emergencia',
      workshop_verified: 'Taller verificado',
      workshop_pending_review: 'Taller pendiente de revisión',
      admin_new_incident: 'Nuevo incidente',
      new_rating: 'Nueva calificación',
      payment_confirmed: 'Pago recibido',
    };
    return map[ev] || (ev ? 'Actualización' : '');
  }

  private bodyForEvent(data: Record<string, unknown>): string {
    if (typeof data['body'] === 'string') return data['body'];
    const ev = String(data['event'] ?? '');
    if (ev === 'new_assignment_offer' && data['incident_id']) {
      return `Incidente #${data['incident_id']} disponible para tu taller.`;
    }
    if (ev === 'admin_new_incident' && data['incident_id']) {
      return `Incidente #${data['incident_id']} en la plataforma.`;
    }
    if (ev === 'workshop_pending_review' && data['workshop_name']) {
      return `"${data['workshop_name']}" registró su perfil y espera revisión.`;
    }
    return '';
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.3;
      void audio.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}
