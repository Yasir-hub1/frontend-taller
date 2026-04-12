export type IncidentStatus =
  | 'pending'
  | 'analyzing'
  | 'waiting_workshop'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export type IncidentType =
  | 'battery'
  | 'tire'
  | 'accident'
  | 'engine'
  | 'locksmith'
  | 'overheating'
  | 'other'
  | 'uncertain';

export type EvidenceType = 'image' | 'audio' | 'text';

export interface Evidence {
  id: number;
  evidence_type: EvidenceType;
  file: string;
  transcription: string;
  label: string;
  image_analysis: Record<string, number> | null;
  created_at: string;
}

export interface AISummary {
  tipo_incidente?: string;
  prioridad?: string;
  resumen_breve?: string;
  servicios_requeridos?: string[];
  notas_tecnicas?: string;
  requiere_grua?: boolean;
}

export interface IncidentAssignmentEmbed {
  id: number;
  status: string;
  distance_km?: string | number;
  technician?: string | null;
}

export interface Incident {
  id: number;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  incident_type: IncidentType;
  description: string;
  latitude: string | number;
  longitude: string | number;
  address_text: string;
  ai_transcription?: string;
  ai_summary: string | null;
  ai_summary_parsed?: AISummary | null;
  ai_confidence: number | null;
  vehicle?: number | null;
  vehicle_info?: string | null;
  evidences?: Evidence[];
  client_name?: string;
  created_at: string;
  updated_at?: string;
  assignment?: IncidentAssignmentEmbed;
  closed_at?: string | null;
}

export interface AvailableIncidentRow {
  assignment_id: number;
  incident_id: number;
  client_name: string;
  vehicle: string | null;
  incident_type: string;
  priority: string | null;
  description: string;
  address: string;
  distance_km: string | number | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  created_at: string;
  offered_at: string;
}

export type AssignmentStatusCode =
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'in_route'
  | 'arrived'
  | 'in_service'
  | 'completed';

export interface IncidentHistoryRow {
  assignment_id: number;
  incident_id: number;
  assignment_status: AssignmentStatusCode;
  status: string;
  incident_type: string;
  client_name: string;
  technician: string | null;
  service_cost: string | number | null;
  distance_km: string | number | null;
  offered_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  rating_score?: number | null;
  rating_comment?: string | null;
}
