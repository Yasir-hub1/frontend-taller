import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Detalle de incidente (taller) usa JWT en localStorage y APIs autenticadas.
 * Con SSR puro, el servidor no tiene token → 401 y la vista queda vacía tras hidratar.
 * CSR evita ese primer render sin datos y el mapa Leaflet solo corre en el navegador.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'taller/incidentes/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
