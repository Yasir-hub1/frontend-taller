import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';

/** Bloquea panel taller si no hay suscripción activa (excepto página de suscripción). */
export const workshopSubscriptionGuard: CanActivateFn = (route) => {
  const subApi = inject(SubscriptionService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isWorkshopOwner()) return true;

  let leaf = route;
  while (leaf.firstChild) leaf = leaf.firstChild;
  if (leaf.routeConfig?.path === 'suscripcion') return true;

  return subApi.getMySubscription().pipe(
    map((s) => {
      if (s.is_operational) return true;
      void router.navigate(['/taller/suscripcion']);
      return false;
    }),
    catchError(() => {
      void router.navigate(['/taller/suscripcion']);
      return of(false);
    }),
  );
};
