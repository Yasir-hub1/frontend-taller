import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

/** Centro por defecto (La Paz, BO) */
export const DEFAULT_WORKSHOP_LAT = -16.4897;
export const DEFAULT_WORKSHOP_LNG = -68.1193;

@Component({
  selector: 'app-workshop-location-picker',
  standalone: true,
  template: `
    <div class="wrap" [class.compact]="compact">
      @if (compact) {
        <p class="hint hint-compact">Clic o arrastrá el marcador para fijar el punto.</p>
      } @else {
        <p class="hint">
          Usá «Centrar en mi ubicación» para acercarte a tu posición, o hacé clic en el mapa / arrastrá el
          marcador para fijar el taller.
        </p>
      }
      <div #mapEl class="map"></div>
    </div>
  `,
  styles: `
    .wrap {
      width: 100%;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 0 0 10px;
      line-height: 1.45;
    }
    .hint-compact {
      font-size: 0.75rem;
      margin: 0 0 6px;
      line-height: 1.35;
    }
    .map {
      height: clamp(220px, 42vh, 400px);
      min-height: 200px;
      width: 100%;
      border-radius: var(--app-radius-sm, 10px);
      border: 1px solid var(--app-border, #e2e8f0);
      z-index: 0;
      overflow: hidden;
    }
    .wrap.compact .map {
      height: clamp(130px, 26vh, 200px);
      min-height: 120px;
    }
  `,
})
export class WorkshopLocationPickerComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  @Input() lat = DEFAULT_WORKSHOP_LAT;
  @Input() lng = DEFAULT_WORKSHOP_LNG;
  /** Incrementar desde el padre para centrar el mapa en [lat,lng] (p. ej. tras guardar o “mi ubicación”). */
  @Input() fitTrigger = 0;
  /** Mapa más bajo y texto breve (p. ej. formulario de perfil). */
  @Input() compact = false;

  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  private static readonly ZOOM_SAVED = 16;
  private static readonly ZOOM_DEFAULT = 14;

  ngAfterViewInit() {
    fixLeafletIcons();
    const ilat = this.normLat(this.lat);
    const ilng = this.normLng(this.lng);

    this.map = L.map(this.mapEl.nativeElement).setView([ilat, ilng], WorkshopLocationPickerComponent.ZOOM_DEFAULT);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.marker = L.marker([ilat, ilng], { draggable: true, autoPan: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const p = this.marker!.getLatLng();
      this.emit(p.lat, p.lng);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker!.setLatLng(e.latlng);
      this.emit(e.latlng.lat, e.latlng.lng);
    });

    if (this.compact) {
      setTimeout(() => this.map?.invalidateSize(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map || !this.marker) return;

    if (changes['compact'] && !changes['compact'].firstChange) {
      setTimeout(() => this.map?.invalidateSize(), 0);
    }

    if (changes['fitTrigger'] && !changes['fitTrigger'].firstChange) {
      this.applyCenter(WorkshopLocationPickerComponent.ZOOM_SAVED);
      return;
    }

    if (changes['lat'] || changes['lng']) {
      const ilat = this.normLat(this.lat);
      const ilng = this.normLng(this.lng);
      const cur = this.marker.getLatLng();
      if (Math.abs(cur.lat - ilat) < 1e-7 && Math.abs(cur.lng - ilng) < 1e-7) {
        return;
      }
      this.marker.setLatLng([ilat, ilng]);
      this.map.setView([ilat, ilng], this.map.getZoom(), { animate: true });
    }
  }

  /** Centra y coloca el marcador en las coordenadas actuales de los @Input. */
  private applyCenter(zoom: number) {
    if (!this.map || !this.marker) return;
    const ilat = this.normLat(this.lat);
    const ilng = this.normLng(this.lng);
    this.marker.setLatLng([ilat, ilng]);
    this.map.setView([ilat, ilng], zoom, { animate: true });
  }

  ngOnDestroy() {
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  private normLat(v: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : DEFAULT_WORKSHOP_LAT;
  }

  private normLng(v: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : DEFAULT_WORKSHOP_LNG;
  }

  private emit(lat: number, lng: number) {
    const la = Math.round(lat * 1e7) / 1e7;
    const ln = Math.round(lng * 1e7) / 1e7;
    this.locationChange.emit({ lat: la, lng: ln });
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
