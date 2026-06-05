import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatPrefix,
    MatSuffix,
    MatInput,
    MatButton,
    MatIconModule,
  ],
  template: `
    <div class="app-auth-page">
      <div class="app-auth-bg" aria-hidden="true">
        <span class="app-auth-orb app-auth-orb--1"></span>
        <span class="app-auth-orb app-auth-orb--2"></span>
        <span class="app-auth-orb app-auth-orb--3"></span>
      </div>

      <div class="app-auth-shell">
        <header class="app-auth-brand">
          <div class="app-auth-logo">
            <mat-icon aria-hidden="true">build_circle</mat-icon>
          </div>
          <h1 class="app-auth-brand-name">
            Mecanic
            <span>La Leyenda</span>
          </h1>
          <p class="app-auth-brand-tag">Panel de talleres</p>
        </header>

        <mat-card class="app-auth-card">
          <mat-card-header>
            <mat-card-title>Iniciar sesión</mat-card-title>
            <span class="auth-card-sub">Accede con tu cuenta de dueño de taller</span>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Usuario</mat-label>
                <mat-icon matPrefix aria-hidden="true">person_outline</mat-icon>
                <input matInput formControlName="username" autocomplete="username" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Contraseña</mat-label>
                <mat-icon matPrefix aria-hidden="true">lock_outline</mat-icon>
                <input
                  matInput
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  autocomplete="current-password"
                />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="hidePassword.set(!hidePassword())"
                  [attr.aria-label]="hidePassword() ? 'Mostrar contraseña' : 'Ocultar contraseña'"
                >
                  <mat-icon>{{ hidePassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
                </button>
              </mat-form-field>

              <div class="auth-actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="busy">
                  @if (busy) {
                    Entrando…
                  } @else {
                    Entrar
                  }
                </button>
              </div>
            </form>

            <p class="auth-footer">
              ¿Dueño de taller nuevo?
              <a routerLink="/auth/register">Crear cuenta</a>
            </p>
          </mat-card-content>
        </mat-card>
      </div>
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

  readonly hidePassword = signal(true);
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
