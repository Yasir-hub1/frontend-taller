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
import * as L from 'leaflet';

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

  private map: L.Map | null = null;

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    fixLeafletIcons();
    const lat = Number(this.incidentLat);
    const lng = Number(this.incidentLng);
    this.map = L.map(this.mapEl.nativeElement).setView([lat || -16.5, lng || -68.15], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    L.marker([lat, lng]).addTo(this.map).bindPopup('Incidente').openPopup();

    const wl = this.workshopLat != null ? Number(this.workshopLat) : null;
    const wlng = this.workshopLng != null ? Number(this.workshopLng) : null;
    if (wl != null && wlng != null && !Number.isNaN(wl) && !Number.isNaN(wlng)) {
      L.marker([wl, wlng]).addTo(this.map).bindPopup('Taller');
      L.polyline(
        [
          [lat, lng],
          [wl, wlng],
        ],
        { color: '#1976d2', weight: 3, opacity: 0.7 },
      ).addTo(this.map);
      this.map.fitBounds(
        L.latLngBounds(
          L.latLng(lat, lng),
          L.latLng(wl, wlng),
        ),
        { padding: [40, 40] },
      );
    }
  }

  ngOnDestroy() {
    this.map?.remove();
    this.map = null;
  }
}

function fixLeafletIcons() {
  const icon = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete icon._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}
