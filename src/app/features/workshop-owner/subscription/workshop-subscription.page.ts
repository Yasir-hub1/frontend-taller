import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { OwnerSubscription, SubscriptionPlan } from '../../../shared/models/subscription.model';
import { MessagesService } from '../../../core/services/messages.service';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-workshop-subscription',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Mi suscripción</h1>
      <p class="app-page-sub">Administra el plan de tu taller en la plataforma.</p>
    </header>

    @if (loading()) {
      <div class="center"><mat-spinner /></div>
    } @else {
      @if (sub(); as s) {
        <mat-card class="app-surface-card mb">
          <mat-card-header><mat-card-title>Estado actual</mat-card-title></mat-card-header>
          <mat-card-content>
            <p>
              <strong>Estado:</strong>
              {{ statusLabel(s.status) }}
              @if (s.is_operational) {
                <span class="ok"> — operativo</span>
              }
            </p>
            @if (s.plan) {
              <p>
                <strong>Plan:</strong>
                {{ s.plan.name }} ({{ s.plan.price_amount | currency : 'USD' : 'symbol' : '1.2-2' }}/{{
                  s.plan.billing_interval === 'year' ? 'año' : 'mes'
                }})
              </p>
              @if (s.current_period_end) {
                <p>
                  <strong>Vigente hasta:</strong>
                  {{ s.current_period_end | date : 'medium' }}
                </p>
              }
            } @else {
              <p class="warn">Sin plan activo. Elige un plan para continuar.</p>
            }
          </mat-card-content>
        </mat-card>
      }

      <mat-card class="app-surface-card">
        <mat-card-header><mat-card-title>Cambiar o activar plan</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (p of plans(); track p.id) {
            <div class="plan-row">
              <div>
                <strong>{{ p.name }}</strong>
                <p class="muted">{{ p.description }}</p>
                <p class="muted">
                  {{ p.price_amount | currency : 'USD' : 'symbol' : '1.2-2' }} /
                  {{ p.billing_interval === 'year' ? 'año' : 'mes' }}
                </p>
              </div>
              <button
                mat-flat-button
                color="primary"
                [disabled]="payingPlanId() === p.id"
                (click)="pay(p)"
              >
                Pagar con Stripe
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .mb {
      margin-bottom: 1rem;
    }
    .center {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .ok {
      color: #047857;
    }
    .warn {
      color: #b45309;
    }
    .muted {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 2px 0;
    }
    .plan-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--app-border, #e2e8f0);
    }
  `,
})
export class WorkshopSubscriptionPage implements OnInit {
  private readonly subs = inject(SubscriptionService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly sub = signal<OwnerSubscription | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly payingPlanId = signal<number | null>(null);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.reload();
    this.subs.listPublicPlans().subscribe({
      next: (list) => this.plans.set(list),
    });
  }

  reload() {
    this.loading.set(true);
    this.subs.getMySubscription().subscribe({
      next: (s) => {
        this.sub.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente de pago',
      active: 'Activa',
      past_due: 'Pago atrasado',
      canceled: 'Cancelada',
      incomplete: 'Incompleta',
    };
    return map[status] ?? status;
  }

  pay(plan: SubscriptionPlan) {
    this.payingPlanId.set(plan.id);
    this.subs
      .createCheckout(plan.id, '/auth/subscription-success', '/taller/suscripcion')
      .subscribe({
        next: (r) => {
          if (r.checkout_url) {
            window.location.href = r.checkout_url;
          } else {
            this.payingPlanId.set(null);
            this.messages.error('No se pudo iniciar el pago');
          }
        },
        error: () => this.payingPlanId.set(null),
      });
  }
}
