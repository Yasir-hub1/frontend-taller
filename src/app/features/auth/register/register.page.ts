import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
  ],
  template: `
    <div class="app-auth-page">
      <mat-card class="app-auth-card app-auth-card-wide">
        <mat-card-header>
          <mat-card-title>Registro — dueño de taller</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Usuario (login)</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>
            <div class="app-form-grid-2">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="first_name" autocomplete="given-name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Apellido</mat-label>
                <input matInput formControlName="last_name" autocomplete="family-name" />
              </mat-form-field>
            </div>
            <div class="app-form-grid-2">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="phone" autocomplete="tel" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Documento de identidad</mat-label>
                <input matInput formControlName="national_id" />
              </mat-form-field>
            </div>
            <div class="app-form-grid-2">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Contraseña</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Confirmar contraseña</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="password_confirm"
                  autocomplete="new-password"
                />
              </mat-form-field>
            </div>
            <div class="auth-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="busy">
                Crear cuenta
              </button>
            </div>
          </form>
          <p class="auth-footer"><a routerLink="/auth/login">Volver al inicio de sesión</a></p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .full {
      width: 100%;
      display: block;
      margin-bottom: 4px;
    }
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessagesService);

  busy = false;

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone: ['', Validators.required],
    national_id: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_confirm: ['', Validators.required],
  });

  submit() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    if (v.password !== v.password_confirm) {
      this.messages.warning('Las contraseñas no coinciden');
      return;
    }
    this.busy = true;
    this.auth.register(v).subscribe({
      next: () => {
        this.busy = false;
        this.messages.success('Cuenta creada correctamente');
      },
      error: () => (this.busy = false),
    });
  }
}
