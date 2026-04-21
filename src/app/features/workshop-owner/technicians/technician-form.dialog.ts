import { Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { ServiceCategory } from '../../../shared/models/workshop.model';
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
  host: { class: 'technician-form-dialog-host' },
  imports: [
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo técnico</h2>
    <mat-dialog-content class="dialog-body">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Nombre</mat-label>
        <input matInput [formControl]="form.controls.name" autocomplete="name" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Teléfono</mat-label>
        <input matInput [formControl]="form.controls.phone" type="tel" autocomplete="tel" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Especialidades</mat-label>
        <mat-select [formControl]="form.controls.specialties" multiple placeholder="Elegí una o más">
          @for (c of cats; track c) {
            <mat-option [value]="c">{{ c }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="app-access-block">
        <mat-slide-toggle [formControl]="form.controls.enableAppAccess" color="primary">
          Habilitar acceso a la app móvil
        </mat-slide-toggle>
        <p class="app-hint">
          Se crea un usuario con rol técnico para que ingrese desde la app (misma que usan los clientes).
        </p>
        @if (form.controls.enableAppAccess.value) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Usuario (login)</mat-label>
            <input matInput [formControl]="form.controls.app_username" autocomplete="off" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Email</mat-label>
            <input matInput [formControl]="form.controls.app_email" type="email" autocomplete="off" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Contraseña</mat-label>
            <input
              matInput
              [formControl]="form.controls.app_password"
              type="password"
              autocomplete="new-password"
            />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Confirmar contraseña</mat-label>
            <input
              matInput
              [formControl]="form.controls.app_password_confirm"
              type="password"
              autocomplete="new-password"
            />
          </mat-form-field>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      color: var(--app-text, #0f172a);
    }
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 10rem;
      padding-top: 4px !important;
    }
    .full {
      width: 100%;
    }
    .app-access-block {
      margin-top: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--app-border, #e2e8f0);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .app-hint {
      font-size: 0.8rem;
      color: var(--app-muted, #64748b);
      margin: 0.25rem 0 0.5rem;
      line-height: 1.35;
    }
  `,
})
export class TechnicianFormDialog {
  private readonly ref = inject(MatDialogRef<TechnicianFormDialog, boolean>);
  private readonly api = inject(WorkshopOwnerService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  readonly cats = CATS;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    specialties: [[] as ServiceCategory[]],
    enableAppAccess: [false],
    app_username: [''],
    app_email: [''],
    app_password: [''],
    app_password_confirm: [''],
  });

  save() {
    const appKeys = ['app_username', 'app_email', 'app_password', 'app_password_confirm'] as const;
    for (const k of appKeys) {
      const c = this.form.controls[k];
      c.clearValidators();
      c.updateValueAndValidity({ emitEvent: false });
    }

    const v = this.form.getRawValue();
    if (v.enableAppAccess) {
      this.form.controls.app_username.setValidators([Validators.required]);
      this.form.controls.app_email.setValidators([Validators.required, Validators.email]);
      this.form.controls.app_password.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.app_password_confirm.setValidators([Validators.required]);
      for (const k of appKeys) {
        this.form.controls[k].updateValueAndValidity({ emitEvent: false });
      }
    }
    if (this.messages.showFormValidationWarning(this.form)) return;

    if (v.enableAppAccess && v.app_password !== v.app_password_confirm) {
      this.messages.error('Las contraseñas no coinciden');
      return;
    }

    const payload: Record<string, unknown> = {
      name: v.name,
      phone: v.phone,
      specialties: v.specialties ?? [],
      is_available: true,
      enable_app_access: v.enableAppAccess,
    };
    if (v.enableAppAccess) {
      payload['app_username'] = v.app_username.trim();
      payload['app_email'] = v.app_email.trim();
      payload['app_password'] = v.app_password;
      payload['app_password_confirm'] = v.app_password_confirm;
    }

    this.api.createTechnician(payload).subscribe({
      next: () => {
        this.messages.success(
          v.enableAppAccess ? 'Técnico registrado con acceso a la app' : 'Técnico registrado',
        );
        this.ref.close(true);
      },
      error: (err) => this.messages.error(this.messages.parseHttpErrorPayload(err)),
    });
  }
}
