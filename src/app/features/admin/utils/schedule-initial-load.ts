import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

/**
 * Returns true when running in a browser context.
 * Use in ngOnInit to guard HTTP calls from SSR execution:
 *   ngOnInit() { if (shouldLoad()) this.load(); }
 */
export function shouldLoad(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}
