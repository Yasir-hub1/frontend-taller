import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AppNotification } from '../../shared/models/notification.model';

/** API de notificaciones del panel (taller y admin). */
@Injectable({ providedIn: 'root' })
export class PanelNotificationsApiService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<AppNotification[]>('/api/web/notifications/');
  }

  markRead(id: number) {
    return this.api.post<unknown>(`/api/web/notifications/${id}/read/`, {});
  }

  markAllRead() {
    return this.api.post<{ count: number }>('/api/web/notifications/read-all/', {});
  }

  unreadCount() {
    return this.api.get<{ unread_count: number }>('/api/web/notifications/unread-count/');
  }
}
