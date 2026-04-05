export type UserRole = 'admin' | 'workshop_owner' | 'client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  avatar: string | null;
  is_verified: boolean;
  owner_profile?: { id: number; national_id: string; stripe_account_id: string | null };
  client_profile?: unknown;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterWorkshopOwnerPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  national_id: string;
}
