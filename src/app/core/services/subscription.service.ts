import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OwnerSubscription, SubscriptionPlan } from '../../shared/models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiService);

  listPublicPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>('/api/web/payments/subscription-plans/');
  }

  getMySubscription(): Observable<OwnerSubscription> {
    return this.api.get<OwnerSubscription>('/api/web/payments/subscriptions/me/');
  }

  createCheckout(planId: number, successPath?: string, cancelPath?: string) {
    return this.api.post<{ checkout_url: string; session_id: string }>(
      '/api/web/payments/subscriptions/checkout/',
      {
        plan_id: planId,
        success_path: successPath,
        cancel_path: cancelPath,
      },
    );
  }

  verifySession(sessionId: string) {
    return this.api.post<{ active: boolean; subscription: OwnerSubscription }>(
      '/api/web/payments/subscriptions/verify/',
      { session_id: sessionId },
    );
  }
}
