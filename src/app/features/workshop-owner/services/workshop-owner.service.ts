import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Workshop, Technician } from '../../../shared/models/workshop.model';

/** DRF devuelve `{ count, results }` por paginación global; normaliza a array. */
function unwrapTechnicianList(res: unknown): Technician[] {
  if (Array.isArray(res)) return res as Technician[];
  if (res && typeof res === 'object' && 'results' in res) {
    const r = (res as { results: unknown }).results;
    return Array.isArray(r) ? (r as Technician[]) : [];
  }
  return [];
}

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

  getMyWorkshop() {
    return this.api.get<Workshop>('/api/web/workshop/');
  }

  createWorkshop(body: Partial<Workshop>) {
    return this.api.post<Workshop>('/api/web/workshop/create/', body);
  }

  createWorkshopForm(formData: FormData) {
    return this.api.postForm<Workshop>('/api/web/workshop/create/', formData);
  }

  updateWorkshop(data: Partial<Workshop>) {
    return this.api.patch<Workshop>('/api/web/workshop/', data);
  }

  updateWorkshopForm(formData: FormData) {
    return this.api.patchForm<Workshop>('/api/web/workshop/', formData);
  }

  getDashboard() {
    return this.api.get<WorkshopDashboard>('/api/web/workshop/dashboard/');
  }

  getTechnicians() {
    return this.api
      .get<unknown>('/api/web/workshop/technicians/')
      .pipe(map(unwrapTechnicianList));
  }

  createTechnician(data: FormData | (Partial<Technician> & Record<string, unknown>)) {
    if (data instanceof FormData) {
      return this.api.postForm<Technician>('/api/web/workshop/technicians/', data);
    }
    return this.api.post<Technician>('/api/web/workshop/technicians/', data);
  }

  updateTechnician(id: number, data: Partial<Technician>) {
    return this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/`, data);
  }

  deleteTechnician(id: number) {
    return this.api.delete<unknown>(`/api/web/workshop/technicians/${id}/`);
  }

  patchAvailability(id: number, is_available: boolean) {
    return this.api.patch<Technician>(`/api/web/workshop/technicians/${id}/availability/`, {
      is_available,
    });
  }

  /** Crear usuario técnico (app móvil) para un técnico que aún no tiene cuenta. */
  createTechnicianAppAccess(
    id: number,
    body: {
      app_username: string;
      app_email: string;
      app_password: string;
      app_password_confirm: string;
    },
  ) {
    return this.api.post<Technician>(`/api/web/workshop/technicians/${id}/app-access/`, body);
  }

  getWorkshopEarnings() {
    return this.api.get<WorkshopEarningsResponse>('/api/web/workshop/earnings/');
  }

  getPaymentsEarnings() {
    return this.api.get<PaymentsEarningsSummary>('/api/web/payments/earnings/');
  }

  getPaymentList() {
    return this.api.get<unknown[]>('/api/web/payments/');
  }
}
