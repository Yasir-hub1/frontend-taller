export interface Payment {
  id: number;
  assignment: number;
  workshop_name?: string;
  client_name?: string;
  total_amount: string;
  commission_rate: string;
  commission_amount: string;
  workshop_net_amount: string;
  status: string;
  currency?: string;
  paid_at: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface CommissionConfig {
  id: number;
  percentage: string;
  description: string;
  effective_from: string;
  created_by: number | null;
  created_by_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface GlobalMetrics {
  total_users: number;
  total_clients: number;
  total_workshops: number;
  total_incidents: number;
  incidents_this_month: number;
  total_revenue: string;
  total_commission_earned: string;
  active_incidents: number;
  completed_incidents: number;
}
