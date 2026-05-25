import { OfflineSyncService } from '../services/offline-sync.service';

/** Fuerza la creación del ejecutor de cola offline al arrancar la app en el navegador. */
export function initOfflineSync(sync: OfflineSyncService) {
  return () => Promise.resolve();
}
