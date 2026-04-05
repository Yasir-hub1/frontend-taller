# 🌐 Frontend Web – Especificación Técnica Angular
## Plataforma Inteligente de Atención de Emergencias Vehiculares

---

## 1. STACK Y VERSIONES

| Tecnología | Versión | Rol |
|---|---|---|
| Angular | 18+ (standalone) | Framework principal |
| TypeScript | 5.4+ | Lenguaje |
| Angular Material | 18+ | Componentes UI base |
| Tailwind CSS | 3.x | Utilidades de estilos |
| NgRx | 18+ | Gestión de estado global |
| Leaflet + ngx-leaflet | 1.9+ | Mapas (radar de talleres) |
| Socket EventSource | nativo | SSE para tiempo real |
| Stripe.js | 3.x | SDK pago del lado cliente |
| Chart.js + ng2-charts | 5.x | Gráficas del dashboard |
| ngx-toastr | 18.x | Notificaciones toast |
| RxJS | 7.8+ | Programación reactiva |
| Luxon | 3.x | Manejo de fechas |
| ng-image-slider | 2.x | Galería de evidencias |
| @angular/pwa | 18+ | Service Worker (notificaciones) |

---

## 2. ESTRUCTURA DEL PROYECTO

```
emergencias-web/
├── src/
│   ├── app/
│   │   ├── core/                          # Servicios singleton, guards, interceptors
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── api.service.ts         # HttpClient wrapper base
│   │   │   │   ├── sse.service.ts         # Server-Sent Events
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── storage.service.ts     # localStorage helper
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts    # Inyecta JWT en headers
│   │   │   │   └── error.interceptor.ts   # Manejo global de errores HTTP
│   │   │   └── guards/
│   │   │       ├── auth.guard.ts
│   │   │       ├── role.guard.ts          # Protege rutas por rol
│   │   │       └── workshop-verified.guard.ts
│   │   │
│   │   ├── shared/                        # Componentes/pipes reutilizables
│   │   │   ├── components/
│   │   │   │   ├── header/
│   │   │   │   ├── sidebar/
│   │   │   │   ├── status-badge/          # Badge de estado del incidente
│   │   │   │   ├── priority-chip/         # Chip de prioridad
│   │   │   │   ├── map-view/              # Mapa Leaflet encapsulado
│   │   │   │   ├── ai-summary-card/       # Tarjeta resumen IA
│   │   │   │   ├── evidence-gallery/      # Galería de imágenes/audio
│   │   │   │   └── confirm-dialog/
│   │   │   ├── pipes/
│   │   │   │   ├── distance.pipe.ts       # "2.3 km"
│   │   │   │   ├── time-ago.pipe.ts       # "hace 5 min"
│   │   │   │   └── currency-bo.pipe.ts    # Formato moneda
│   │   │   └── models/                    # Interfaces TypeScript
│   │   │       ├── user.model.ts
│   │   │       ├── workshop.model.ts
│   │   │       ├── incident.model.ts
│   │   │       ├── assignment.model.ts
│   │   │       ├── payment.model.ts
│   │   │       └── notification.model.ts
│   │   │
│   │   ├── features/
│   │   │   ├── auth/                      # Módulo de autenticación
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   │
│   │   │   ├── workshop-owner/            # Área del dueño de taller
│   │   │   │   ├── dashboard/
│   │   │   │   ├── incidents/
│   │   │   │   │   ├── incident-list/
│   │   │   │   │   ├── incident-detail/
│   │   │   │   │   └── incident-complete/
│   │   │   │   ├── technicians/
│   │   │   │   │   ├── technician-list/
│   │   │   │   │   └── technician-form/
│   │   │   │   ├── workshop-profile/
│   │   │   │   ├── earnings/
│   │   │   │   └── notifications/
│   │   │   │
│   │   │   └── admin/                     # Panel de administración
│   │   │       ├── dashboard/
│   │   │       ├── users/
│   │   │       ├── workshops/
│   │   │       ├── commission/
│   │   │       ├── incidents/
│   │   │       └── payments/
│   │   │
│   │   ├── store/                         # NgRx State Management
│   │   │   ├── auth/
│   │   │   │   ├── auth.actions.ts
│   │   │   │   ├── auth.reducer.ts
│   │   │   │   ├── auth.effects.ts
│   │   │   │   └── auth.selectors.ts
│   │   │   ├── incidents/
│   │   │   ├── notifications/
│   │   │   └── app.state.ts
│   │   │
│   │   ├── app.config.ts                  # Providers standalone
│   │   ├── app.routes.ts                  # Rutas principales
│   │   └── app.component.ts
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.production.ts
│   │
│   └── styles/
│       ├── _variables.scss
│       ├── _material-theme.scss
│       └── styles.scss
│
├── tailwind.config.js
├── angular.json
└── package.json
```

---

## 3. INTERFACES TYPESCRIPT (Modelos)

```typescript
// src/app/shared/models/user.model.ts

export type UserRole = 'admin' | 'workshop_owner' | 'client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  avatar: string | null;
  is_verified: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterWorkshopOwnerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  national_id: string;
}
```

```typescript
// src/app/shared/models/workshop.model.ts

export type ServiceCategory =
  | 'battery' | 'tire' | 'towing' | 'engine'
  | 'accident' | 'locksmith' | 'general';

export interface Workshop {
  id: number;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  logo: string | null;
  services: ServiceCategory[];
  radius_km: number;
  is_active: boolean;
  is_verified: boolean;
  rating_avg: number;
  total_services: number;
  distance_km?: number;  // Solo para resultados de "nearby"
}

export interface Technician {
  id: number;
  workshop: number;
  name: string;
  phone: string;
  specialties: ServiceCategory[];
  is_available: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  photo: string | null;
}
```

```typescript
// src/app/shared/models/incident.model.ts

export type IncidentStatus =
  | 'pending' | 'analyzing' | 'waiting_workshop'
  | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export type IncidentType =
  | 'battery' | 'tire' | 'accident' | 'engine'
  | 'locksmith' | 'overheating' | 'other' | 'uncertain';

export type EvidenceType = 'image' | 'audio' | 'text';

export interface Evidence {
  id: number;
  evidence_type: EvidenceType;
  file: string;         // URL del archivo en el servidor
  transcription: string;
  label: string;
  image_analysis: Record<string, number> | null;
  created_at: string;
}

export interface AISummary {
  tipo_incidente: string;
  prioridad: string;
  resumen_breve: string;
  servicios_requeridos: string[];
  notas_tecnicas: string;
  requiere_grua: boolean;
}

export interface Incident {
  id: number;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  incident_type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  address_text: string;
  ai_transcription: string;
  ai_summary: string;          // JSON string → parsear a AISummary
  ai_confidence: number | null;
  vehicle: {
    brand: string; model: string; year: number; plate: string; color: string;
  };
  evidences: Evidence[];
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: number;
  incident: number;
  workshop: Workshop;
  technician: Technician | null;
  status: string;
  distance_km: number;
  estimated_arrival_minutes: number | null;
  service_cost: number | null;
  offered_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}
```

---

## 4. CONFIGURACIÓN DE RUTAS

```typescript
// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Redirección raíz
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Auth (pública)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // Panel dueño de taller
  {
    path: 'taller',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['workshop_owner'] },
    loadChildren: () =>
      import('./features/workshop-owner/workshop.routes').then(m => m.WORKSHOP_ROUTES),
  },

  // Panel admin
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: '/auth/login' },
];
```

```typescript
// src/app/features/workshop-owner/workshop.routes.ts

export const WORKSHOP_ROUTES: Routes = [
  {
    path: '',
    component: WorkshopLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',         component: DashboardComponent },
      { path: 'incidentes',        component: IncidentListComponent },
      { path: 'incidentes/:id',    component: IncidentDetailComponent },
      { path: 'tecnicos',          component: TechnicianListComponent },
      { path: 'perfil',            component: WorkshopProfileComponent },
      { path: 'ingresos',          component: EarningsComponent },
      { path: 'notificaciones',    component: NotificationsComponent },
    ],
  },
];
```

```typescript
// src/app/features/admin/admin.routes.ts

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     component: AdminDashboardComponent },
      { path: 'usuarios',      component: UsersManagementComponent },
      { path: 'talleres',      component: WorkshopsManagementComponent },
      { path: 'comision',      component: CommissionConfigComponent },
      { path: 'incidentes',    component: AllIncidentsComponent },
      { path: 'pagos',         component: AllPaymentsComponent },
    ],
  },
];
```

---

## 5. SERVICIOS PRINCIPALES

### 5.1 API Service (base)

```typescript
// src/app/core/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  // Prefijos coherentes con el backend Django
  private readonly WEB = `${this.BASE}/api/web`;
  private readonly ADMIN = `${this.BASE}/api/admin-api`;

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<T>(`${this.BASE}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.BASE}${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.BASE}${path}`, body);
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.BASE}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.BASE}${path}`);
  }

  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.BASE}${path}`, formData);
  }
}
```

---

### 5.2 Auth Service

```typescript
// src/app/core/services/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User, AuthTokens } from '../../shared/models/user.model';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);

  // Signal-based reactivity (Angular 18)
  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = computed(() => this._currentUser() !== null);
  isAdmin = computed(() => this._currentUser()?.role === 'admin');
  isWorkshopOwner = computed(() => this._currentUser()?.role === 'workshop_owner');

  private readonly BASE = environment.apiUrl;

  loginWorkshop(email: string, password: string) {
    return this.http.post<{ tokens: AuthTokens; user: User }>(
      `${this.BASE}/api/web/auth/login/`, { email, password }
    ).pipe(
      tap(res => {
        this.storage.set('access_token', res.tokens.access);
        this.storage.set('refresh_token', res.tokens.refresh);
        this._currentUser.set(res.user);
        this.redirectByRole(res.user.role);
      })
    );
  }

  loginAdmin(email: string, password: string) {
    return this.http.post<{ tokens: AuthTokens; user: User }>(
      `${this.BASE}/api/web/auth/login/`, { email, password }
    ).pipe(tap(res => {
      this.storage.set('access_token', res.tokens.access);
      this.storage.set('refresh_token', res.tokens.refresh);
      this._currentUser.set(res.user);
      this.redirectByRole(res.user.role);
    }));
  }

  private redirectByRole(role: string) {
    if (role === 'admin') this.router.navigate(['/admin/dashboard']);
    else if (role === 'workshop_owner') this.router.navigate(['/taller/dashboard']);
  }

  logout() {
    const refresh = this.storage.get('refresh_token');
    this.http.post(`${this.BASE}/api/web/auth/logout/`, { refresh }).subscribe();
    this.storage.clear();
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  restoreSession() {
    const token = this.storage.get('access_token');
    if (!token) return;
    this.http.get<User>(`${this.BASE}/api/web/auth/profile/`)
      .subscribe({ next: user => this._currentUser.set(user) });
  }
}
```

---

### 5.3 Workshop Service

```typescript
// src/app/features/workshop-owner/services/workshop.service.ts
@Injectable({ providedIn: 'root' })
export class WorkshopService {
  private api = inject(ApiService);

  getMyWorkshop() {
    return this.api.get<Workshop>('/api/web/workshop/');
  }

  updateWorkshop(data: Partial<Workshop>) {
    return this.api.patch<Workshop>('/api/web/workshop/', data);
  }

  getDashboard() {
    return this.api.get<DashboardMetrics>('/api/web/workshop/dashboard/');
  }

  getTechnicians() {
    return this.api.get<Technician[]>('/api/web/workshop/technicians/');
  }

  createTechnician(data: Partial<Technician>) {
    return this.api.post<Technician>('/api/web/workshop/technicians/', data);
  }

  updateTechnicianAvailability(id: number, is_available: boolean) {
    return this.api.patch(`/api/web/workshop/technicians/${id}/availability/`, { is_available });
  }

  getEarnings(params?: { from?: string; to?: string }) {
    return this.api.get<EarningsSummary>('/api/web/workshop/earnings/', params);
  }
}
```

---

### 5.4 Incidents Service (Web)

```typescript
// src/app/features/workshop-owner/services/incident-web.service.ts
@Injectable({ providedIn: 'root' })
export class IncidentWebService {
  private api = inject(ApiService);

  getAvailableIncidents(params?: { type?: string; priority?: string }) {
    return this.api.get<PaginatedResponse<Incident>>('/api/web/incidents/available/', params);
  }

  getIncidentDetail(id: number) {
    return this.api.get<Incident>(`/api/web/incidents/${id}/`);
  }

  acceptIncident(id: number, payload: { technician_id: number; estimated_arrival_minutes: number }) {
    return this.api.post(`/api/web/incidents/${id}/accept/`, payload);
  }

  rejectIncident(id: number, reason: string) {
    return this.api.post(`/api/web/incidents/${id}/reject/`, { reason });
  }

  updateStatus(id: number, status: string) {
    return this.api.patch(`/api/web/incidents/${id}/status/`, { status });
  }

  completeService(id: number, service_cost: number) {
    return this.api.post(`/api/web/incidents/${id}/complete/`, { service_cost });
  }

  getHistory(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Incident>>('/api/web/incidents/history/', params);
  }

  getAISummary(ai_summary: string): AISummary | null {
    try { return JSON.parse(ai_summary); } catch { return null; }
  }
}
```

---

### 5.5 SSE Service (Tiempo Real)

```typescript
// src/app/core/services/sse.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, fromEventPattern, EMPTY } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SseService {
  private storage = inject(StorageService);
  private eventSources = new Map<string, EventSource>();

  /**
   * Suscribirse al stream SSE de un incidente específico.
   * Retorna Observable que emite cada evento recibido.
   */
  listenToIncident(incidentId: number): Observable<any> {
    return this.connect(`/api/web/notifications/stream/?channel=incident-${incidentId}`);
  }

  listenToUserNotifications(userId: number): Observable<any> {
    return this.connect(`/api/web/notifications/stream/?channel=user-${userId}`);
  }

  private connect(path: string): Observable<any> {
    const token = this.storage.get('access_token');
    const url = `${environment.apiUrl}${path}&token=${token}`;

    return new Observable(observer => {
      const es = new EventSource(url);
      this.eventSources.set(path, es);

      es.onmessage = (event) => {
        try { observer.next(JSON.parse(event.data)); }
        catch { observer.next(event.data); }
      };

      es.onerror = (err) => {
        es.close();
        this.eventSources.delete(path);
        observer.error(err);
      };

      return () => {
        es.close();
        this.eventSources.delete(path);
      };
    });
  }

  disconnectAll() {
    this.eventSources.forEach(es => es.close());
    this.eventSources.clear();
  }
}
```

---

### 5.6 Admin Service

```typescript
// src/app/features/admin/services/admin.service.ts
@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  // Usuarios
  getUsers(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<User>>('/api/admin-api/users/', params);
  }
  toggleUserActive(id: number) {
    return this.api.patch(`/api/admin-api/users/${id}/toggle-active/`, {});
  }

  // Talleres
  getWorkshops(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Workshop>>('/api/admin-api/workshops/', params);
  }
  verifyWorkshop(id: number) {
    return this.api.patch(`/api/admin-api/workshops/${id}/verify/`, {});
  }
  toggleWorkshopActive(id: number) {
    return this.api.patch(`/api/admin-api/workshops/${id}/toggle-active/`, {});
  }

  // Comisiones
  getCurrentCommission() {
    return this.api.get<CommissionConfig>('/api/admin-api/commission/current/');
  }
  getCommissionHistory() {
    return this.api.get<CommissionConfig[]>('/api/admin-api/commission/');
  }
  setCommission(percentage: number, description: string, effective_from: string) {
    return this.api.post('/api/admin-api/commission/', { percentage, description, effective_from });
  }

  // Métricas globales
  getMetrics() {
    return this.api.get<GlobalMetrics>('/api/admin-api/metrics/');
  }

  // Pagos
  getAllPayments(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<Payment>>('/api/admin-api/payments/', params);
  }
}
```

---

## 6. COMPONENTES CLAVE

### 6.1 Dashboard del Taller

```
DashboardComponent:
- Tarjetas KPI:
  · Solicitudes hoy
  · Servicios completados (mes)
  · Ingreso neto (mes)
  · Calificación promedio (estrellas)
  · Comisión pagada (mes)
- Gráfica de servicios por tipo (Chart.js — Donut)
- Gráfica de ingresos por semana (Bar chart)
- Últimas 5 solicitudes recientes
- Estado de técnicos (disponible / ocupado) con toggle
- Notificaciones en tiempo real (SSE badge)
```

### 6.2 Lista de Incidentes Disponibles

```
IncidentListComponent:
- Header con tabs:
  · Disponibles (status: waiting_workshop / offered)
  · En proceso (status: assigned / in_progress)
  · Historial (completed / cancelled)
- Filtros: tipo de incidente, prioridad, fecha
- Tabla/cards con:
  · Chip de prioridad (color: rojo=crítica, naranja=alta, amarillo=media, verde=baja)
  · Tipo de incidente + ícono
  · Dirección y distancia al taller
  · Tiempo transcurrido desde creación
  · Resumen breve IA
  · Botones: [Ver detalle] [Aceptar] [Rechazar]
- Paginación
- Actualización en tiempo real vía SSE (badge de nuevos)
```

### 6.3 Detalle de Incidente (Taller)

```
IncidentDetailComponent:
- Mapa Leaflet mostrando:
  · Marcador del incidente
  · Marcador del taller
  · Línea de ruta
- Tarjeta IA Summary:
  · Tipo de incidente detectado
  · Confianza del modelo (barra de progreso)
  · Resumen generado por GPT
  · Servicios requeridos (chips)
  · ¿Requiere grúa? (badge)
- Galería de evidencias:
  · Imágenes en slider
  · Audio player nativo (<audio>) para cada audio
  · Texto de transcripción Whisper
- Información del vehículo
- Información del cliente (teléfono enmascarado hasta aceptar)
- Botones de acción según estado:
  · [Aceptar + asignar técnico] → modal con select de técnico disponible
  · [Rechazar] → modal con campo de motivo
  · [Actualizar estado] → select de estado
  · [Completar servicio] → modal con campo de costo
```

### 6.4 Gestión de Técnicos

```
TechnicianListComponent:
- Tabla con: nombre, teléfono, especialidades, disponibilidad (toggle)
- Mapa con posición actual de cada técnico (si disponible)
- Botón: [Agregar técnico] → TechnicianFormComponent (modal/drawer)
- Acciones: [Editar] [Eliminar] [Toggle disponible]

TechnicianFormComponent (Formulario):
- Nombre, teléfono, especialidades (multi-select chips)
- Upload de foto
- Toggle disponibilidad inicial
```

### 6.5 Configuración de Comisión (Admin)

```
CommissionConfigComponent:
- Tarjeta con comisión actual activa (% en grande)
- Form para nueva configuración:
  · Porcentaje (input numérico con validación 0.01–99.99)
  · Descripción
  · Fecha de vigencia (date picker)
  · [Guardar nueva comisión]
- Tabla de historial de configuraciones anteriores
- Aviso: "La nueva comisión afecta a todos los servicios desde la fecha de vigencia"
```

### 6.6 Perfil del Taller

```
WorkshopProfileComponent:
- Form editable:
  · Logo (upload + preview)
  · Nombre, descripción, dirección
  · Teléfono, email
  · Servicios ofrecidos (multi-select chips con ServiceCategory)
  · Radio de servicio (slider km)
  · Mapa interactivo para reposicionar la ubicación (Leaflet drag marker)
- Estado de verificación (badge: Verificado / Pendiente / Rechazado)
- Sección Stripe: estado de conexión de cuenta para recibir pagos
  · Botón [Conectar cuenta Stripe] → redirect al onboarding Stripe Connect
```

---

## 7. INTERCEPTORES

### Auth Interceptor

```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const token = storage.get('access_token');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) {
        // Intentar renovar token
        const refresh = storage.get('refresh_token');
        if (refresh) {
          return inject(HttpClient).post<{ access: string }>(
            `${environment.apiUrl}/api/web/auth/refresh/`, { refresh }
          ).pipe(
            switchMap(res => {
              storage.set('access_token', res.access);
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.access}` }
              });
              return next(retryReq);
            }),
            catchError(() => {
              inject(AuthService).logout();
              return throwError(() => err);
            })
          );
        }
        inject(AuthService).logout();
      }
      return throwError(() => err);
    })
  );
};
```

---

## 8. GUARDS

```typescript
// src/app/core/guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] ?? [];
  const user = auth.currentUser();

  if (user && allowedRoles.includes(user.role)) return true;

  router.navigate(['/auth/login']);
  return false;
};
```

---

## 9. ENVIRONMENT

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  stripePublishableKey: 'pk_test_...',
  googleMapsApiKey: '',    // No se usa Google Maps, se usa Leaflet (libre)
  appVersion: '1.0.0',
};
```

---

## 10. FUNCIONALIDADES POR ROL

### Dueño de Taller (`/taller`)

| Funcionalidad | Componente | Descripción |
|---|---|---|
| Dashboard KPI | `DashboardComponent` | Métricas del negocio en tiempo real |
| Ver solicitudes disponibles | `IncidentListComponent` | Lista filtrable con prioridad y tipo |
| Detalle con resumen IA | `IncidentDetailComponent` | Mapa + galería + ficha IA |
| Aceptar/Rechazar solicitud | Modal en `IncidentDetailComponent` | Seleccionar técnico, estimar llegada |
| Actualizar estado en tiempo real | Botones en detalle | pending→in_route→arrived→completed |
| Gestión de técnicos | `TechnicianListComponent` | CRUD técnicos + toggle disponibilidad |
| Ver ingresos y comisiones | `EarningsComponent` | Gráficas + tabla con Stripe |
| Perfil del taller | `WorkshopProfileComponent` | Edición completa + mapa de ubicación |
| Notificaciones push + SSE | `NotificationsComponent` | Centro de notificaciones + tiempo real |
| Conectar Stripe | En perfil | Onboarding Stripe Connect |

### Admin (`/admin`)

| Funcionalidad | Componente | Descripción |
|---|---|---|
| Dashboard global | `AdminDashboardComponent` | KPIs plataforma, gráficas globales |
| Gestión de usuarios | `UsersManagementComponent` | Lista, activar/desactivar |
| Gestión de talleres | `WorkshopsManagementComponent` | Verificar, activar/desactivar |
| **Configurar comisión** | `CommissionConfigComponent` | Establecer % con fecha de vigencia |
| Ver todos los incidentes | `AllIncidentsComponent` | Vista global filtrable |
| Ver todos los pagos | `AllPaymentsComponent` | Historial de pagos y comisiones |

---

## 11. `package.json` — Dependencias principales

```json
{
  "dependencies": {
    "@angular/animations": "^18.0.0",
    "@angular/cdk": "^18.0.0",
    "@angular/common": "^18.0.0",
    "@angular/compiler": "^18.0.0",
    "@angular/core": "^18.0.0",
    "@angular/forms": "^18.0.0",
    "@angular/material": "^18.0.0",
    "@angular/platform-browser": "^18.0.0",
    "@angular/router": "^18.0.0",
    "@ngrx/effects": "^18.0.0",
    "@ngrx/store": "^18.0.0",
    "@ngrx/store-devtools": "^18.0.0",
    "@stripe/stripe-js": "^4.0.0",
    "chart.js": "^4.4.0",
    "leaflet": "^1.9.4",
    "@asymmetrik/ngx-leaflet": "^18.0.0",
    "luxon": "^3.4.4",
    "ng2-charts": "^5.0.0",
    "ngx-toastr": "^18.0.0",
    "rxjs": "~7.8.0",
    "tailwindcss": "^3.4.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0"
  }
}
```

---

## 12. CONSIDERACIONES TÉCNICAS

- **Standalone components:** Usar arquitectura standalone (sin NgModules) nativa de Angular 18.
- **Signals:** Usar `signal()` y `computed()` para estado local reactivo sin NgRx.
- **NgRx** solo para estado global: sesión de usuario, notificaciones no leídas, incidente activo.
- **Lazy loading:** Todas las rutas cargan sus chunks de forma diferida.
- **Leaflet en lugar de Google Maps:** Gratuito, sin API key, OSM como tiles.
- **Audio playback:** Usar el tag `<audio>` nativo del navegador — no se necesita librería para reproducir el audio del servidor.
- **SSE reconexión:** El `EventSource` nativo reconecta automáticamente, pero implementar lógica de backoff exponencial ante fallos persistentes.
- **Stripe.js:** Cargar solo en componentes de pago (lazy). Nunca hardcodear la clave secreta en el frontend.
- **Accesibilidad:** Usar atributos ARIA en componentes de Material, especialmente en formularios y modales.
