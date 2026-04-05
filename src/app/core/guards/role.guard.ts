import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectUser } from '../../store/auth/auth.selectors';
import { UserRole } from '../../shared/models/user.model';

export const roleGuard: CanActivateFn = (route) => {
  const store = inject(Store);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const allowed: UserRole[] = route.data['roles'] ?? [];

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return store.select(selectUser).pipe(
    take(1),
    map((user) => {
      if (user && allowed.includes(user.role as UserRole)) return true;
      void router.navigate(['/auth/login']);
      return false;
    }),
  );
};
