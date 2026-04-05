import { createAction, props } from '@ngrx/store';
import { User } from '../../shared/models/user.model';

export const setUser = createAction('[Auth] Set User', props<{ user: User }>());

export const clearUser = createAction('[Auth] Clear User');

export const setUnreadNotifications = createAction(
  '[Auth] Unread notifications',
  props<{ count: number }>(),
);
