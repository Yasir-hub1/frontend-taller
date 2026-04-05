import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { Workshop, ServiceCategory } from '../../../shared/models/workshop.model';
import {
  WorkshopLocationPickerComponent,
  DEFAULT_WORKSHOP_LAT,
  DEFAULT_WORKSHOP_LNG,
} from '../components/workshop-location-picker/workshop-location-picker';
import { ActivatedRoute } from '@angular/router';
import { mediaUrl } from '../../../core/utils/media-url';
import { MessagesService } from '../../../core/services/messages.service';

const CATS: ServiceCategory[] = [
  'battery',
  'tire',
  'towing',
  'engine',
  'accident',
  'locksmith',
  'general',
];

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
    WorkshopLocationPickerComponent,
  ],
  template: `
    <header class="app-page-head profile-head">
      <h1 class="app-page-title">Perfil del taller</h1>
      <p class="app-page-sub profile-head-sub">
        Datos para clientes y administración. Ubicación, servicios y logo.
      </p>
      @if (workshop) {
        <p class="status-chip" [class.ok]="workshop.is_verified">
          {{ workshop.is_verified ? 'Verificado' : 'Pendiente de verificación' }}
        </p>
      }
    </header>
    @if (route.snapshot.queryParamMap.get('pending') === 'verification') {
      <p class="alert-inline warn">Tu taller aún no está verificado. Completá los datos con precisión.</p>
    }
    @if (route.snapshot.queryParamMap.get('need') === 'workshop') {
      <p class="alert-inline info">Registrá tu taller para acceder a todas las funciones del panel.</p>
    }
    <mat-card class="mt app-surface-card profile-card">
      <mat-card-header class="profile-card-head">
        <mat-card-title>Datos generales</mat-card-title>
      </mat-card-header>
      <mat-card-content class="profile-card-body">
        <form [formGroup]="form" (ngSubmit)="save()" class="profile-form">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Nombre comercial</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <div class="form-grid-desc-addr">
            <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="2" formControlName="description"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
              <mat-label>Dirección</mat-label>
              <textarea matInput rows="2" formControlName="address"></textarea>
            </mat-form-field>
          </div>
          <div class="form-row-contact">
            <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
              <mat-label>Teléfono</mat-label>
              <input matInput formControlName="phone" type="tel" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full field-radius" subscriptSizing="dynamic">
              <mat-label>Radio (km)</mat-label>
              <input matInput type="number" formControlName="radius_km" />
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Servicios</mat-label>
            <mat-select formControlName="services" multiple>
              @for (c of cats; track c) {
                <mat-option [value]="c">{{ c }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="location-section">
            <div class="location-head">
              <h2 class="location-title">Ubicación</h2>
              <button
                mat-stroked-button
                type="button"
                color="primary"
                class="btn-gps"
                (click)="useMyLocation()"
              >
                Mi ubicación
              </button>
            </div>
            <p class="location-desc">GPS o clic en el mapa para ajustar coordenadas.</p>
            <app-workshop-location-picker
              [compact]="true"
              [lat]="num(form.controls.latitude.value)"
              [lng]="num(form.controls.longitude.value)"
              [fitTrigger]="mapFitTrigger"
              (locationChange)="onLocationPicked($event)"
            />
            <div class="row-coords">
              <mat-form-field appearance="outline" class="half" subscriptSizing="dynamic">
                <mat-label>Latitud</mat-label>
                <input matInput type="number" step="0.0000001" formControlName="latitude" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="half" subscriptSizing="dynamic">
                <mat-label>Longitud</mat-label>
                <input matInput type="number" step="0.0000001" formControlName="longitude" />
              </mat-form-field>
            </div>
          </div>

          <div class="logo-block">
            <span class="logo-heading">Logo</span>
            <div class="logo-row">
              <input
                #logoInput
                type="file"
                accept="image/*"
                class="hidden-file"
                (change)="onLogoSelected($event)"
              />
              <button mat-stroked-button type="button" (click)="logoInput.click()">Elegir</button>
              @if (logoPreviewUrl || workshop?.logo) {
                <div class="logo-thumb" title="Vista previa">
                  <img
                    [src]="logoPreviewUrl || mediaUrl(workshop?.logo ?? null)"
                    alt="Logo del taller"
                  />
                </div>
              }
            </div>
            <p class="hint-logo">JPG, PNG o WebP · opcional</p>
          </div>

          <div class="form-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving">
              {{ workshop ? 'Guardar cambios' : 'Crear taller' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
    <mat-card class="mt app-surface-card stripe-card profile-stripe">
      <mat-card-header><mat-card-title>Pagos (Stripe)</mat-card-title></mat-card-header>
      <mat-card-content>
        <p class="muted">
          La cuenta Stripe se configura en el backend. Cuando expongas el onboarding, definí
          <code>environment.stripePublishableKey</code> en el front.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .profile-head {
      margin-bottom: 0.85rem;
    }
    .profile-head-sub {
      font-size: 0.8125rem;
      max-width: 40rem;
    }
    .status-chip {
      display: inline-block;
      margin: 0.35rem 0 0;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--app-warn-bg, #fff7ed);
      color: var(--app-warn-text, #9a3412);
    }
    .status-chip.ok {
      background: var(--app-accent-soft, #ccfbf1);
      color: var(--app-accent-hover, #0f766e);
    }
    .alert-inline {
      padding: 0.5rem 0.75rem;
      border-radius: var(--app-radius-sm, 10px);
      font-size: 0.8125rem;
      line-height: 1.4;
      margin: 0 0 0.65rem;
    }
    .alert-inline.warn {
      background: var(--app-warn-bg, #fff7ed);
      color: var(--app-warn-text, #9a3412);
      border: 1px solid rgb(251 146 60 / 22%);
    }
    .alert-inline.info {
      background: var(--app-info-bg, #eff6ff);
      color: var(--app-info-text, #1d4ed8);
      border: 1px solid rgb(59 130 246 / 18%);
    }
    .profile-card .profile-card-head {
      padding-bottom: 0;
    }
    .profile-card .mat-mdc-card-title {
      font-size: 1rem;
    }
    .profile-card-body {
      padding-top: 0.5rem !important;
    }
    .profile-form .full {
      width: 100%;
      display: block;
    }
    .profile-form mat-form-field {
      margin-bottom: 0.15rem;
    }
    .form-grid-desc-addr {
      display: grid;
      gap: 0 0.75rem;
      margin-bottom: 0.15rem;
    }
    @media (min-width: 720px) {
      .form-grid-desc-addr {
        grid-template-columns: 1fr 1fr;
      }
    }
    .form-row-contact {
      display: grid;
      gap: 0 0.75rem;
      margin-bottom: 0.15rem;
    }
    @media (min-width: 600px) {
      .form-row-contact {
        grid-template-columns: 1fr 1fr minmax(5.5rem, 6.5rem);
      }
    }
    .field-radius {
      max-width: none;
    }
    @media (max-width: 599.98px) {
      .field-radius {
        max-width: 8rem;
      }
    }
    .row-coords {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
      margin-top: 0.35rem;
    }
    @media (max-width: 520px) {
      .row-coords {
        grid-template-columns: 1fr;
      }
    }
    .half {
      width: 100%;
    }
    .mt {
      margin-top: 0.85rem;
    }
    .muted {
      color: var(--app-text-muted, #64748b);
      font-size: 0.8125rem;
      line-height: 1.45;
      margin: 0;
    }
    .profile-stripe .mat-mdc-card-header {
      padding-bottom: 0;
    }
    .profile-stripe .mat-mdc-card-content {
      padding-top: 0.35rem !important;
    }
    .stripe-card code {
      font-size: 0.8em;
      padding: 0.15em 0.4em;
      border-radius: 6px;
      background: var(--app-bg-elevated, #f8fafc);
    }
    .hidden-file {
      display: none;
    }
    .logo-block {
      margin: 0.65rem 0 0.35rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid var(--app-border, #e2e8f0);
      border-radius: var(--app-radius-sm, 10px);
      background: var(--app-bg-elevated, #f8fafc);
    }
    .logo-heading {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted, #64748b);
      margin-bottom: 0.4rem;
    }
    .logo-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
    }
    .logo-thumb {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      border-radius: 8px;
      border: 1px solid var(--app-border, #e2e8f0);
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo-thumb img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .hint-logo {
      font-size: 0.6875rem;
      color: var(--app-text-muted, #64748b);
      margin: 0.35rem 0 0;
    }
    .location-section {
      margin: 0.65rem 0 0.35rem;
      padding: 0.6rem 0.65rem;
      border: 1px solid var(--app-border, #e2e8f0);
      border-radius: var(--app-radius-sm, 10px);
      background: var(--app-bg-elevated, #f8fafc);
    }
    .location-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem 0.75rem;
      margin-bottom: 0.25rem;
    }
    .location-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .btn-gps {
      flex-shrink: 0;
      font-size: 0.8125rem;
      line-height: 1.2;
      min-height: 36px;
      padding: 0 0.75rem;
    }
    .location-desc {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
      line-height: 1.35;
    }
    .form-actions {
      margin-top: 0.75rem;
      padding-top: 0.25rem;
    }
    .form-actions button {
      width: 100%;
      min-height: 44px;
      font-weight: 600;
    }
    @media (min-width: 480px) {
      .form-actions button {
        width: auto;
        min-width: 180px;
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
  cats = CATS;
  saving = false;
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  /** Se incrementa para que el mapa centre y muestre las coords del formulario (guardado, GPS, carga API). */
  mapFitTrigger = 0;

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
    this.api.getMyWorkshop().subscribe({
      next: (w) => {
        this.workshop = w;
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
      },
      error: () => {
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
      this.workshop = w;
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
      this.saving = false;
      this.messages.success(
        wasNew ? 'Taller creado correctamente' : 'Taller actualizado correctamente',
      );
    };
    const err = () => (this.saving = false);

    if (this.workshop) {
      this.api.updateWorkshopForm(fd).subscribe({ next: done, error: err });
    } else {
      this.api.createWorkshopForm(fd).subscribe({ next: done, error: err });
    }
  }

  protected readonly mediaUrl = mediaUrl;
}
