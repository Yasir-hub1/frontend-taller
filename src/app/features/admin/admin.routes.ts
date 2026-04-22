import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { AdminLayoutComponent } from './admin-layout/admin-layout';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./users/users-management.page').then((m) => m.UsersManagementPage),
      },
      {
        path: 'talleres',
        loadComponent: () =>
          import('./workshops/workshops-management.page').then((m) => m.WorkshopsManagementPage),
      },
      {
        path: 'comision',
        loadComponent: () =>
          import('./commission/commission-config.page').then((m) => m.CommissionConfigPage),
      },
      {
        path: 'incidentes',
        loadComponent: () =>
          import('./incidents/all-incidents.page').then((m) => m.AllIncidentsPage),
      },
      {
        path: 'incidentes/:id',
        loadComponent: () =>
          import('./incidents/admin-incident-detail.page').then((m) => m.AdminIncidentDetailPage),
      },
      {
        path: 'pagos',
        loadComponent: () => import('./payments/all-payments.page').then((m) => m.AllPaymentsPage),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./reports/admin-reports.page').then((m) => m.AdminReportsPage),
      },
    ],
  },
];
