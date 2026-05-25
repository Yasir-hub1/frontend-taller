import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../services/admin.service';
import { OperationalDashboardPayload } from '../../../shared/models/operational-dashboard.model';

const CHART_COLORS = ['#6366f1', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
    MatIconModule,
    MatProgressSpinner,
    MatTableModule,
    BaseChartDirective,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Analítica operacional</h1>
      <p class="app-page-sub">
        KPIs calculados desde incidentes y asignaciones reales (reporte → asignación → llegada → cierre).
        Filtrá por período o por taller.
      </p>
    </header>

    <mat-card class="app-surface-card filters-card">
      <mat-card-content>
        <form [formGroup]="form" class="filters-grid" (ngSubmit)="load()">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput type="date" formControlName="date_from" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" formControlName="date_to" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Taller (tenant)</mat-label>
            <mat-select formControlName="workshop_id">
              <mat-option value="">Todos los talleres</mat-option>
              @for (w of workshops(); track w.id) {
                <mat-option [value]="'' + w.id">{{ w.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="filter-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
              <mat-icon>insights</mat-icon>
              Actualizar
            </button>
            <button mat-button type="button" (click)="resetDates()">Últimos 30 días</button>
            <a mat-button routerLink="/admin/reportes">Reportes detallados</a>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (loading()) {
      <div class="loading-wrap"><mat-spinner /></div>
    } @else if (data()) {
      @let d = data()!;
      @let k = d.kpis;

      <p class="period-hint">
        Período: {{ d.meta.date_from }} — {{ d.meta.date_to }}
        @if (d.filters_applied['workshop_id']) {
          · Taller #{{ d.filters_applied['workshop_id'] }}
        }
      </p>

      <section class="section-title">Tiempos operativos</section>
      <div class="kpi-grid">
        <mat-card class="app-stat-card kpi-card">
          <mat-card-content>
            <div class="stat-label">Reporte → taller asignado</div>
            <div class="stat-value">{{ formatDuration(k.avg_report_to_assignment_seconds) }}</div>
            <div class="stat-hint">Promedio desde creación del incidente hasta aceptación</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card kpi-card">
          <mat-card-content>
            <div class="stat-label">Asignación → llegada</div>
            <div class="stat-value">{{ formatDuration(k.avg_assignment_to_arrival_seconds) }}</div>
            <div class="stat-hint">Desde aceptación del taller hasta llegada del técnico</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card kpi-card">
          <mat-card-content>
            <div class="stat-label">Resolución total</div>
            <div class="stat-value">{{ formatDuration(k.avg_resolution_seconds) }}</div>
            <div class="stat-hint">Casos completados con métrica de ciclo</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card kpi-card">
          <mat-card-content>
            <div class="stat-label">Casos con asignación</div>
            <div class="stat-value">{{ k.assignments_with_accepted_count }}</div>
            <div class="stat-hint">{{ k.assignments_with_arrival_count }} con llegada registrada</div>
          </mat-card-content>
        </mat-card>
      </div>

      <section class="section-title">Cumplimiento y volumen</section>
      <div class="kpi-grid">
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Incidentes</div>
            <div class="stat-value">{{ k.incidents_total }}</div>
            <div class="stat-hint">{{ k.incidents_completed }} completados · {{ k.incidents_active }} activos</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tasa resolución</div>
            <div class="stat-value">{{ k.resolution_rate_pct }}%</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Cumplimiento SLA llegada</div>
            <div class="stat-value">{{ k.sla_compliance_pct ?? '—' }}@if (k.sla_compliance_pct != null) { %}</div>
            <div class="stat-hint">
              {{ k.sla_cases_met }}/{{ k.sla_cases_measured }} dentro del ETA (o {{ k.sla_default_minutes }} min por defecto)
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Cancelados</div>
            <div class="stat-value">{{ k.incidents_cancelled }}</div>
            <div class="stat-hint">{{ k.cancellation_rate_pct }}% del período</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">No atendidos</div>
            <div class="stat-value">{{ k.incidents_unattended }}</div>
            <div class="stat-hint">Sin taller aceptado tras {{ unattendedMinutes }} min</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Talleres verificados</div>
            <div class="stat-value">{{ k.verified_workshops_total }}</div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (isBrowser) {
        <div class="charts-grid">
          <mat-card class="app-surface-card">
            <mat-card-header><mat-card-title>Incidentes por tipo</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="typeChart()" [type]="'doughnut'" [options]="doughnutOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card">
            <mat-card-header><mat-card-title>Evolución diaria</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="dayChart()" [type]="'line'" [options]="lineOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card chart-wide">
            <mat-card-header><mat-card-title>Zonas con más incidentes</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas baseChart [data]="zoneChart()" [type]="'bar'" [options]="hBarOpts"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-surface-card chart-wide">
            <mat-card-header>
              <mat-card-title>Talleres más eficientes</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="chart-note">Menor tiempo de respuesta (reporte → aceptación) y más casos completados.</p>
              <canvas baseChart [data]="workshopChart()" [type]="'bar'" [options]="hBarOpts"></canvas>
            </mat-card-content>
          </mat-card>
        </div>
      }

      @if (d.charts.top_workshops_efficiency.length > 0) {
        <mat-card class="app-surface-card table-card">
          <mat-card-header><mat-card-title>Detalle eficiencia por taller</mat-card-title></mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="d.charts.top_workshops_efficiency" class="eff-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Taller</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="response">
                <th mat-header-cell *matHeaderCellDef>Respuesta media</th>
                <td mat-cell *matCellDef="let row">{{ formatDuration(row.avg_response_seconds) }}</td>
              </ng-container>
              <ng-container matColumnDef="arrival">
                <th mat-header-cell *matHeaderCellDef>Llegada media</th>
                <td mat-cell *matCellDef="let row">{{ formatDuration(row.avg_arrival_seconds) }}</td>
              </ng-container>
              <ng-container matColumnDef="completed">
                <th mat-header-cell *matHeaderCellDef>Completados</th>
                <td mat-cell *matCellDef="let row">{{ row.completed_count }} / {{ row.cases_count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="effColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: effColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }

      @if (d.charts.top_geo_zones.length > 0) {
        <mat-card class="app-surface-card table-card">
          <mat-card-header><mat-card-title>Top zonas geográficas</mat-card-title></mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="d.charts.top_geo_zones" class="eff-table">
              <ng-container matColumnDef="label">
                <th mat-header-cell *matHeaderCellDef>Zona / referencia</th>
                <td mat-cell *matCellDef="let row">{{ row.label }}</td>
              </ng-container>
              <ng-container matColumnDef="coords">
                <th mat-header-cell *matHeaderCellDef>Coordenadas</th>
                <td mat-cell *matCellDef="let row">{{ row.latitude }}, {{ row.longitude }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>Incidentes</th>
                <td mat-cell *matCellDef="let row">{{ row.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="zoneColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: zoneColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: `
    .filters-card { margin-bottom: 1rem; }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: 12px;
      align-items: start;
    }
    .filter-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      grid-column: 1 / -1;
    }
    .period-hint {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 0 0 1rem;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--app-text-muted, #64748b);
      margin: 0.5rem 0 0.75rem;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: clamp(10px, 2vw, 14px);
      margin-bottom: 1.25rem;
    }
    .stat-hint {
      font-size: 0.7rem;
      color: var(--app-text-muted, #64748b);
      margin-top: 4px;
      line-height: 1.3;
    }
    .kpi-card .stat-value {
      font-size: 1.25rem;
    }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .chart-wide {
      grid-column: 1 / -1;
    }
    @media (max-width: 900px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
    canvas {
      max-height: min(280px, 45vh);
    }
    .chart-note {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 0 0 0.75rem;
    }
    .table-card {
      margin-bottom: 1rem;
    }
    .eff-table {
      width: 100%;
    }
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly unattendedMinutes = 60;
  readonly effColumns = ['name', 'response', 'arrival', 'completed'];
  readonly zoneColumns = ['label', 'coords', 'count'];

  readonly loading = signal(false);
  readonly data = signal<OperationalDashboardPayload | null>(null);
  readonly workshops = signal<{ id: number; name: string }[]>([]);

  readonly typeChart = signal<ChartConfiguration<'doughnut'>['data']>({ labels: [], datasets: [] });
  readonly dayChart = signal<ChartConfiguration<'line'>['data']>({ labels: [], datasets: [] });
  readonly zoneChart = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly workshopChart = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });

  readonly doughnutOpts: ChartConfiguration<'doughnut'>['options'] = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  readonly lineOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
  };
  readonly hBarOpts: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    scales: { x: { beginAtZero: true } },
  };

  readonly form = this.fb.group({
    date_from: [''],
    date_to: [''],
    workshop_id: [''],
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.resetDates();
  }

  resetDates() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    this.form.patchValue({
      date_from: this.isoDate(from),
      date_to: this.isoDate(to),
      workshop_id: '',
    });
    this.load();
  }

  load() {
    const v = this.form.getRawValue();
    const params: Record<string, string> = {};
    if (v.date_from) params['date_from'] = v.date_from;
    if (v.date_to) params['date_to'] = v.date_to;
    if (v.workshop_id) params['workshop_id'] = v.workshop_id;

    this.loading.set(true);
    this.api
      .getOperationalDashboard(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (payload) => {
          this.data.set(payload);
          this.workshops.set(payload.workshops_filter ?? []);
          this.patchCharts(payload);
        },
      });
  }

  private patchCharts(d: OperationalDashboardPayload) {
    const types = d.charts.incidents_by_type_grouped;
    this.typeChart.set({
      labels: types.map((t) => t.label),
      datasets: [
        {
          data: types.map((t) => t.count),
          backgroundColor: CHART_COLORS,
        },
      ],
    });

    const days = d.charts.incidents_by_day;
    this.dayChart.set({
      labels: days.map((x) => x.day),
      datasets: [
        {
          label: 'Incidentes',
          data: days.map((x) => x.count),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.15)',
          fill: true,
          tension: 0.25,
        },
      ],
    });

    const zones = d.charts.top_geo_zones;
    this.zoneChart.set({
      labels: zones.map((z) => z.label),
      datasets: [
        {
          label: 'Incidentes',
          data: zones.map((z) => z.count),
          backgroundColor: '#0d9488',
        },
      ],
    });

    const shops = d.charts.top_workshops_efficiency;
    this.workshopChart.set({
      labels: shops.map((w) => w.name),
      datasets: [
        {
          label: 'Respuesta (min)',
          data: shops.map((w) => Math.round((w.avg_response_seconds ?? 0) / 60)),
          backgroundColor: '#6366f1',
        },
        {
          label: 'Completados',
          data: shops.map((w) => w.completed_count),
          backgroundColor: '#0d9488',
        },
      ],
    });
  }

  formatDuration(sec: number | null | undefined): string {
    if (sec == null || Number.isNaN(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}h ${rm}m`;
    }
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  private isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
