import { AdminReportsPayload } from './admin-reports.model';

export interface VoiceQueryFilters {
  date_from?: string;
  date_to?: string;
  dates_source?: string;
  workshop_id?: string;
  incident_status?: string;
  incident_type?: string;
  payment_status?: string;
  assignment_status?: string;
  report_focus?: string;
}

export interface WorkshopStatusBreakdown {
  status: string;
  status_label: string;
  count: number;
}

export interface WorkshopTypeBreakdown {
  incident_type: string;
  type_label: string;
  count: number;
}

export interface WorkshopAssignmentRow {
  id: number;
  status: string;
  status_label?: string;
  incident_id: number;
  incident_type: string;
  incident_type_label?: string;
  incident_status: string;
  incident_status_label?: string;
  client_name: string;
  vehicle_label: string;
  technician_name?: string;
  address?: string | null;
  priority?: string | null;
  distance_km?: string | null;
  service_cost?: string | null;
  offered_at: string | null;
  accepted_at?: string | null;
  completed_at: string | null;
}

export interface WorkshopReportsKpis {
  assignments_total: number;
  offered_pending: number;
  offered_in_period?: number;
  active_services: number;
  completed_in_period: number;
  rejected_in_period: number;
  payments_count: number;
  earnings_net_period: string;
  earnings_gross_period: string;
  ratings_count: number;
  ratings_avg_period: number | null;
  workshop_rating_avg: number;
  technicians_total: number;
  technicians_available: number;
  avg_response_seconds: number | null;
  avg_arrival_seconds: number | null;
  avg_resolution_seconds: number | null;
}

export interface WorkshopReportsPayload {
  meta: {
    date_from: string;
    date_to: string;
    generated_at: string;
    workshop_id: number;
    workshop_name: string;
  };
  filters_applied: Record<string, string | null>;
  filter_options?: {
    assignment_status: Array<{ value: string; label: string }>;
    incident_status: Array<{ value: string; label: string }>;
    incident_type: Array<{ value: string; label: string }>;
    payment_status: Array<{ value: string; label: string }>;
  };
  summary?: {
    narrative: string;
    status_breakdown: WorkshopStatusBreakdown[];
    type_breakdown: WorkshopTypeBreakdown[];
    list_total: number;
  };
  kpis: WorkshopReportsKpis;
  charts: {
    assignments_by_status: WorkshopStatusBreakdown[];
    incidents_by_type: WorkshopTypeBreakdown[];
  };
  tables: {
    recent_assignments: WorkshopAssignmentRow[];
    recent_payments: Array<Record<string, unknown>>;
  };
}

export interface VoiceQueryResponse {
  audience: 'admin' | 'workshop_owner';
  transcript: string;
  intent_summary: string;
  narrative_summary?: string;
  filters: VoiceQueryFilters;
  report: AdminReportsPayload | WorkshopReportsPayload;
}
