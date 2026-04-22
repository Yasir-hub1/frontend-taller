import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../services/admin.service';
import { Workshop } from '../../../shared/models/workshop.model';
import { AdminReportsPayload } from '../../../shared/models/admin-reports.model';
import { CurrencyBoPipe } from '../../../shared/pipes/currency-bo.pipe';
import { asPaged } from '../utils/paginated-response.util';
import { MessagesService } from '../../../core/services/messages.service';

const CHART_COLORS = [
  '#6366f1',
  '#0d9488',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#64748b',
];

@Component({
  standalone: true,
  selector: 'app-admin-reports',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinner,
    MatIconModule,
    BaseChartDirective,
    CurrencyBoPipe,
    DatePipe,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Reportes generales</h1>
      <p class="app-page-sub">
        Incidentes, asignaciones, ingresos y métricas operativas. Los datos se filtran por fecha de
        creación del incidente; los montos corresponden a pagos liquidados vinculados a esos casos.
      </p>
    </header>

    <mat-card class="app-surface-card filters-card">
      <mat-card-header>
        <mat-card-title>Filtros</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" class="filters-grid" (ngSubmit)="apply()">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput type="date" formControlName="date_from" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" formControlName="date_to" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Taller</mat-label>
            <mat-select formControlName="workshop_id">
              <mat-option value="">Todos</mat-option>
              @for (w of workshops(); track w.id) {
                <mat-option [value]="'' + w.id">{{ w.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estado incidente</mat-label>
            <mat-select formControlName="incident_status">
              <mat-option value="">Cualquiera</mat-option>
              @for (o of optionRows().incident_status; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tipo incidente</mat-label>
            <mat-select formControlName="incident_type">
              <mat-option value="">Cualquiera</mat-option>
              @for (o of optionRows().incident_type; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estado pago</mat-label>
            <mat-select formControlName="payment_status">
              <mat-option value="">Cualquiera (liquidados)</mat-option>
              @for (o of optionRows().payment_status; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="filter-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
              <mat-icon>filter_alt</mat-icon>
              Aplicar
            </button>
            <button
              mat-stroked-button
              type="button"
              (click)="exportExcel()"
              [disabled]="loading() || exporting()"
            >
              @if (exporting()) {
                <mat-spinner diameter="20" />
              } @else {
                <mat-icon>download</mat-icon>
              }
              Excel
            </button>
            <button mat-button type="button" (click)="resetDates()">Últimos 30 días</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (loading()) {
      <div class="loading-wrap">
        <mat-spinner />
      </div>
    } @else if (report()) {
      @let r = report()!;

      <div class="kpi-grid">
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Incidentes</div>
            <div class="stat-value">{{ r.kpis.incidents_total }}</div>
            <div class="stat-hint">{{ r.kpis.incidents_completed }} completados</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Activos / cancelados</div>
            <div class="stat-value">{{ r.kpis.incidents_active }} / {{ r.kpis.incidents_cancelled }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tasa resolución</div>
            <div class="stat-value">{{ r.kpis.resolution_rate_pct }}%</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Pagos liquidados</div>
            <div class="stat-value">{{ r.kpis.payments_settled_count }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Ingresos brutos</div>
            <div class="stat-value">{{ r.kpis.revenue_total | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Comisión plataforma</div>
            <div class="stat-value">{{ r.kpis.commission_total | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Neto talleres</div>
            <div class="stat-value">{{ r.kpis.workshop_net_total | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tiempo medio asignación</div>
            <div class="stat-value">{{ formatDuration(r.kpis.avg_assignment_seconds) }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tiempo medio llegada</div>
            <div class="stat-value">{{ formatDuration(r.kpis.avg_arrival_seconds) }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Resolución total (media)</div>
            <div class="stat-value">{{ formatDuration(r.kpis.avg_resolution_seconds) }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Confianza IA (media)</div>
            <div class="stat-value">{{ formatConfidence(r.kpis.avg_ai_confidence) }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Calificación media</div>
            <div class="stat-value">{{ r.kpis.avg_rating ?? '—' }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Clientes nuevos</div>
            <div class="stat-value">{{ r.kpis.new_clients_in_period }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Talleres nuevos</div>
            <div class="stat-value">{{ r.kpis.new_workshops_in_period }}</div>
            <div class="stat-hint">{{ r.kpis.verified_workshops_total }} verificados activos</div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (isBrowser) {
        <div class="charts-grid">
          <mat-card class="app-surface-card chart-card">
            <mat-card-header><mat-card-title>Incidentes por estado</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="doughnutStatus()" [type]="'doughnut'" [options]="doughnutOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card chart-card">
            <mat-card-header><mat-card-title>Por tipo de incidente</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="barTypes()" [type]="'bar'" [options]="barOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card chart-card chart-card--wide">
            <mat-card-header><mat-card-title>Incidentes por día</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="lineDays()" [type]="'line'" [options]="lineOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card chart-card chart-card--wide">
            <mat-card-header><mat-card-title>Asignaciones por estado</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="barAssignments()" [type]="'bar'" [options]="barOptsHoriz"></canvas>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <mat-card class="app-surface-card mt">
        <mat-card-header><mat-card-title>Top talleres por comisión en el período</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="app-table-wrap">
            <table mat-table [dataSource]="r.top_workshops" class="full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Taller</th>
                <td mat-cell *matCellDef="let row">{{ row.assignment__workshop__name }}</td>
              </ng-container>
              <ng-container matColumnDef="n">
                <th mat-header-cell *matHeaderCellDef>Pagos</th>
                <td mat-cell *matCellDef="let row">{{ row.payments_count }}</td>
              </ng-container>
              <ng-container matColumnDef="rev">
                <th mat-header-cell *matHeaderCellDef>Ingresos</th>
                <td mat-cell *matCellDef="let row">{{ row.revenue | currencyBo }}</td>
              </ng-container>
              <ng-container matColumnDef="com">
                <th mat-header-cell *matHeaderCellDef>Comisión</th>
                <td mat-cell *matCellDef="let row">{{ row.commission | currencyBo }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="topCols"></tr>
              <tr mat-row *matRowDef="let row; columns: topCols"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="app-surface-card mt">
        <mat-card-header>
          <mat-card-title>Detalle de incidentes (máx. 200 en vista; Excel incluye el mismo límite en hojas)</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="app-table-wrap table-scroll">
            <table mat-table [dataSource]="r.tables.recent_incidents" class="full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let row">{{ row.id }}</td>
              </ng-container>
              <ng-container matColumnDef="st">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">{{ labelIncidentStatus(row.status) }}</td>
              </ng-container>
              <ng-container matColumnDef="tp">
                <th mat-header-cell *matHeaderCellDef>Tipo</th>
                <td mat-cell *matCellDef="let row">{{ labelIncidentType(row.incident_type) }}</td>
              </ng-container>
              <ng-container matColumnDef="cl">
                <th mat-header-cell *matHeaderCellDef>Cliente</th>
                <td mat-cell *matCellDef="let row">{{ row.client_name }}</td>
              </ng-container>
              <ng-container matColumnDef="veh">
                <th mat-header-cell *matHeaderCellDef>Vehículo</th>
                <td mat-cell *matCellDef="let row">{{ row.vehicle_label }}</td>
              </ng-container>
              <ng-container matColumnDef="ia">
                <th mat-header-cell *matHeaderCellDef>IA</th>
                <td mat-cell *matCellDef="let row">{{ formatConfidence(row.ai_confidence) }}</td>
              </ng-container>
              <ng-container matColumnDef="crt">
                <th mat-header-cell *matHeaderCellDef>Creado</th>
                <td mat-cell *matCellDef="let row">{{ row.created_at | date : 'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="incCols"></tr>
              <tr mat-row *matRowDef="let row; columns: incCols"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="app-surface-card mt">
        <mat-card-header><mat-card-title>Pagos recientes (mismo criterio de filtros)</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="app-table-wrap table-scroll">
            <table mat-table [dataSource]="r.tables.recent_payments" class="full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let row">{{ row.id }}</td>
              </ng-container>
              <ng-container matColumnDef="inc">
                <th mat-header-cell *matHeaderCellDef>Inc.</th>
                <td mat-cell *matCellDef="let row">{{ row.assignment__incident_id }}</td>
              </ng-container>
              <ng-container matColumnDef="ws">
                <th mat-header-cell *matHeaderCellDef>Taller</th>
                <td mat-cell *matCellDef="let row">{{ row.assignment__workshop__name }}</td>
              </ng-container>
              <ng-container matColumnDef="cl">
                <th mat-header-cell *matHeaderCellDef>Cliente</th>
                <td mat-cell *matCellDef="let row">{{ row.client_name }}</td>
              </ng-container>
              <ng-container matColumnDef="tot">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let row">{{ row.total_amount | currencyBo }}</td>
              </ng-container>
              <ng-container matColumnDef="com">
                <th mat-header-cell *matHeaderCellDef>Comisión</th>
                <td mat-cell *matCellDef="let row">{{ row.commission_amount | currencyBo }}</td>
              </ng-container>
              <ng-container matColumnDef="st">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">{{ labelPaymentStatus(row.status) }}</td>
              </ng-container>
              <ng-container matColumnDef="paid">
                <th mat-header-cell *matHeaderCellDef>Pagado</th>
                <td mat-cell *matCellDef="let row">{{ row.paid_at | date : 'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="payCols"></tr>
              <tr mat-row *matRowDef="let row; columns: payCols"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .filters-card {
      margin-bottom: 1.25rem;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: 12px;
      align-items: start;
    }
    .filter-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      padding-top: 8px;
      grid-column: 1 / -1;
    }
    .filter-actions button mat-icon {
      margin-right: 4px;
      vertical-align: middle;
    }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: 12px;
      margin-bottom: 1.25rem;
    }
    .stat-hint {
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
      margin-top: 4px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 1.25rem;
    }
    @media (max-width: 959px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
    .chart-card--wide {
      grid-column: 1 / -1;
    }
    .chart-card canvas {
      max-height: min(300px, 45vh);
    }
    .mt {
      margin-top: 1rem;
    }
    .full {
      width: 100%;
    }
    .table-scroll {
      overflow-x: auto;
    }
  `,
})
export class AdminReportsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly report = signal<AdminReportsPayload | null>(null);
  readonly workshops = signal<Workshop[]>([]);

  readonly optionRows = computed(() => {
    const r = this.report();
    return (
      r?.filter_options ?? {
        incident_status: [],
        incident_type: [],
        payment_status: [],
        assignment_status: [],
      }
    );
  });

  readonly doughnutStatus = signal<ChartConfiguration<'doughnut'>['data']>({ labels: [], datasets: [] });
  readonly barTypes = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly lineDays = signal<ChartConfiguration<'line'>['data']>({ labels: [], datasets: [] });
  readonly barAssignments = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });

  readonly doughnutOpts: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
  };
  readonly barOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: false } },
  };
  readonly barOptsHoriz: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    indexAxis: 'y',
    scales: { x: { beginAtZero: true } },
    plugins: { legend: { display: false } },
  };
  readonly lineOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: false } },
  };

  topCols = ['name', 'n', 'rev', 'com'];
  incCols = ['id', 'st', 'tp', 'cl', 'veh', 'ia', 'crt'];
  payCols = ['id', 'inc', 'ws', 'cl', 'tot', 'com', 'st', 'paid'];

  form = this.fb.nonNullable.group({
    date_from: '',
    date_to: '',
    workshop_id: '',
    incident_status: '',
    incident_type: '',
    payment_status: '',
  });

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.resetDates();
    this.loadWorkshops();
    this.apply();
  }

  resetDates(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    this.form.patchValue({
      date_from: from.toISOString().slice(0, 10),
      date_to: to.toISOString().slice(0, 10),
    });
  }

  private loadWorkshops(): void {
    const acc: Workshop[] = [];
    const loadPage = (page: number) => {
      this.api.getWorkshops({ page: String(page) }).subscribe({
        next: (res) => {
          const { results, count } = asPaged<Workshop>(res);
          acc.push(...results);
          if (acc.length < count) loadPage(page + 1);
          else this.workshops.set(acc);
        },
        error: () => this.messages.error('No se pudieron cargar los talleres para el filtro.'),
      });
    };
    loadPage(1);
  }

  private buildParams(): Record<string, string> {
    const v = this.form.getRawValue();
    const p: Record<string, string> = {
      date_from: v.date_from,
      date_to: v.date_to,
    };
    if (v.workshop_id) p['workshop_id'] = v.workshop_id;
    if (v.incident_status) p['incident_status'] = v.incident_status;
    if (v.incident_type) p['incident_type'] = v.incident_type;
    if (v.payment_status) p['payment_status'] = v.payment_status;
    return p;
  }

  apply(): void {
    this.loading.set(true);
    this.api
      .getReportsSummary(this.buildParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.report.set(data);
          this.patchCharts(data);
        },
        error: () => this.messages.error('No se pudieron cargar los reportes.'),
      });
  }

  private patchCharts(data: AdminReportsPayload): void {
    const stLabels = data.charts.incidents_by_status.map((x) => this.labelIncidentStatus(x.status));
    const stData = data.charts.incidents_by_status.map((x) => x.count);
    this.doughnutStatus.set({
      labels: stLabels,
      datasets: [
        {
          data: stData,
          backgroundColor: CHART_COLORS.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        },
      ],
    });

    const tpLabels = data.charts.incidents_by_type.map((x) => this.labelIncidentType(x.incident_type));
    this.barTypes.set({
      labels: tpLabels,
      datasets: [
        {
          label: 'Cantidad',
          data: data.charts.incidents_by_type.map((x) => x.count),
          backgroundColor: '#6366f1',
        },
      ],
    });

    this.lineDays.set({
      labels: data.charts.incidents_by_day.map((x) => x.day ?? ''),
      datasets: [
        {
          label: 'Incidentes',
          data: data.charts.incidents_by_day.map((x) => x.count),
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.15)',
          fill: true,
          tension: 0.25,
        },
      ],
    });

    const asgLabels = data.charts.assignments_by_status.map((x) => this.labelAssignmentStatus(x.status));
    this.barAssignments.set({
      labels: asgLabels,
      datasets: [
        {
          label: 'Asignaciones',
          data: data.charts.assignments_by_status.map((x) => x.count),
          backgroundColor: '#8b5cf6',
        },
      ],
    });
  }

  exportExcel(): void {
    this.exporting.set(true);
    this.api
      .downloadReportsExcel(this.buildParams())
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => {
          if (blob.size < 64 && blob.type.includes('json')) {
            blob.text().then((t) => {
              try {
                const j = JSON.parse(t) as { error?: string };
                this.messages.error(j.error ?? 'Error al exportar');
              } catch {
                this.messages.error('Error al exportar');
              }
            });
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const r = this.report();
          const name = r
            ? `reporte_${r.meta.date_from}_${r.meta.date_to}.xlsx`
            : 'reporte_plataforma.xlsx';
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.messages.error('No se pudo descargar el Excel.'),
      });
  }

  labelIncidentStatus(code: string): string {
    return (
      this.report()?.filter_options.incident_status.find((o) => o.value === code)?.label ?? code
    );
  }

  labelIncidentType(code: string): string {
    return this.report()?.filter_options.incident_type.find((o) => o.value === code)?.label ?? code;
  }

  labelPaymentStatus(code: string): string {
    return this.report()?.filter_options.payment_status.find((o) => o.value === code)?.label ?? code;
  }

  labelAssignmentStatus(code: string): string {
    return (
      this.report()?.filter_options.assignment_status.find((o) => o.value === code)?.label ?? code
    );
  }

  formatDuration(sec: number | null): string {
    if (sec == null || Number.isNaN(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  formatConfidence(c: number | null | undefined): string {
    if (c == null || Number.isNaN(c)) return '—';
    const v = c <= 1 ? c * 100 : c;
    return `${Math.round(v)}%`;
  }
}
