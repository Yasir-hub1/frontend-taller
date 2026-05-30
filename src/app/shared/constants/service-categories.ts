import { ServiceCategory } from '../models/workshop.model';

/**
 * Códigos canónicos (backend: ServiceCategory + IncidentType de la app móvil).
 * La UI muestra etiquetas en español; al guardar se envían estos códigos en inglés.
 */
export const WORKSHOP_SERVICE_CATEGORIES: ServiceCategory[] = [
  'battery',
  'tire',
  'towing',
  'engine',
  'accident',
  'locksmith',
  'general',
];

/** Etiquetas en español — alineadas con getIncidentTypeLabel de la app móvil. */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  battery: 'Batería / eléctrico',
  tire: 'Llantas / pinchazos',
  towing: 'Remolque / grúa',
  engine: 'Motor / sobrecalentamiento',
  accident: 'Accidentes / choque',
  locksmith: 'Cerrajería (llaves)',
  general: 'Mecánica general',
};

/** Códigos antiguos en español (datos legacy) → etiqueta legible. */
const LEGACY_SERVICE_LABELS: Record<string, string> = {
  bateria: SERVICE_CATEGORY_LABELS.battery,
  batería: SERVICE_CATEGORY_LABELS.battery,
  llanta: SERVICE_CATEGORY_LABELS.tire,
  llantas: SERVICE_CATEGORY_LABELS.tire,
  remolque: SERVICE_CATEGORY_LABELS.towing,
  grua: SERVICE_CATEGORY_LABELS.towing,
  grúa: SERVICE_CATEGORY_LABELS.towing,
  motor: SERVICE_CATEGORY_LABELS.engine,
  accidente: SERVICE_CATEGORY_LABELS.accident,
  cerrajeria: SERVICE_CATEGORY_LABELS.locksmith,
  cerrajería: SERVICE_CATEGORY_LABELS.locksmith,
  overheating: 'Sobrecalentamiento',
};

export function serviceCategoryLabel(code: string | null | undefined): string {
  if (!code) return '';
  const key = String(code).trim().toLowerCase();
  if (LEGACY_SERVICE_LABELS[key]) return LEGACY_SERVICE_LABELS[key];
  if (key in SERVICE_CATEGORY_LABELS) {
    return SERVICE_CATEGORY_LABELS[key as ServiceCategory];
  }
  return code;
}

export function formatServiceCategoryList(codes: string[] | null | undefined): string {
  if (!codes?.length) return '—';
  return codes.map((c) => serviceCategoryLabel(c)).join(', ');
}
