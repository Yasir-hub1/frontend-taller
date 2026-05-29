import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { MessagesService } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-subscription-success-page',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatButton, MatProgressSpinner, RouterLink],
  template: `
    <div class="app-auth-page">
      <mat-card class="app-auth-card">
        <mat-card-header>
          <mat-card-title>Suscripción</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (loading()) {
            <div class="center">
              <mat-spinner diameter="40" />
              <p>Confirmando pago con Stripe…</p>
            </div>
          } @else if (ok()) {
            <p class="ok">¡Suscripción activada! Ya puedes usar el panel de taller.</p>
            <button mat-flat-button color="primary" (click)="goDashboard()">Ir al panel</button>
          } @else {
            <p class="err">{{ errorMsg() }}</p>
            <a mat-button routerLink="/taller/suscripcion">Reintentar pago</a>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 1rem 0;
    }
    .ok {
      color: #047857;
      margin-bottom: 1rem;
    }
    .err {
      color: #b91c1c;
      margin-bottom: 1rem;
    }
  `,
})
export class SubscriptionSuccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subs = inject(SubscriptionService);
  private readonly messages = inject(MessagesService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly ok = signal(false);
  readonly errorMsg = signal('');

  constructor() {
    afterNextRender(() => this.verifyPayment());
  }

  private verifyPayment() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id') ?? '';
    if (!sessionId) {
      this.loading.set(false);
      this.errorMsg.set('Falta el identificador de sesión de Stripe');
      return;
    }

    this.subs.verifySession(sessionId).subscribe({
      next: (r) => {
        if (r.active && r.subscription) {
          this.auth.patchSubscription(r.subscription);
          this.ok.set(true);
          setTimeout(() => this.messages.success('Pago confirmado'), 0);
        } else {
          this.errorMsg.set('El pago aún no está activo');
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMsg.set(e?.error?.error ?? 'No se pudo verificar el pago');
      },
    });
  }

  goDashboard() {
    void this.router.navigate(['/taller/dashboard']);
  }
}
