import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { selectUser } from '../../store/auth/auth.selectors';
import { WorkshopOwnerService } from '../../features/workshop-owner/services/workshop-owner.service';

/**
 * Bloquea rutas operativas si el taller no está verificado (solo dueños).
 */
export const workshopVerifiedGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  const workshopApi = inject(WorkshopOwnerService);

  return store.select(selectUser).pipe(
    take(1),
    switchMap((user) => {
      if (!user || user.role !== 'workshop_owner') return of(true);
      return workshopApi.getMyWorkshop().pipe(
        map((w) => {
          if (w.is_verified) return true;
          void router.navigate(['/taller/perfil'], {
            queryParams: { pending: 'verification' },
          });
          return false;
        }),
        catchError(() => {
          void router.navigate(['/taller/perfil'], { queryParams: { need: 'workshop' } });
          return of(false);
        }),
      );
    }),
  );
};
