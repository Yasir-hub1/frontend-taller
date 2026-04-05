import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (s) => s.user);

export const selectUnreadNotifications = createSelector(
  selectAuthState,
  (s) => s.unreadNotifications,
);
