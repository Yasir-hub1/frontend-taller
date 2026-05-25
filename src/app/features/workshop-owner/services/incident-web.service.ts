import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { QueuedMutationResult } from '../../../core/models/offline.model';
import {
  AISummary,
  AvailableIncidentRow,
  Incident,
  IncidentHistoryRow,
} from '../../../shared/models/incident.model';

const CACHE_AVAILABLE = 'web:incidents:available';
const CACHE_HISTORY = 'web:incidents:history';
const cacheDetail = (id: number) => `web:incidents:detail:${id}`;

@Injectable({ providedIn: 'root' })
export class IncidentWebService {
  private readonly api = inject(ApiService);
  private readonly offline = inject(OfflineQueueService);
  private readonly network = inject(NetworkStatusService);
  private readonly cache = inject(OfflineCacheService);

  private mutateOrQueue<T>(
    item: Parameters<OfflineQueueService['enqueue']>[0],
    online: () => Observable<T>,
  ): Observable<T | QueuedMutationResult> {
    if (!this.network.isOnline()) {
      this.offline.enqueue(item);
      return of({ queued: true });
    }
    return online();
  }

  getAvailableIncidents(): Observable<AvailableIncidentRow[]> {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<AvailableIncidentRow[]>(CACHE_AVAILABLE);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay incidentes guardados en caché.'));
    }
    return this.api.get<AvailableIncidentRow[]>('/api/web/incidents/available/').pipe(
      tap((rows) => this.cache.set(CACHE_AVAILABLE, rows)),
    );
  }

  getIncidentDetail(id: number): Observable<Incident> {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<Incident>(cacheDetail(id));
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. Abrí este incidente cuando tengas red.'));
    }
    return this.api.get<Incident>(`/api/web/incidents/${id}/`).pipe(
      tap((row) => this.cache.set(cacheDetail(id), row)),
    );
  }

  acceptIncident(
    id: number,
    payload: { technician_id: number; estimated_arrival_minutes?: number },
  ): Observable<unknown | QueuedMutationResult> {
    return this.mutateOrQueue(
      {
        scope: 'workshop',
        op: 'accept',
        targetId: id,
        payload: {
          technician_id: payload.technician_id,
          estimated_arrival_minutes: payload.estimated_arrival_minutes,
        },
      },
      () => this.api.post<unknown>(`/api/web/incidents/${id}/accept/`, payload),
    );
  }

  rejectIncident(id: number, reason: string): Observable<unknown | QueuedMutationResult> {
    return this.mutateOrQueue(
      { scope: 'workshop', op: 'reject', targetId: id, payload: { reason } },
      () => this.api.post<unknown>(`/api/web/incidents/${id}/reject/`, { reason }),
    );
  }

  updateStatus(
    id: number,
    status: 'in_route' | 'arrived' | 'in_service',
  ): Observable<unknown | QueuedMutationResult> {
    return this.mutateOrQueue(
      { scope: 'workshop', op: 'status', targetId: id, payload: { status } },
      () => this.api.patch<unknown>(`/api/web/incidents/${id}/status/`, { status }),
    );
  }

  completeService(
    id: number,
    service_cost: number,
    notes?: string,
  ): Observable<unknown | QueuedMutationResult> {
    const body = { service_cost, notes: notes ?? '' };
    return this.mutateOrQueue(
      { scope: 'workshop', op: 'complete', targetId: id, payload: body },
      () => this.api.post<unknown>(`/api/web/incidents/${id}/complete/`, body),
    );
  }

  getHistory(): Observable<IncidentHistoryRow[]> {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<IncidentHistoryRow[]>(CACHE_HISTORY);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay historial en caché.'));
    }
    return this.api.get<IncidentHistoryRow[]>('/api/web/incidents/history/').pipe(
      tap((rows) => this.cache.set(CACHE_HISTORY, rows)),
    );
  }

  sendQuote(
    incidentId: number,
    payload: {
      amount: number;
      estimated_repair_minutes: number;
      damage_description?: string;
    },
  ): Observable<{ queued?: boolean }> {
    return this.mutateOrQueue(
      { scope: 'workshop', op: 'quote', targetId: incidentId, payload },
      () => this.api.post<unknown>(`/api/web/incidents/${incidentId}/quote/`, payload),
    ).pipe(map((r) => (isQueued(r) ? { queued: true } : {})));
  }

  offlinePendingCount(): number {
    return this.offline.pendingCountValue();
  }

  parseAISummary(ai_summary: string | null): AISummary | null {
    if (!ai_summary) return null;
    try {
      return JSON.parse(ai_summary) as AISummary;
    } catch {
      return null;
    }
  }
}

function isQueued(v: unknown): v is QueuedMutationResult {
  return !!v && typeof v === 'object' && 'queued' in v;
}
