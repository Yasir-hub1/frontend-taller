import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { QueuedMutationResult } from '../../../core/models/offline.model';
import { PaginatedResponse } from '../../../shared/models/api.model';
import { User } from '../../../shared/models/user.model';
import { Workshop } from '../../../shared/models/workshop.model';
import { CommissionConfig, GlobalMetrics, Payment } from '../../../shared/models/payment.model';
import { Incident } from '../../../shared/models/incident.model';
import { AdminReportsPayload } from '../../../shared/models/admin-reports.model';
import { SubscriptionPlan } from '../../../shared/models/subscription.model';
import { OperationalDashboardPayload } from '../../../shared/models/operational-dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
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

  getUsers(params?: Record<string, string>) {
    return this.cachedGet<PaginatedResponse<User>>('admin:users', '/api/admin-api/users/', params);
  }

  toggleUserActive(id: number) {
    return this.mutateOrQueue(
      { scope: 'admin', op: 'admin_user_toggle', targetId: id, payload: {} },
      () => this.api.patch<{ is_active: boolean }>(`/api/admin-api/users/${id}/toggle-active/`, {}),
    );
  }

  getWorkshops(params?: Record<string, string>) {
    return this.cachedGet<PaginatedResponse<Workshop>>(
      'admin:workshops',
      '/api/admin-api/workshops/',
      params,
    );
  }

  verifyWorkshop(id: number) {
    return this.mutateOrQueue(
      { scope: 'admin', op: 'admin_workshop_verify', targetId: id, payload: {} },
      () => this.api.patch<Workshop>(`/api/admin-api/workshops/${id}/verify/`, {}),
    );
  }

  toggleWorkshopActive(id: number) {
    return this.mutateOrQueue(
      { scope: 'admin', op: 'admin_workshop_toggle', targetId: id, payload: {} },
      () => this.api.patch<unknown>(`/api/admin-api/workshops/${id}/toggle-active/`, {}),
    );
  }

  getCurrentCommission() {
    return this.cachedGet<CommissionConfig>(
      'admin:commission:current',
      '/api/admin-api/commission/current/',
    );
  }

  getCommissionHistory() {
    return this.cachedGet<PaginatedResponse<CommissionConfig>>(
      'admin:commission:list',
      '/api/admin-api/commission/',
    );
  }

  setCommission(body: { percentage: number; description: string; effective_from: string }) {
    return this.mutateOrQueue(
      { scope: 'admin', op: 'admin_commission', targetId: 0, payload: body },
      () => this.api.post<CommissionConfig>('/api/admin-api/commission/', body),
    );
  }

  getMetrics() {
    return this.cachedGet<GlobalMetrics>('admin:metrics', '/api/admin-api/metrics/');
  }

  getOperationalDashboard(params?: Record<string, string>) {
    const key = `admin:operational:${params?.['date_from'] ?? ''}:${params?.['date_to'] ?? ''}:${params?.['workshop_id'] ?? ''}`;
    return this.cachedGet<OperationalDashboardPayload>(
      key,
      '/api/admin-api/operational-dashboard/',
      params,
    );
  }

  getAllPayments(params?: Record<string, string>) {
    return this.cachedGet<PaginatedResponse<Payment>>(
      'admin:payments',
      '/api/admin-api/payments/',
      params,
    );
  }

  getIncidents(params?: Record<string, string>) {
    return this.cachedGet<PaginatedResponse<Incident>>(
      'admin:incidents',
      '/api/admin-api/incidents/',
      params,
    );
  }

  getIncident(id: number) {
    const key = `admin:incident:${id}`;
    if (!this.network.isOnline()) {
      const cached = this.cache.get<Incident>(key);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay detalle en caché.'));
    }
    return this.api.get<Incident>(`/api/admin-api/incidents/${id}/`).pipe(
      tap((row) => this.cache.set(key, row)),
    );
  }

  getReportsSummary(params?: Record<string, string>) {
    return this.cachedGet<AdminReportsPayload>(
      'admin:reports',
      '/api/admin-api/reports/',
      params,
    );
  }

  getSubscriptionPlans() {
    return this.cachedGet<unknown>('admin:sub-plans', '/api/admin-api/subscription-plans/');
  }

  createSubscriptionPlan(body: Record<string, unknown>) {
    return this.api.post<SubscriptionPlan>('/api/admin-api/subscription-plans/', body);
  }

  updateSubscriptionPlan(id: number, body: Record<string, unknown>) {
    return this.api.patch<SubscriptionPlan>(`/api/admin-api/subscription-plans/${id}/`, body);
  }

  downloadReportsExcel(params?: Record<string, string>) {
    if (!this.network.isOnline()) {
      return throwError(
        () => new Error('La exportación Excel requiere conexión a internet.'),
      );
    }
    return this.api.getBlob('/api/admin-api/reports/export/', params);
  }

  private cachedGet<T>(cacheKey: string, path: string, params?: Record<string, string>) {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<T>(cacheKey);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay datos guardados para esta vista.'));
    }
    return this.api.get<T>(path, params).pipe(tap((data) => this.cache.set(cacheKey, data)));
  }
}
