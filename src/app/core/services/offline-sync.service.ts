import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineQueueItem, OfflineQueueService } from './offline-queue.service';
import {
  WorkshopFormPayload,
  buildWorkshopFormData,
} from '../utils/offline-form.util';
import { Workshop } from '../../shared/models/workshop.model';
import { Technician } from '../../shared/models/workshop.model';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly api = inject(ApiService);
  private readonly queue = inject(OfflineQueueService);

  constructor() {
    this.queue.setExecutor((item) => this.execute(item));
  }

  async execute(item: OfflineQueueItem): Promise<void> {
    const id = item.targetId;
    const p = item.payload;

    switch (item.op) {
      case 'accept':
        await firstValueFrom(
          this.api.post(`/api/web/incidents/${id}/accept/`, {
            technician_id: p['technician_id'],
            estimated_arrival_minutes: p['estimated_arrival_minutes'],
          }),
        );
        return;
      case 'reject':
        await firstValueFrom(
          this.api.post(`/api/web/incidents/${id}/reject/`, { reason: p['reason'] }),
        );
        return;
      case 'status':
        await firstValueFrom(
          this.api.patch(`/api/web/incidents/${id}/status/`, { status: p['status'] }),
        );
        return;
      case 'complete':
        await firstValueFrom(
          this.api.post(`/api/web/incidents/${id}/complete/`, {
            service_cost: p['service_cost'],
            notes: p['notes'] ?? '',
          }),
        );
        return;
      case 'quote':
        await firstValueFrom(this.api.post(`/api/web/incidents/${id}/quote/`, p));
        return;
      case 'workshop_create': {
        const w = await firstValueFrom(
          this.api.postForm<Workshop>(
            '/api/web/workshop/create/',
            buildWorkshopFormData(p as unknown as WorkshopFormPayload),
          ),
        );
        this.cacheWorkshopAfterSync(w);
        return;
      }
      case 'workshop_update': {
        const w = await firstValueFrom(
          this.api.patchForm<Workshop>(
            '/api/web/workshop/',
            buildWorkshopFormData(p as unknown as WorkshopFormPayload),
          ),
        );
        this.cacheWorkshopAfterSync(w);
        return;
      }
      case 'technician_create':
        await firstValueFrom(this.api.post<Technician>('/api/web/workshop/technicians/', p));
        return;
      case 'technician_update':
        await firstValueFrom(
          this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/`, p),
        );
        return;
      case 'technician_delete':
        await firstValueFrom(this.api.delete<unknown>(`/api/web/workshop/technicians/${id}/`));
        return;
      case 'technician_availability':
        await firstValueFrom(
          this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/availability/`, {
            is_available: p['is_available'],
          }),
        );
        return;
      case 'technician_app_access':
        await firstValueFrom(
          this.api.post<Technician>(`/api/web/workshop/technicians/${id}/app-access/`, p),
        );
        return;
      case 'admin_commission':
        await firstValueFrom(this.api.post('/api/admin-api/commission/', p));
        return;
      case 'admin_workshop_verify':
        await firstValueFrom(this.api.patch(`/api/admin-api/workshops/${id}/verify/`, {}));
        return;
      case 'admin_workshop_toggle':
        await firstValueFrom(this.api.patch(`/api/admin-api/workshops/${id}/toggle-active/`, {}));
        return;
      case 'admin_user_toggle':
        await firstValueFrom(this.api.patch(`/api/admin-api/users/${id}/toggle-active/`, {}));
        return;
      default:
        throw new Error(`Operación offline desconocida: ${item.op}`);
    }
  }

  private cacheWorkshopAfterSync(w: Workshop): void {
    try {
      localStorage.setItem(
        'app_offline_cache_v1:web:workshop:me',
        JSON.stringify({ savedAt: new Date().toISOString(), data: w }),
      );
      localStorage.removeItem('app_offline_cache_v1:web:workshop:draft');
    } catch {
      /* quota */
    }
  }
}
