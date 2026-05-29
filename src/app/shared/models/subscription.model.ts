export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price_amount: string;
  currency: string;
  billing_interval: 'month' | 'year';
  max_technicians: number;
  max_monthly_incidents: number;
  features: string[];
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OwnerSubscription {
  id: number;
  status: 'pending' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  is_operational: boolean;
  plan: SubscriptionPlan | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterResponse {
  user: import('./user.model').User;
  tokens: import('./user.model').AuthTokens;
  requires_subscription_payment?: boolean;
  checkout_url?: string;
  checkout_session_id?: string;
  checkout_error?: string;
}
