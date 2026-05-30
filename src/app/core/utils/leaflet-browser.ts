import { isPlatformBrowser } from '@angular/common';

export type LeafletNamespace = typeof import('leaflet');

let cached: LeafletNamespace | null = null;

const MARKER_ICON_OPTIONS = {
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
};

/** Resuelve el namespace de Leaflet (default export vs namespace en el bundle). */
async function importLeaflet(): Promise<LeafletNamespace> {
  const mod = await import('leaflet');
  const L = (mod as { default?: LeafletNamespace }).default ?? mod;
  return L as LeafletNamespace;
}

/** Carga Leaflet solo en el navegador (evita `window is not defined` en SSR). */
export async function loadLeaflet(platformId: object): Promise<LeafletNamespace | null> {
  if (!isPlatformBrowser(platformId)) return null;
  if (!cached) {
    cached = await importLeaflet();
    fixLeafletIcons(cached);
  }
  return cached;
}

function fixLeafletIcons(L: LeafletNamespace): void {
  try {
    const Default = L.Icon?.Default;
    if (!Default?.prototype) return;
    const icon = Default.prototype as unknown as { _getIconUrl?: string };
    delete icon._getIconUrl;
    Default.mergeOptions(MARKER_ICON_OPTIONS);
  } catch {
    /* Icon.Default no disponible en este bundle */
  }
}

/** Icono de marcador (URLs explícitas; evita Icon.Default y errores ESM/TS). */
export function defaultMarkerIcon(L: LeafletNamespace): import('leaflet').Icon {
  return L.icon(MARKER_ICON_OPTIONS);
}
