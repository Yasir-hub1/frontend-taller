import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  get(key: string): string | null {
    if (!this.browser) return null;
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    if (!this.browser) return;
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    if (!this.browser) return;
    localStorage.removeItem(key);
  }

  clear(): void {
    if (!this.browser) return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}
