import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { firstValueFrom, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';
import * as AuthActions from '../../store/auth/auth.actions';

export function initAuth(
  http: HttpClient,
  storage: StorageService,
  store: Store,
) {
  return () => {
    const token = storage.get('access_token');
    if (!token) return Promise.resolve();
    return firstValueFrom(
      http.get<User>(`${environment.apiUrl}/api/web/auth/profile/`).pipe(
        tap((user) => store.dispatch(AuthActions.setUser({ user }))),
        catchError(() => {
          storage.clear();
          store.dispatch(AuthActions.clearUser());
          return of(undefined);
        }),
      ),
    );
  };
}
