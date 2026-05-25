import { Injectable, inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import {
  QueuedMutationResult,
  QueuedTechnicianResult,
  QueuedWorkshopResult,
} from '../../../core/models/offline.model';
import { WorkshopFormPayload, formDataToWorkshopPayload } from '../../../core/utils/offline-form.util';
import { Workshop, Technician, ServiceCategory } from '../../../shared/models/workshop.model';

/** DRF devuelve `{ count, results }` por paginación global; normaliza a array. */
function unwrapTechnicianList(res: unknown): Technician[] {
  if (Array.isArray(res)) return res as Technician[];
  if (res && typeof res === 'object' && 'results' in res) {
    const r = (res as { results: unknown }).results;
    return Array.isArray(r) ? (r as Technician[]) : [];
  }
  return [];
}

const CACHE_WORKSHOP = 'web:workshop:me';
const CACHE_WORKSHOP_DRAFT = 'web:workshop:draft';
const CACHE_TECHNICIANS = 'web:workshop:technicians';

export interface WorkshopDashboard {
  total_services: number;
  pending_requests: number;
  active_services: number;
  completed_this_month: number;
  rating_avg: string;
  total_earnings: string;
  earnings_this_month: string;
  available_technicians: number;
}

export interface WorkshopEarningsResponse {
  summary: {
    total_gross: string;
    total_commission: string;
    total_net: string;
    total_payments: number;
  };
  recent_payments: Array<{
    id: number;
    incident_id: number;
    total_amount: string;
    commission_amount: string;
    net_amount: string;
    commission_rate: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
}

export interface PaymentsEarningsSummary {
  total_services: number;
  total_earnings_gross: string;
  total_commission: string;
  total_earnings_net: string;
  pending_payments: number;
  completed_payments: number;
}

@Injectable({ providedIn: 'root' })
export class WorkshopOwnerService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(OfflineCacheService);
  private readonly offline = inject(OfflineQueueService);
  private readonly network = inject(NetworkStatusService);

  getMyWorkshop(): Observable<Workshop> {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<Workshop>(CACHE_WORKSHOP);
      if (cached) return of(cached);
      const draft = this.getWorkshopDraft();
      if (draft) return of(draft);
      return throwError(() => new Error('Sin conexión. No hay datos del taller en caché.'));
    }
    return this.api.get<Workshop>('/api/web/workshop/').pipe(
      tap((w) => {
        this.cache.set(CACHE_WORKSHOP, w);
        this.cache.remove(CACHE_WORKSHOP_DRAFT);
      }),
    );
  }

  /** Borrador local (registro o edición pendiente de sincronizar). */
  getWorkshopDraft(): Workshop | null {
    return this.cache.get<Workshop>(CACHE_WORKSHOP_DRAFT);
  }

  hasPendingWorkshopSync(): boolean {
    return !!this.getWorkshopDraft();
  }

  /**
   * Crear o actualizar taller (multipart). Offline: cola + borrador optimista.
   */
  saveWorkshopForm(
    mode: 'create' | 'update',
    formData: FormData,
    logoFile?: File | null,
    existing?: Workshop | null,
  ): Observable<Workshop | QueuedWorkshopResult> {
    if (this.network.isOnline()) {
      const req =
        mode === 'create'
          ? this.api.postForm<Workshop>('/api/web/workshop/create/', formData)
          : this.api.patchForm<Workshop>('/api/web/workshop/', formData);
      return req.pipe(
        tap((w) => {
          this.cache.set(CACHE_WORKSHOP, w);
          this.cache.remove(CACHE_WORKSHOP_DRAFT);
        }),
      );
    }
    return from(formDataToWorkshopPayload(formData, logoFile)).pipe(
      switchMap((payload) => {
        const optimistic = this.buildOptimisticWorkshop(payload, existing ?? undefined);
        this.cache.set(CACHE_WORKSHOP_DRAFT, optimistic);
        this.cache.set(CACHE_WORKSHOP, optimistic);
        this.offline.enqueue({
          scope: 'workshop',
          op: mode === 'create' ? 'workshop_create' : 'workshop_update',
          targetId: existing?.id ?? 0,
          payload: payload as unknown as Record<string, unknown>,
        });
        return of({ queued: true as const, workshop: optimistic });
      }),
    );
  }

  createWorkshop(body: Partial<Workshop>) {
    if (!this.network.isOnline()) {
      return throwError(() => new Error('Usá el formulario de perfil para registrar el taller sin conexión.'));
    }
    return this.api.post<Workshop>('/api/web/workshop/create/', body);
  }

  createWorkshopForm(formData: FormData) {
    return this.saveWorkshopForm('create', formData);
  }

  updateWorkshop(data: Partial<Workshop>) {
    if (!this.network.isOnline()) {
      return throwError(() => new Error('Sin conexión. Usá guardar en el perfil del taller.'));
    }
    return this.api.patch<Workshop>('/api/web/workshop/', data);
  }

  updateWorkshopForm(formData: FormData, existing?: Workshop | null) {
    return this.saveWorkshopForm('update', formData, null, existing);
  }

  getDashboard(): Observable<WorkshopDashboard> {
    const key = 'web:workshop:dashboard';
    if (!this.network.isOnline()) {
      const cached = this.cache.get<WorkshopDashboard>(key);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay dashboard en caché.'));
    }
    return this.api
      .get<WorkshopDashboard>('/api/web/workshop/dashboard/')
      .pipe(tap((d) => this.cache.set(key, d)));
  }

  getTechnicians(): Observable<Technician[]> {
    if (!this.network.isOnline()) {
      const cached = this.cache.get<Technician[]>(CACHE_TECHNICIANS);
      return of(cached ?? []);
    }
    return this.api.get<unknown>('/api/web/workshop/technicians/').pipe(
      map(unwrapTechnicianList),
      tap((list) => this.cache.set(CACHE_TECHNICIANS, list)),
    );
  }

  createTechnician(
    data: FormData | (Partial<Technician> & Record<string, unknown>),
  ): Observable<Technician | QueuedTechnicianResult | QueuedMutationResult> {
    if (data instanceof FormData) {
      if (!this.network.isOnline()) {
        return throwError(() => new Error('Sin conexión: registrá técnicos con el formulario JSON.'));
      }
      return this.api.postForm<Technician>('/api/web/workshop/technicians/', data);
    }
    return this.mutateTechnician<Technician>('technician_create', 0, data, () =>
      this.api.post<Technician>('/api/web/workshop/technicians/', data),
    );
  }

  updateTechnician(id: number, data: Partial<Technician>) {
    return this.mutateTechnician('technician_update', id, data, () =>
      this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/`, data),
    );
  }

  deleteTechnician(id: number): Observable<void | QueuedMutationResult> {
    return this.mutateTechnician<void>(
      'technician_delete',
      id,
      {},
      () => this.api.delete<void>(`/api/web/workshop/technicians/${id}/`),
      () => this.removeTechnicianFromCache(id),
    );
  }

  patchAvailability(
    id: number,
    is_available: boolean,
  ): Observable<Technician | QueuedTechnicianResult | QueuedMutationResult> {
    return this.mutateTechnician<Technician>(
      'technician_availability',
      id,
      { is_available },
      () =>
        this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/availability/`, {
          is_available,
        }),
      () => this.patchTechnicianInCache(id, { is_available }),
    );
  }

  createTechnicianAppAccess(
    id: number,
    body: {
      app_username: string;
      app_email: string;
      app_password: string;
      app_password_confirm: string;
    },
  ): Observable<Technician | QueuedTechnicianResult | QueuedMutationResult> {
    return this.mutateTechnician<Technician>('technician_app_access', id, body, () =>
      this.api.post<Technician>(`/api/web/workshop/technicians/${id}/app-access/`, body),
      () =>
        this.patchTechnicianInCache(id, {
          has_app_access: true,
          app_username: body.app_username,
        }),
    );
  }

  getWorkshopEarnings() {
    const key = 'web:workshop:earnings';
    if (!this.network.isOnline()) {
      const cached = this.cache.get<WorkshopEarningsResponse>(key);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay ingresos en caché.'));
    }
    return this.api
      .get<WorkshopEarningsResponse>('/api/web/workshop/earnings/')
      .pipe(tap((d) => this.cache.set(key, d)));
  }

  getPaymentsEarnings() {
    const key = 'web:payments:earnings';
    if (!this.network.isOnline()) {
      const cached = this.cache.get<PaymentsEarningsSummary>(key);
      return cached
        ? of(cached)
        : throwError(() => new Error('Sin conexión. No hay resumen de pagos en caché.'));
    }
    return this.api
      .get<PaymentsEarningsSummary>('/api/web/payments/earnings/')
      .pipe(tap((d) => this.cache.set(key, d)));
  }

  getPaymentList() {
    const key = 'web:payments:list';
    if (!this.network.isOnline()) {
      const cached = this.cache.get<unknown[]>(key);
      return cached ? of(cached) : of([]);
    }
    return this.api.get<unknown[]>('/api/web/payments/').pipe(tap((d) => this.cache.set(key, d)));
  }

  private mutateTechnician<T extends Technician | void = Technician>(
    op: 'technician_create' | 'technician_update' | 'technician_delete' | 'technician_availability' | 'technician_app_access',
    targetId: number,
    payload: Record<string, unknown>,
    online: () => Observable<T>,
    onQueued?: () => void,
  ): Observable<T | QueuedTechnicianResult | QueuedMutationResult> {
    if (this.network.isOnline()) {
      return online().pipe(
        tap((res) => {
          if (op === 'technician_create' && res && typeof res === 'object' && 'id' in res) {
            this.appendTechnicianToCache(res as unknown as Technician);
          } else if (op === 'technician_update' && res && typeof res === 'object') {
            this.patchTechnicianInCache(targetId, res as Partial<Technician>);
          } else if (op === 'technician_delete') {
            this.removeTechnicianFromCache(targetId);
          } else if (
            (op === 'technician_availability' || op === 'technician_app_access') &&
            res &&
            typeof res === 'object'
          ) {
            this.patchTechnicianInCache(targetId, res as Partial<Technician>);
          }
        }),
      );
    }
    onQueued?.();
    if (op === 'technician_create') {
      const optimistic = this.buildOptimisticTechnician(payload);
      this.appendTechnicianToCache(optimistic);
      this.offline.enqueue({ scope: 'workshop', op, targetId: 0, payload });
      return of({ queued: true as const, technician: optimistic });
    }
    this.offline.enqueue({ scope: 'workshop', op, targetId, payload });
    const cached = this.findTechnicianInCache(targetId);
    if (cached && op !== 'technician_delete') {
      return of({
        queued: true as const,
        technician: { ...cached, ...payload } as Technician,
      });
    }
    return of({ queued: true });
  }

  private findTechnicianInCache(id: number): Technician | undefined {
    return (this.cache.get<Technician[]>(CACHE_TECHNICIANS) ?? []).find((x) => x.id === id);
  }

  private buildOptimisticWorkshop(payload: WorkshopFormPayload, existing?: Workshop): Workshop {
    let services: ServiceCategory[] = [];
    try {
      services = JSON.parse(payload.services) as ServiceCategory[];
    } catch {
      services = [];
    }
    return {
      id: existing?.id ?? 0,
      name: payload.name,
      description: payload.description,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      phone: payload.phone,
      email: payload.email,
      logo: payload.logo?.dataUrl ?? existing?.logo ?? null,
      services,
      radius_km: Number(payload.radius_km) || 15,
      is_active: existing?.is_active ?? true,
      is_verified: existing?.is_verified ?? false,
      rating_avg: existing?.rating_avg ?? '0',
      total_services: existing?.total_services ?? 0,
    };
  }

  private buildOptimisticTechnician(payload: Record<string, unknown>): Technician {
    const tempId = -Date.now();
    return {
      id: tempId,
      name: String(payload['name'] ?? ''),
      phone: String(payload['phone'] ?? ''),
      specialties: (payload['specialties'] as ServiceCategory[]) ?? [],
      is_available: Boolean(payload['is_available'] ?? true),
      current_latitude: null,
      current_longitude: null,
      photo: null,
      has_app_access: Boolean(payload['enable_app_access']),
      app_username: payload['enable_app_access'] ? String(payload['app_username'] ?? '') : null,
    };
  }

  private appendTechnicianToCache(t: Technician): void {
    const list = [...(this.cache.get<Technician[]>(CACHE_TECHNICIANS) ?? [])];
    const idx = list.findIndex((x) => x.id === t.id);
    if (idx >= 0) list[idx] = t;
    else list.push(t);
    this.cache.set(CACHE_TECHNICIANS, list);
  }

  private patchTechnicianInCache(id: number, patch: Partial<Technician>): void {
    const list = (this.cache.get<Technician[]>(CACHE_TECHNICIANS) ?? []).map((x) =>
      x.id === id ? { ...x, ...patch } : x,
    );
    this.cache.set(CACHE_TECHNICIANS, list);
  }

  private removeTechnicianFromCache(id: number): void {
    const list = (this.cache.get<Technician[]>(CACHE_TECHNICIANS) ?? []).filter((x) => x.id !== id);
    this.cache.set(CACHE_TECHNICIANS, list);
  }
}
