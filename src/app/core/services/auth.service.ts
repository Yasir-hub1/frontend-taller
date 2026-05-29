import { Injectable, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs/operators';
import { User, AuthTokens, LoginPayload, RegisterWorkshopOwnerPayload } from '../../shared/models/user.model';
import { OwnerSubscription, RegisterResponse } from '../../shared/models/subscription.model';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';
import * as AuthActions from '../../store/auth/auth.actions';
import { selectUser } from '../../store/auth/auth.selectors';
import { PanelNotificationsApiService } from './panel-notifications-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly store = inject(Store);
  private readonly notificationsApi = inject(PanelNotificationsApiService);

  readonly currentUser = this.store.selectSignal(selectUser);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly isWorkshopOwner = computed(() => this.currentUser()?.role === 'workshop_owner');

  private readonly api = environment.apiUrl;

  login(payload: LoginPayload) {
    return this.http
      .post<{ tokens: AuthTokens; user: User }>(`${this.api}/api/web/auth/login/`, payload)
      .pipe(
        tap((res) => {
          this.storage.set('access_token', res.tokens.access);
          this.storage.set('refresh_token', res.tokens.refresh);
          this.store.dispatch(AuthActions.setUser({ user: res.user }));
          this.syncUnreadBadge();
          this.redirectByRole(res.user.role);
        }),
      );
  }

  register(payload: RegisterWorkshopOwnerPayload) {
    return this.http
      .post<RegisterResponse>(`${this.api}/api/web/auth/register/`, payload)
      .pipe(
        tap((res) => {
          this.storage.set('access_token', res.tokens.access);
          this.storage.set('refresh_token', res.tokens.refresh);
          this.store.dispatch(AuthActions.setUser({ user: res.user }));
          this.syncUnreadBadge();
          if (res.checkout_url) {
            window.location.href = res.checkout_url;
            return;
          }
          this.redirectByRole(res.user.role);
        }),
      );
  }

  private syncUnreadBadge(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: (r) =>
        this.store.dispatch(AuthActions.setUnreadNotifications({ count: r.unread_count })),
      error: () => undefined,
    });
  }

  private redirectByRole(role: string) {
    if (role === 'admin') void this.router.navigate(['/admin/dashboard']);
    else if (role === 'workshop_owner') {
      const sub = this.currentUser()?.subscription;
      if (sub?.is_operational) void this.router.navigate(['/taller/dashboard']);
      else void this.router.navigate(['/taller/suscripcion']);
    } else void this.router.navigate(['/auth/login']);
  }

  logout() {
    this.storage.clear();
    this.store.dispatch(AuthActions.clearUser());
    void this.router.navigate(['/auth/login']);
  }

  restoreSession() {
    const token = this.storage.get('access_token');
    if (!token) return;
    this.http.get<User>(`${this.api}/api/web/auth/profile/`).subscribe({
      next: (user) => {
        this.store.dispatch(AuthActions.setUser({ user }));
        this.syncUnreadBadge();
      },
      error: () => this.logout(),
    });
  }

  patchSubscription(subscription: OwnerSubscription) {
    const user = this.currentUser();
    if (!user) return;
    this.store.dispatch(AuthActions.setUser({ user: { ...user, subscription } }));
  }
}
