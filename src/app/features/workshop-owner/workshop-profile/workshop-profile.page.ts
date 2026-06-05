import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { Workshop, ServiceCategory } from '../../../shared/models/workshop.model';
import {
  WORKSHOP_SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
} from '../../../shared/constants/service-categories';
import {
  WorkshopLocationPickerComponent,
  DEFAULT_WORKSHOP_LAT,
  DEFAULT_WORKSHOP_LNG,
} from '../components/workshop-location-picker/workshop-location-picker';
import { ActivatedRoute } from '@angular/router';
import { mediaUrl } from '../../../core/utils/media-url';
import { MessagesService } from '../../../core/services/messages.service';
import { isQueuedResult } from '../../../core/models/offline.model';

@Component({
  standalone: true,
  selector: 'app-workshop-profile',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    WorkshopLocationPickerComponent,
  ],
  template: `
    <div class="profile-page">
      <header class="profile-hero">
        <div class="profile-hero-main">
          <h1 class="app-page-title">Perfil del taller</h1>
          <p class="app-page-sub">
            Datos visibles para clientes y administración: contacto, servicios, logo y ubicación.
          </p>
        </div>
        @if (workshop) {
          <div class="profile-hero-meta">
            <span class="status-chip" [class.ok]="workshop.is_verified">
              <mat-icon aria-hidden="true">{{ workshop.is_verified ? 'verified' : 'hourglass_top' }}</mat-icon>
              {{ workshop.is_verified ? 'Verificado' : 'Pendiente de verificación' }}
            </span>
            <div class="rating-chip">
              <div class="stars-inline" [attr.aria-label]="'Promedio ' + ratingAvgLabel(workshop)">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <mat-icon [class.filled]="n <= ratingRoundedFor(workshop)">star</mat-icon>
                }
              </div>
              <span class="profile-rating-num">{{ ratingAvgLabel(workshop) }}</span>
            </div>
          </div>
        }
      </header>

      @if (route.snapshot.queryParamMap.get('pending') === 'verification') {
        <p class="alert-inline warn">
          <mat-icon aria-hidden="true">info</mat-icon>
          Tu taller aún no está verificado. Completá los datos con precisión.
        </p>
      }
      @if (route.snapshot.queryParamMap.get('need') === 'workshop') {
        <p class="alert-inline info">
          <mat-icon aria-hidden="true">storefront</mat-icon>
          Registrá tu taller para acceder a todas las funciones del panel.
        </p>
      }
      @if (pendingSync) {
        <p class="alert-inline info">
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          Cambios guardados sin conexión. Se enviarán al servidor cuando vuelva internet.
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="profile-form">
        <div class="profile-layout">
          <mat-card class="app-surface-card profile-panel profile-panel--data">
            <mat-card-header>
              <mat-card-title>
                <mat-icon aria-hidden="true">store</mat-icon>
                Datos generales
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                <mat-label>Nombre comercial</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>

              <div class="field-grid field-grid--2">
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Descripción</mat-label>
                  <textarea matInput rows="3" formControlName="description"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Dirección</mat-label>
                  <textarea matInput rows="3" formControlName="address"></textarea>
                </mat-form-field>
              </div>

              <div class="field-grid field-grid--3">
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="phone" type="tel" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Radio de cobertura (km)</mat-label>
                  <input matInput type="number" formControlName="radius_km" />
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                <mat-label>Servicios que ofrece el taller</mat-label>
                <mat-select formControlName="services" multiple>
                  @for (c of cats; track c) {
                    <mat-option [value]="c">{{ serviceLabels[c] || c }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="logo-block">
                <div class="logo-block-head">
                  <mat-icon aria-hidden="true">image</mat-icon>
                  <div>
                    <span class="logo-heading">Logo del taller</span>
                    <p class="hint-logo">JPG, PNG o WebP · opcional</p>
                  </div>
                </div>
                <div class="logo-row">
                  <input
                    #logoInput
                    type="file"
                    accept="image/*"
                    class="hidden-file"
                    (change)="onLogoSelected($event)"
                  />
                  @if (logoPreviewUrl || workshop?.logo) {
                    <div class="logo-thumb" title="Vista previa">
                      <img
                        [src]="logoPreviewUrl || mediaUrl(workshop?.logo ?? null)"
                        alt="Logo del taller"
                      />
                    </div>
                  } @else {
                    <div class="logo-placeholder" aria-hidden="true">
                      <mat-icon>add_photo_alternate</mat-icon>
                    </div>
                  }
                  <button mat-stroked-button type="button" (click)="logoInput.click()">
                    {{ logoPreviewUrl || workshop?.logo ? 'Cambiar logo' : 'Elegir imagen' }}
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="app-surface-card profile-panel profile-panel--map">
            <mat-card-header>
              <mat-card-title>
                <mat-icon aria-hidden="true">location_on</mat-icon>
                Ubicación
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="location-desc">
                Marcá en el mapa dónde opera tu taller. Podés usar GPS o arrastrar el pin.
              </p>
              <div class="map-toolbar">
                <button mat-stroked-button type="button" color="primary" (click)="useMyLocation()">
                  <mat-icon>my_location</mat-icon>
                  Usar mi ubicación
                </button>
              </div>

              <app-workshop-location-picker
                [profileLayout]="true"
                [lat]="num(form.controls.latitude.value)"
                [lng]="num(form.controls.longitude.value)"
                [fitTrigger]="mapFitTrigger"
                (locationChange)="onLocationPicked($event)"
              />

              <div class="coords-grid">
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Latitud</mat-label>
                  <input matInput type="number" step="0.0000001" formControlName="latitude" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>Longitud</mat-label>
                  <input matInput type="number" step="0.0000001" formControlName="longitude" />
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="form-actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            <mat-icon>{{ isRegistered || pendingSync ? 'save' : 'add_business' }}</mat-icon>
            {{ saving ? 'Guardando…' : isRegistered || pendingSync ? 'Guardar cambios' : 'Crear taller' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .profile-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .profile-hero-main .app-page-title {
      background: linear-gradient(135deg, var(--app-text) 0%, var(--app-accent) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin-bottom: 0.3rem;
    }

    .profile-hero-main .app-page-sub {
      max-width: 46ch;
      margin: 0;
    }

    .profile-hero-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.55rem;
    }

    @media (max-width: 639.98px) {
      .profile-hero-meta {
        align-items: flex-start;
        width: 100%;
      }
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--app-warn-bg);
      color: var(--app-warn-text);
      border: 1px solid rgb(251 146 60 / 22%);
    }

    .status-chip .mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .status-chip.ok {
      background: var(--app-accent-soft);
      color: var(--app-accent-hover);
      border-color: rgb(37 99 235 / 18%);
    }

    .rating-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgb(255 255 255 / 65%);
      border: 1px solid rgb(37 99 235 / 10%);
      backdrop-filter: blur(8px);
    }

    .stars-inline {
      display: flex;
      gap: 1px;
      align-items: center;
    }

    .stars-inline mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #cbd5e1;
    }

    .stars-inline mat-icon.filled {
      color: #fbbf24;
    }

    .profile-rating-num {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--app-text);
    }

    .alert-inline {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--app-radius-sm);
      font-size: 0.8125rem;
      line-height: 1.45;
      margin: 0;
    }

    .alert-inline .mat-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      font-size: 18px;
      margin-top: 1px;
    }

    .alert-inline.warn {
      background: var(--app-warn-bg);
      color: var(--app-warn-text);
      border: 1px solid rgb(251 146 60 / 22%);
    }

    .alert-inline.info {
      background: var(--app-info-bg);
      color: var(--app-info-text);
      border: 1px solid rgb(59 130 246 / 18%);
    }

    .profile-layout {
      display: grid;
      gap: 1rem;
      align-items: start;
    }

    @media (min-width: 960px) {
      .profile-layout {
        grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      }

      .profile-panel--map {
        position: sticky;
        top: 72px;
      }
    }

    .profile-panel .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 1rem;
    }

    .profile-panel .mat-mdc-card-title .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--app-accent);
    }

    .profile-form .full {
      width: 100%;
      display: block;
    }

    .profile-form mat-form-field {
      margin-bottom: 0.1rem;
    }

    .field-grid {
      display: grid;
      gap: 0 0.75rem;
      margin-bottom: 0.15rem;
    }

    @media (min-width: 720px) {
      .field-grid--2 {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (min-width: 640px) {
      .field-grid--3 {
        grid-template-columns: 1fr 1fr minmax(7rem, 9rem);
      }
    }

    @media (max-width: 639.98px) {
      .field-grid--3 {
        grid-template-columns: 1fr 1fr;
      }

      .field-grid--3 mat-form-field:last-child {
        grid-column: 1 / -1;
      }
    }

    .location-desc {
      margin: 0 0 0.65rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      line-height: 1.45;
    }

    .map-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
    }

    .map-toolbar button mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      margin-right: 4px;
    }

    .coords-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
      margin-top: 0.75rem;
    }

    @media (max-width: 480px) {
      .coords-grid {
        grid-template-columns: 1fr;
      }
    }

    .logo-block {
      margin-top: 0.75rem;
      padding: 0.85rem;
      border: 1px solid rgb(37 99 235 / 10%);
      border-radius: var(--app-radius-sm);
      background: rgb(255 255 255 / 45%);
    }

    .logo-block-head {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
    }

    .logo-block-head .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--app-accent);
      margin-top: 2px;
    }

    .logo-heading {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--app-text);
    }

    .hint-logo {
      font-size: 0.6875rem;
      color: var(--app-text-muted);
      margin: 0.15rem 0 0;
    }

    .logo-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-thumb,
    .logo-placeholder {
      width: 64px;
      height: 64px;
      flex-shrink: 0;
      border-radius: 12px;
      border: 1px solid rgb(37 99 235 / 12%);
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .logo-placeholder .mat-icon {
      color: var(--app-text-muted);
      opacity: 0.55;
    }

    .logo-thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .hidden-file {
      display: none;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding: 0.25rem 0 0.5rem;
    }

    .form-actions button {
      width: 100%;
      min-height: 46px;
      font-weight: 600;
      border-radius: 12px !important;
    }

    .form-actions button mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      margin-right: 4px;
    }

    @media (min-width: 520px) {
      .form-actions button {
        width: auto;
        min-width: 200px;
      }
    }
  `,
})
export class WorkshopProfilePage implements OnInit, OnDestroy {
  readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkshopOwnerService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly messages = inject(MessagesService);

  workshop: Workshop | null = null;
  pendingSync = false;
  /** Taller ya existe en el servidor (id > 0). */
  get isRegistered(): boolean {
    return !!this.workshop?.id && this.workshop.id > 0;
  }
  cats = WORKSHOP_SERVICE_CATEGORIES;
  readonly serviceLabels = SERVICE_CATEGORY_LABELS;
  saving = false;
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  /** Se incrementa para que el mapa centre y muestre las coords del formulario (guardado, GPS, carga API). */
  mapFitTrigger = 0;

  ratingRoundedFor(w: Workshop): number {
    const v = Number(w.rating_avg);
    if (!Number.isFinite(v)) return 0;
    return Math.min(5, Math.max(0, Math.round(v)));
  }

  ratingAvgLabel(w: Workshop): string {
    const v = Number(w.rating_avg);
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(2)} / 5`;
  }

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    address: ['', Validators.required],
    latitude: [DEFAULT_WORKSHOP_LAT, Validators.required],
    longitude: [DEFAULT_WORKSHOP_LNG, Validators.required],
    phone: ['', Validators.required],
    email: [''],
    radius_km: [15, Validators.required],
    services: [[] as ServiceCategory[]],
  });

  ngOnInit() {
    this.pendingSync = this.api.hasPendingWorkshopSync();
    this.api.getMyWorkshop().subscribe({
      next: (w) => {
        this.workshop = w.id > 0 ? w : null;
        this.pendingSync = this.api.hasPendingWorkshopSync() || w.id <= 0;
        if (this.pendingSync && w.id <= 0) {
          this.workshop = w;
        }
        this.applyWorkshopToForm(w);
      },
      error: () => {
        const draft = this.api.getWorkshopDraft();
        if (draft) {
          this.workshop = draft.id > 0 ? draft : null;
          this.pendingSync = true;
          this.applyWorkshopToForm(draft);
          return;
        }
        this.workshop = null;
        this.logoFile = null;
        this.clearLogoPreview();
        this.form.patchValue({
          latitude: DEFAULT_WORKSHOP_LAT,
          longitude: DEFAULT_WORKSHOP_LNG,
        });
        this.tryGeolocationForInitialCenter();
      },
    });
  }

  private applyWorkshopToForm(w: Workshop) {
    this.logoFile = null;
    this.clearLogoPreview();
    this.form.patchValue({
      name: w.name,
      description: w.description,
      address: w.address,
      latitude: Number(w.latitude),
      longitude: Number(w.longitude),
      phone: w.phone,
      email: w.email,
      radius_km: w.radius_km,
      services: (w.services as ServiceCategory[]) ?? [],
    });
    this.mapFitTrigger++;
  }

  ngOnDestroy() {
    this.clearLogoPreview();
  }

  num(v: number | null) {
    return Number(v ?? 0);
  }

  onLocationPicked(e: { lat: number; lng: number }) {
    this.form.patchValue({ latitude: e.lat, longitude: e.lng }, { emitEvent: true });
  }

  /** Centra el mapa en la posición del dispositivo (navegador). */
  useMyLocation() {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.form.patchValue({ latitude: lat, longitude: lng });
        this.mapFitTrigger++;
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  /** Si aún no hay taller, intenta abrir el mapa cerca del usuario. */
  private tryGeolocationForInitialCenter() {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        this.mapFitTrigger++;
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  onLogoSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.clearLogoPreview();
    this.logoFile = file;
    this.logoPreviewUrl = URL.createObjectURL(file);
  }

  private clearLogoPreview() {
    if (this.logoPreviewUrl) {
      URL.revokeObjectURL(this.logoPreviewUrl);
      this.logoPreviewUrl = null;
    }
  }

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const wasNew = !this.workshop;
    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('name', v.name);
    fd.append('description', v.description ?? '');
    fd.append('address', v.address);
    fd.append('latitude', String(v.latitude));
    fd.append('longitude', String(v.longitude));
    fd.append('phone', v.phone);
    fd.append('email', v.email ?? '');
    fd.append('radius_km', String(v.radius_km));
    fd.append('services', JSON.stringify(v.services ?? []));
    if (this.logoFile) {
      fd.append('logo', this.logoFile, this.logoFile.name);
    }

    this.saving = true;
    const done = (w: Workshop) => {
      this.workshop = w.id > 0 ? w : this.workshop;
      if (w.id > 0) this.workshop = w;
      this.logoFile = null;
      this.clearLogoPreview();
      this.applyWorkshopToForm(w);
      this.saving = false;
    };
    const err = () => (this.saving = false);

    const mode = this.isRegistered ? 'update' : 'create';
    this.api.saveWorkshopForm(mode, fd, this.logoFile, this.workshop).subscribe({
      next: (res) => {
        if (isQueuedResult(res) && 'workshop' in res) {
          this.pendingSync = true;
          done(res.workshop);
          this.messages.mutationSuccess(
            res,
            wasNew ? 'Taller creado correctamente' : 'Taller actualizado correctamente',
          );
          return;
        }
        this.pendingSync = false;
        done(res as Workshop);
        this.messages.mutationSuccess(
          res,
          wasNew ? 'Taller creado correctamente' : 'Taller actualizado correctamente',
        );
      },
      error: err,
    });
  }

  protected readonly mediaUrl = mediaUrl;
}
