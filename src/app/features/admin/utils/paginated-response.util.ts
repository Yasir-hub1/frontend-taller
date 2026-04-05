import { PaginatedResponse } from '../../../shared/models/api.model';

/** Normaliza respuestas DRF paginadas o listas sueltas. */
export function asPaged<T>(res: unknown): { results: T[]; count: number } {
  if (Array.isArray(res)) {
    return { results: res as T[], count: (res as T[]).length };
  }
  const p = res as PaginatedResponse<T> | null | undefined;
  if (!p || typeof p !== 'object') {
    return { results: [], count: 0 };
  }
  return {
    results: Array.isArray(p.results) ? p.results : [],
    count: typeof p.count === 'number' ? p.count : 0,
  };
}
