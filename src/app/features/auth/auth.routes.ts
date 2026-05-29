import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';
import { SubscriptionSuccessPage } from './subscription-success/subscription-success.page';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'subscription-success', component: SubscriptionSuccessPage },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
