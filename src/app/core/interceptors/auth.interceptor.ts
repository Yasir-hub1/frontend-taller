import { HttpInterceptorFn, HttpBackend, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import * as AuthActions from '../../store/auth/auth.actions';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const store = inject(Store);
  const httpRaw = new HttpClient(inject(HttpBackend));

  const token = storage.get('access_token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }
      const refresh = storage.get('refresh_token');
      if (!refresh) {
        storage.clear();
        store.dispatch(AuthActions.clearUser());
        void router.navigate(['/auth/login']);
        return throwError(() => err);
      }
      return httpRaw
        .post<{ access: string; refresh?: string }>(`${environment.apiUrl}/api/web/auth/refresh/`, {
          refresh,
        })
        .pipe(
          switchMap((res) => {
            storage.set('access_token', res.access);
            if (res.refresh) {
              storage.set('refresh_token', res.refresh);
            }
            const retry = req.clone({ setHeaders: { Authorization: `Bearer ${res.access}` } });
            return next(retry);
          }),
          catchError(() => {
            storage.clear();
            store.dispatch(AuthActions.clearUser());
            void router.navigate(['/auth/login']);
            return throwError(() => err);
          }),
        );
    }),
  );
};
