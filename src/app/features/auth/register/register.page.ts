import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
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
    CurrencyPipe,
  ],
  template: `
    <div class="app-auth-page">
      <mat-card class="app-auth-card app-auth-card-wide">
        <mat-card-header>
          <mat-card-title>Registro — dueño de taller</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <p class="section-label">Datos de cuenta</p>
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

            <p class="section-label">Plan de suscripción</p>
            <p class="hint">Elige el plan que usará tu taller. El pago se realiza con Stripe de forma segura.</p>
            @if (plans().length === 0) {
              <p class="warn">No hay planes disponibles. Contacta al administrador.</p>
            } @else {
              <mat-radio-group formControlName="subscription_plan_id" class="plans">
                @for (p of plans(); track p.id) {
                  <label class="plan-card" [class.selected]="form.value.subscription_plan_id === p.id">
                    <mat-radio-button [value]="p.id" />
                    <div class="plan-body">
                      <div class="plan-head">
                        <strong>{{ p.name }}</strong>
                        <span class="price"
                          >{{ p.price_amount | currency : 'USD' : 'symbol' : '1.2-2' }}/{{ intervalLabel(p) }}</span
                        >
                      </div>
                      <p class="plan-desc">{{ p.description || 'Acceso al panel de taller' }}</p>
                    </div>
                  </label>
                }
              </mat-radio-group>
            }

            <div class="auth-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="busy || plans().length === 0">
                Crear cuenta y pagar con Stripe
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
    .section-label {
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: var(--app-text, #0f172a);
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 0 0 0.75rem;
    }
    .warn {
      color: #b45309;
      font-size: 0.875rem;
    }
    .plans {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 1rem;
    }
    .plan-card {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      border: 1px solid var(--app-border, #e2e8f0);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
    }
    .plan-card.selected {
      border-color: var(--app-accent, #0d9488);
      background: rgb(13 148 136 / 6%);
    }
    .plan-body {
      flex: 1;
    }
    .plan-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .price {
      color: var(--app-accent, #0d9488);
      font-weight: 700;
    }
    .plan-desc {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 4px 0 0;
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
