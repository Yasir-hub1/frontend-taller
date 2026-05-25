import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _online = signal(true);

  readonly online = this._online.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this._online.set(navigator.onLine);
    window.addEventListener('online', () => this._online.set(true));
    window.addEventListener('offline', () => this._online.set(false));
  }

  isOnline(): boolean {
    return this._online();
  }
}
