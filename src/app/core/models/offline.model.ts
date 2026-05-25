import { Technician, Workshop } from '../../shared/models/workshop.model';

/** Respuesta estándar cuando una acción quedó en cola por falta de red. */
export type QueuedMutationResult = { queued: true };

export type QueuedWorkshopResult = QueuedMutationResult & { workshop: Workshop };

export type QueuedTechnicianResult = QueuedMutationResult & { technician: Technician };

export function isQueuedResult(v: unknown): v is QueuedMutationResult {
  return !!v && typeof v === 'object' && 'queued' in v && (v as QueuedMutationResult).queued === true;
}
