import { isPlatformBrowser } from '@angular/common';

type LeafletModule = typeof import('leaflet');

let cached: LeafletModule | null = null;

/** Carga Leaflet solo en el navegador (evita `window is not defined` en SSR). */
export async function loadLeaflet(platformId: object): Promise<LeafletModule | null> {
  if (!isPlatformBrowser(platformId)) return null;
  if (!cached) {
    cached = await import('leaflet');
    fixLeafletIcons(cached);
  }
  return cached;
}

function fixLeafletIcons(L: LeafletModule): void {
  const icon = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete icon._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}
