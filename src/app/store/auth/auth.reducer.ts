import { createReducer, on } from '@ngrx/store';
import { User } from '../../shared/models/user.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  unreadNotifications: number;
}

export const initialAuthState: AuthState = {
  user: null,
  unreadNotifications: 0,
};

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.setUser, (state, { user }) => ({ ...state, user })),
  on(AuthActions.clearUser, (state) => ({ ...state, user: null, unreadNotifications: 0 })),
  on(AuthActions.setUnreadNotifications, (state, { count }) => ({
    ...state,
    unreadNotifications: count,
  })),
);
