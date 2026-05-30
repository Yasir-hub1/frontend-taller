import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { defaultMarkerIcon, loadLeaflet } from '../../../core/utils/leaflet-browser';

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: `<div #mapEl class="map"></div>`,
  styles: `
    .map {
      height: 280px;
      width: 100%;
      border-radius: 8px;
    }
  `,
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  @Input() incidentLat = 0;
  @Input() incidentLng = 0;
  @Input() workshopLat: number | null = null;
  @Input() workshopLng: number | null = null;

  private map: import('leaflet').Map | null = null;

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const L = await loadLeaflet(this.platformId);
      if (!L || !this.mapEl?.nativeElement) return;

      const lat = Number(this.incidentLat);
      const lng = Number(this.incidentLng);
      const icon = defaultMarkerIcon(L);
      this.map = L.map(this.mapEl.nativeElement).setView([lat || -16.5, lng || -68.15], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);

      L.marker([lat, lng], { icon }).addTo(this.map).bindPopup('Incidente').openPopup();

      const wl = this.workshopLat != null ? Number(this.workshopLat) : null;
      const wlng = this.workshopLng != null ? Number(this.workshopLng) : null;
      if (wl != null && wlng != null && !Number.isNaN(wl) && !Number.isNaN(wlng)) {
        L.marker([wl, wlng], { icon }).addTo(this.map).bindPopup('Taller');
        L.polyline(
          [
            [lat, lng],
            [wl, wlng],
          ],
          { color: '#1976d2', weight: 3, opacity: 0.7 },
        ).addTo(this.map);
        this.map.fitBounds(
          L.latLngBounds(L.latLng(lat, lng), L.latLng(wl, wlng)),
          { padding: [40, 40] },
        );
      }
      setTimeout(() => this.map?.invalidateSize(), 0);
    } catch {
      /* mapa no disponible */
    }
  }

  ngOnDestroy() {
    this.map?.remove();
    this.map = null;
  }
}
