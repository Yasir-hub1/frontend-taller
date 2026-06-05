import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { MessagesService } from '../../../core/services/messages.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionPlan } from '../../../shared/models/subscription.model';
import { CurrencyPipe } from '@angular/common';

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
    MatRadioModule,
    MatIconModule,
    CurrencyPipe,
  ],
  template: `
    <div class="app-auth-page app-auth-page--scroll">
      <div class="app-auth-bg" aria-hidden="true">
        <span class="app-auth-orb app-auth-orb--1"></span>
        <span class="app-auth-orb app-auth-orb--2"></span>
        <span class="app-auth-orb app-auth-orb--3"></span>
      </div>

      <div class="app-auth-shell app-auth-shell--wide">
        <header class="app-auth-brand">
          <div class="app-auth-logo">
            <mat-icon aria-hidden="true">build_circle</mat-icon>
          </div>
          <h1 class="app-auth-brand-name">
            Mecanic
            <span>La Leyenda</span>
          </h1>
          <p class="app-auth-brand-tag">Registro de dueño de taller</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="app-auth-grid">
            <mat-card class="app-auth-card">
              <mat-card-header>
                <mat-card-title>Crear cuenta</mat-card-title>
                <span class="auth-card-sub">Completa tus datos para empezar</span>
              </mat-card-header>
              <mat-card-content>
                <p class="section-label">
                  <mat-icon aria-hidden="true">badge</mat-icon>
                  Datos de cuenta
                </p>
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

                <div class="register-actions">
                  <button mat-flat-button color="primary" type="submit" [disabled]="busy || plans().length === 0">
                    @if (busy) {
                      Procesando…
                    } @else {
                      Crear cuenta y pagar con Stripe
                    }
                  </button>
                </div>

                <p class="register-footer">
                  <a routerLink="/auth/login">← Volver al inicio de sesión</a>
                </p>
              </mat-card-content>
            </mat-card>

            <mat-card class="app-auth-card app-auth-plans-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon aria-hidden="true">payments</mat-icon>
                  Plan de suscripción
                </mat-card-title>
                <span class="auth-card-sub">Elige el plan de tu taller. Pago seguro con Stripe.</span>
              </mat-card-header>
              <mat-card-content>
                @if (plans().length === 0) {
                  <p class="warn">
                    <mat-icon aria-hidden="true">info</mat-icon>
                    No hay planes disponibles. Contacta al administrador.
                  </p>
                } @else {
                  <mat-radio-group formControlName="subscription_plan_id" class="plans">
                    @for (p of plans(); track p.id) {
                      <label class="plan-card" [class.selected]="form.value.subscription_plan_id === p.id">
                        <mat-radio-button [value]="p.id" />
                        <div class="plan-body">
                          <div class="plan-head">
                            <strong>{{ p.name }}</strong>
                            <span class="price">{{
                              p.price_amount | currency : 'USD' : 'symbol' : '1.2-2'
                            }}/{{ intervalLabel(p) }}</span>
                          </div>
                          <p class="plan-desc">{{ p.description || 'Acceso al panel de taller' }}</p>
                        </div>
                      </label>
                    }
                  </mat-radio-group>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .full {
      width: 100%;
      display: block;
      margin-bottom: 4px;
    }

    .plan-body {
      flex: 1;
      min-width: 0;
    }

    .plan-head {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .plan-head strong {
      font-size: 0.9375rem;
    }

    .price {
      font-size: 0.9375rem;
    }

    .plan-desc {
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      margin: 6px 0 0;
      line-height: 1.4;
    }

    .warn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #b45309;
      font-size: 0.875rem;
      padding: 0.75rem 0.875rem;
      border-radius: var(--app-radius-sm);
      background: var(--app-warn-bg);
      border: 1px solid rgb(251 191 36 / 35%);
    }

    .warn .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
  `,
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessagesService);
  private readonly subs = inject(SubscriptionService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly plans = signal<SubscriptionPlan[]>([]);
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
    subscription_plan_id: [0, Validators.required],
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.subs.listPublicPlans().subscribe({
      next: (list) => {
        this.plans.set(list);
        if (list.length) {
          this.form.patchValue({ subscription_plan_id: list[0].id });
        }
      },
    });
  }

  intervalLabel(p: SubscriptionPlan): string {
    return p.billing_interval === 'year' ? 'año' : 'mes';
  }

  submit() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    if (v.password !== v.password_confirm) {
      this.messages.warning('Las contraseñas no coinciden');
      return;
    }
    if (!v.subscription_plan_id) {
      this.messages.warning('Selecciona un plan de suscripción');
      return;
    }
    this.busy = true;
    this.auth.register(v).subscribe({
      next: () => {
        this.busy = false;
        this.messages.success('Redirigiendo a Stripe para completar el pago…');
      },
      error: () => (this.busy = false),
    });
  }
}
