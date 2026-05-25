export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface AdminReportsMeta {
  date_from: string;
  date_to: string;
  generated_at: string;
}

export interface AdminReportsKpis {
  incidents_total: number;
  incidents_active: number;
  incidents_completed: number;
  incidents_cancelled: number;
  payments_settled_count: number;
  revenue_total: string;
  commission_total: string;
  workshop_net_total: string;
  resolution_rate_pct: number;
  avg_assignment_seconds: number | null;
  avg_arrival_seconds: number | null;
  avg_resolution_seconds: number | null;
  avg_ai_confidence: number | null;
  avg_rating: number | null;
  new_clients_in_period: number;
  new_workshops_in_period: number;
  verified_workshops_total: number;
  sla_compliance_pct?: number | null;
  sla_cases_measured?: number;
  incidents_unattended?: number;
  cancellation_rate_pct?: number;
}

export interface CountRow {
  count: number;
  status?: string;
  incident_type?: string;
  day?: string;
}

export interface WorkshopEfficiencyRow {
  workshop_id: number;
  name: string;
  avg_response_seconds: number;
  avg_arrival_seconds: number | null;
  completed_count: number;
  cases_count: number;
}

export interface GeoZoneRow {
  zone_key: string;
  latitude: number;
  longitude: number;
  label: string;
  count: number;
}

export interface AdminReportsCharts {
  incidents_by_status: Array<{ status: string; count: number }>;
  incidents_by_type: Array<{ incident_type: string; count: number }>;
  incidents_by_day: Array<{ day: string; count: number }>;
  assignments_by_status: Array<{ status: string; count: number }>;
  top_workshops_efficiency?: WorkshopEfficiencyRow[];
  top_geo_zones?: GeoZoneRow[];
}

export interface TopWorkshopRow {
  assignment__workshop_id: number;
  assignment__workshop__name: string;
  payments_count: number;
  revenue: string | null;
  commission: string | null;
}

export interface ReportIncidentRow {
  id: number;
  status: string;
  incident_type: string;
  priority: string | null;
  client_name: string;
  vehicle_label: string;
  created_at: string | null;
  closed_at: string | null;
  ai_confidence: number | null;
}

export interface ReportPaymentRow {
  id: number;
  assignment__incident_id: number;
  assignment__workshop__name: string;
  client_name: string;
  total_amount: string;
  commission_amount: string;
  workshop_net_amount: string;
  status: string;
  paid_at: string | null;
}

export interface AdminReportsPayload {
  meta: AdminReportsMeta;
  filters_applied: Record<string, string | null>;
  filter_options: {
    incident_status: ReportFilterOption[];
    incident_type: ReportFilterOption[];
    payment_status: ReportFilterOption[];
    assignment_status: ReportFilterOption[];
  };
  kpis: AdminReportsKpis;
  charts: AdminReportsCharts;
  top_workshops: TopWorkshopRow[];
  tables: {
    recent_incidents: ReportIncidentRow[];
    recent_payments: ReportPaymentRow[];
  };
}
