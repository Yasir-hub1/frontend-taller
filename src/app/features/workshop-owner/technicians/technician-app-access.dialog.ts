import { Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { MessagesService } from '../../../core/services/messages.service';
import { Technician } from '../../../shared/models/workshop.model';

export interface TechnicianAppAccessDialogData {
  technician: Technician;
}

@Component({
  standalone: true,
  selector: 'app-technician-app-access-dialog',
  imports: [
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Acceso a la app móvil</h2>
    <mat-dialog-content class="dialog-body">
      <p class="hint">
        <strong>{{ data.technician.name }}</strong> podrá iniciar sesión en la app con estos datos (rol técnico).
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Usuario</mat-label>
        <input matInput [formControl]="form.controls.app_username" autocomplete="username" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Email</mat-label>
        <input matInput [formControl]="form.controls.app_email" type="email" autocomplete="email" />
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Crear cuenta</button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(400px, 92vw);
      padding-top: 4px !important;
    }
    .full {
      width: 100%;
    }
    .hint {
      font-size: 0.9rem;
      color: var(--app-muted, #64748b);
      margin: 0 0 0.75rem;
      line-height: 1.4;
    }
  `,
})
export class TechnicianAppAccessDialog {
  readonly data = inject<TechnicianAppAccessDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TechnicianAppAccessDialog, boolean>);
  private readonly api = inject(WorkshopOwnerService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  form = this.fb.nonNullable.group({
    app_username: ['', Validators.required],
    app_email: ['', [Validators.required, Validators.email]],
    app_password: ['', [Validators.required, Validators.minLength(6)]],
    app_password_confirm: ['', Validators.required],
  });

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    if (v.app_password !== v.app_password_confirm) {
      this.messages.error('Las contraseñas no coinciden');
      return;
    }
    this.api
      .createTechnicianAppAccess(this.data.technician.id, {
        app_username: v.app_username.trim(),
        app_email: v.app_email.trim(),
        app_password: v.app_password,
        app_password_confirm: v.app_password_confirm,
      })
      .subscribe({
        next: () => {
          this.messages.success('Cuenta de app creada. El técnico ya puede iniciar sesión.');
          this.ref.close(true);
        },
        error: (err) => this.messages.error(this.messages.parseHttpErrorPayload(err)),
      });
  }
}
