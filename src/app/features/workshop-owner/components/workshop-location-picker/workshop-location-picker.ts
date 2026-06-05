import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { defaultMarkerIcon, loadLeaflet } from '../../../../core/utils/leaflet-browser';

/** Centro por defecto (La Paz, BO) */
export const DEFAULT_WORKSHOP_LAT = -16.4897;
export const DEFAULT_WORKSHOP_LNG = -68.1193;

type LeafletModule = typeof import('leaflet');

@Component({
  selector: 'app-workshop-location-picker',
  standalone: true,
  template: `
    <div class="wrap" [class.compact]="compact" [class.profile-layout]="profileLayout">
      @if (compact) {
        <p class="hint hint-compact">Clic o arrastrá el marcador para fijar el punto.</p>
      } @else if (!profileLayout) {
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
      border-radius: var(--app-radius-sm, 12px);
      border: 1px solid rgb(37 99 235 / 12%);
      z-index: 0;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 60%);
    }
    .wrap.compact .map {
      height: clamp(130px, 26vh, 200px);
      min-height: 120px;
    }
    .wrap.profile-layout .map {
      height: clamp(260px, 42vh, 520px);
      min-height: 240px;
      border-radius: var(--app-radius, 16px);
    }
    @media (max-width: 839.98px) {
      .wrap.profile-layout .map {
        height: clamp(220px, 38vh, 360px);
        min-height: 200px;
      }
    }
  `,
})
export class WorkshopLocationPickerComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  @Input() lat = DEFAULT_WORKSHOP_LAT;
  @Input() lng = DEFAULT_WORKSHOP_LNG;
  /** Incrementar desde el padre para centrar el mapa en [lat,lng] (p. ej. tras guardar o “mi ubicación”). */
  @Input() fitTrigger = 0;
  /** Mapa más bajo y texto breve (p. ej. formulario de perfil). */
  @Input() compact = false;
  /** Mapa alto para panel lateral del perfil de taller. */
  @Input() profileLayout = false;

  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();

  private L: LeafletModule | null = null;
  private map: import('leaflet').Map | null = null;
  private marker: import('leaflet').Marker | null = null;

  private static readonly ZOOM_SAVED = 16;
  private static readonly ZOOM_DEFAULT = 14;

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const L = await loadLeaflet(this.platformId);
      if (!L || !this.mapEl?.nativeElement) return;
      this.L = L;

      const ilat = this.normLat(this.lat);
      const ilng = this.normLng(this.lng);

      this.map = L.map(this.mapEl.nativeElement).setView(
        [ilat, ilng],
        WorkshopLocationPickerComponent.ZOOM_DEFAULT,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);

      this.marker = L.marker([ilat, ilng], {
        draggable: true,
        autoPan: true,
        icon: defaultMarkerIcon(L),
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.emit(p.lat, p.lng);
      });

      this.map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        this.marker!.setLatLng(e.latlng);
        this.emit(e.latlng.lat, e.latlng.lng);
      });

      setTimeout(() => this.map?.invalidateSize(), 0);
      if (this.compact || this.profileLayout) {
        setTimeout(() => this.map?.invalidateSize(), 200);
        if (this.profileLayout) {
          setTimeout(() => this.map?.invalidateSize(), 500);
        }
      }
    } catch {
      /* mapa no disponible (SSR o error de carga) */
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map || !this.marker) return;

    if (changes['compact'] && !changes['compact'].firstChange) {
      setTimeout(() => this.map?.invalidateSize(), 0);
    }

    if (changes['profileLayout'] && !changes['profileLayout'].firstChange) {
      setTimeout(() => this.map?.invalidateSize(), 0);
      setTimeout(() => this.map?.invalidateSize(), 250);
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
    this.L = null;
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
