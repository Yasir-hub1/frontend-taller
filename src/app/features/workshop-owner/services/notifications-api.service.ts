import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AppNotification } from '../../../shared/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
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
}
