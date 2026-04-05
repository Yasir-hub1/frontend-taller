import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { WorkshopLayoutComponent } from './workshop-layout/workshop-layout';

export const WORKSHOP_ROUTES: Routes = [
  {
    path: '',
    component: WorkshopLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['workshop_owner'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.page').then((m) => m.WorkshopDashboardPage),
      },
      {
        path: 'incidentes',
        loadComponent: () =>
          import('./incident-list/incident-list.page').then((m) => m.IncidentListPage),
      },
      {
        path: 'incidentes/:id',
        loadComponent: () =>
          import('./incident-detail/incident-detail.page').then((m) => m.IncidentDetailPage),
      },
      {
        path: 'tecnicos',
        loadComponent: () =>
          import('./technicians/technician-list.page').then((m) => m.TechnicianListPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./workshop-profile/workshop-profile.page').then((m) => m.WorkshopProfilePage),
      },
      {
        path: 'ingresos',
        loadComponent: () => import('./earnings/earnings.page').then((m) => m.EarningsPage),
      },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import('./notifications/notifications.page').then((m) => m.NotificationsPage),
      },
    ],
  },
];
