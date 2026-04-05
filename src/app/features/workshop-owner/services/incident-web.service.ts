import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import {
  AISummary,
  AvailableIncidentRow,
  Incident,
  IncidentHistoryRow,
} from '../../../shared/models/incident.model';

@Injectable({ providedIn: 'root' })
export class IncidentWebService {
  private readonly api = inject(ApiService);

  getAvailableIncidents() {
    return this.api.get<AvailableIncidentRow[]>('/api/web/incidents/available/');
  }

  getIncidentDetail(id: number) {
    return this.api.get<Incident>(`/api/web/incidents/${id}/`);
  }

  acceptIncident(id: number, payload: { technician_id: number; estimated_arrival_minutes?: number }) {
    return this.api.post<unknown>(`/api/web/incidents/${id}/accept/`, payload);
  }

  rejectIncident(id: number, reason: string) {
    return this.api.post<unknown>(`/api/web/incidents/${id}/reject/`, { reason });
  }

  updateStatus(id: number, status: 'in_route' | 'arrived' | 'in_service') {
    return this.api.patch<unknown>(`/api/web/incidents/${id}/status/`, { status });
  }

  completeService(id: number, service_cost: number, notes?: string) {
    return this.api.post<unknown>(`/api/web/incidents/${id}/complete/`, {
      service_cost,
      notes: notes ?? '',
    });
  }

  getHistory() {
    return this.api.get<IncidentHistoryRow[]>('/api/web/incidents/history/');
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
