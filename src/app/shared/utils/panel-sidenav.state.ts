import { isPlatformBrowser } from '@angular/common';
import { signal } from '@angular/core';

/** Breakpoint alineado con layouts de panel (admin / taller). */
export const PANEL_MOBILE_MEDIA = '(max-width: 959.98px)';

export function panelIsMobileViewport(platformId: object): boolean {
  if (!isPlatformBrowser(platformId)) return false;
  return window.matchMedia(PANEL_MOBILE_MEDIA).matches;
}

/** Estado colapsable del sidebar de panel (persistido en localStorage). */
export class PanelSidenavState {
  readonly collapsed = signal(false);
  readonly peek = signal(false);

  constructor(
    private readonly storageKey: string,
    private readonly platformId: object,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.collapsed.set(localStorage.getItem(this.storageKey) === '1');
    }
  }

  toggle(): void {
    this.collapsed.update((v) => {
      const next = !v;
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.storageKey, next ? '1' : '0');
      }
      return next;
    });
    this.peek.set(false);
  }

  onMouseEnter(isMobile: boolean): void {
    if (!isMobile && this.collapsed()) {
      this.peek.set(true);
    }
  }

  onMouseLeave(): void {
    this.peek.set(false);
  }

  isCompact(isMobile: boolean): boolean {
    return !isMobile && this.collapsed() && !this.peek();
  }
}
