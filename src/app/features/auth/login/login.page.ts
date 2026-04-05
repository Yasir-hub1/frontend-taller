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
  selector: 'app-login-page',
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
      <mat-card class="app-auth-card">
        <mat-card-header>
          <mat-card-title>Iniciar sesión</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="auth-hint">
            Usá tu <strong>usuario</strong> de Django (no solo el email) y tu contraseña.
          </p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Usuario</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
              />
            </mat-form-field>
            <div class="auth-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="busy">Entrar</button>
            </div>
          </form>
          <p class="auth-footer">
            ¿Dueño de taller nuevo?
            <a routerLink="/auth/register">Crear cuenta</a>
          </p>
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
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessagesService);

  busy = false;

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    this.busy = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.busy = false;
        this.messages.success('Sesión iniciada');
      },
      error: (err: { status?: number }) => {
        this.busy = false;
        if (err?.status === 401) {
          this.messages.warning('Usuario o contraseña incorrectos');
        }
      },
    });
  }
}
