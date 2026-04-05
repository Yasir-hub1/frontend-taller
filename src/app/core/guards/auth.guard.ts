import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';
import { selectUser } from '../../store/auth/auth.selectors';

export const authGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const store = inject(Store);
  const platformId = inject(PLATFORM_ID);

  // SSR: no hay localStorage; el cliente vuelve a evaluar el guard con el token real.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!storage.get('access_token')) {
    void router.navigate(['/auth/login']);
    return false;
  }

  return store.select(selectUser).pipe(
    take(1),
    map((user) => {
      if (user) return true;
      void router.navigate(['/auth/login']);
      return false;
    }),
  );
};
