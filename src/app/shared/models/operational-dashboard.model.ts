export interface OperationalDashboardMeta {
  date_from: string;
  date_to: string;
  generated_at: string;
}

export interface WorkshopFilterOption {
  id: number;
  name: string;
}

export interface OperationalKpis {
  incidents_total: number;
  incidents_active: number;
  incidents_completed: number;
  resolution_rate_pct: number;
  verified_workshops_total: number;
  avg_report_to_assignment_seconds: number | null;
  avg_assignment_seconds: number | null;
  avg_arrival_seconds: number | null;
  avg_assignment_to_arrival_seconds: number | null;
  avg_resolution_seconds: number | null;
  avg_assignment_seconds_completed_only: number | null;
  avg_arrival_seconds_completed_only: number | null;
  assignments_with_accepted_count: number;
  assignments_with_arrival_count: number;
  sla_compliance_pct: number | null;
  sla_cases_measured: number;
  sla_cases_met: number;
  sla_default_minutes: number;
  incidents_cancelled: number;
  incidents_unattended: number;
  cancellation_rate_pct: number;
}

export interface TypeGroupRow {
  label: string;
  count: number;
}

export interface GeoZoneRow {
  zone_key: string;
  latitude: number;
  longitude: number;
  label: string;
  count: number;
}

export interface WorkshopEfficiencyRow {
  workshop_id: number;
  name: string;
  avg_response_seconds: number;
  avg_arrival_seconds: number | null;
  completed_count: number;
  cases_count: number;
}

export interface OperationalDashboardPayload {
  meta: OperationalDashboardMeta;
  filters_applied: Record<string, string | null>;
  workshops_filter: WorkshopFilterOption[];
  kpis: OperationalKpis;
  charts: {
    incidents_by_type_grouped: TypeGroupRow[];
    incidents_by_day: Array<{ day: string; count: number }>;
    top_workshops_efficiency: WorkshopEfficiencyRow[];
    top_geo_zones: GeoZoneRow[];
    incidents_by_status: Array<{ status: string; count: number }>;
  };
}
