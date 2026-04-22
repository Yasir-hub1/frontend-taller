export type ServiceCategory =
  | 'bateria'
  | 'llanta'
  | 'remolque'
  | 'motor'
  | 'accidente'
  | 'cerrajeria'
  | 'general';

export interface Workshop {
  id: number;
  name: string;
  description: string;
  address: string;
  latitude: string | number;
  longitude: string | number;
  phone: string;
  email: string;
  logo: string | null;
  services: ServiceCategory[];
  radius_km: number;
  is_active: boolean;
  is_verified: boolean;
  rating_avg: string | number;
  total_services: number;
  distance_km?: number;
  technicians?: Technician[];
}

export interface Technician {
  id: number;
  workshop?: number;
  name: string;
  phone: string;
  specialties: ServiceCategory[];
  is_available: boolean;
  current_latitude: string | number | null;
  current_longitude: string | number | null;
  photo: string | null;
  /** API: cuenta vinculada para la app móvil */
  has_app_access?: boolean;
  app_username?: string | null;
}
