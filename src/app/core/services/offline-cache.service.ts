import { Injectable } from '@angular/core';

const PREFIX = 'app_offline_cache_v1:';

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { savedAt: string; data: T };
      return parsed.data ?? null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ savedAt: new Date().toISOString(), data }),
      );
    } catch {
      /* quota */
    }
  }

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  }
}
