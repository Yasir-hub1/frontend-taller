import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { PaginatedResponse } from '../../../shared/models/api.model';
import { User } from '../../../shared/models/user.model';
import { Workshop } from '../../../shared/models/workshop.model';
import { CommissionConfig, GlobalMetrics, Payment } from '../../../shared/models/payment.model';
import { Incident } from '../../../shared/models/incident.model';
import { AdminReportsPayload } from '../../../shared/models/admin-reports.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  getUsers(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<User>>('/api/admin-api/users/', params);
  }

  toggleUserActive(id: number) {
    return this.api.patch<{ is_active: boolean }>(`/api/admin-api/users/${id}/toggle-active/`, {});
  }

  getWorkshops(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Workshop>>('/api/admin-api/workshops/', params);
  }

  verifyWorkshop(id: number) {
    return this.api.patch<Workshop>(`/api/admin-api/workshops/${id}/verify/`, {});
  }

  toggleWorkshopActive(id: number) {
    return this.api.patch<unknown>(`/api/admin-api/workshops/${id}/toggle-active/`, {});
  }

  getCurrentCommission() {
    return this.api.get<CommissionConfig>('/api/admin-api/commission/current/');
  }

  getCommissionHistory() {
    return this.api.get<PaginatedResponse<CommissionConfig>>('/api/admin-api/commission/');
  }

  setCommission(body: { percentage: number; description: string; effective_from: string }) {
    return this.api.post<CommissionConfig>('/api/admin-api/commission/', body);
  }

  getMetrics() {
    return this.api.get<GlobalMetrics>('/api/admin-api/metrics/');
  }

  getAllPayments(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Payment>>('/api/admin-api/payments/', params);
  }

  getIncidents(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Incident>>('/api/admin-api/incidents/', params);
  }

  getIncident(id: number) {
    return this.api.get<Incident>(`/api/admin-api/incidents/${id}/`);
  }

  getReportsSummary(params?: Record<string, string>) {
    return this.api.get<AdminReportsPayload>('/api/admin-api/reports/', params);
  }

  downloadReportsExcel(params?: Record<string, string>) {
    return this.api.getBlob('/api/admin-api/reports/export/', params);
  }
}
