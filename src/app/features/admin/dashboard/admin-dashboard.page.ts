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

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#f59e0b', '#8b5cf6', '#64748b'];

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
    <div class="admin-dash">
      <header class="dash-header">
        <div class="dash-header-text">
          <h1 class="app-page-title">Analítica operacional</h1>
          <p class="app-page-sub">
            Métricas en tiempo real del ciclo incidente → asignación → llegada → cierre.
          </p>
        </div>
        @if (data(); as d) {
          <div class="period-chip">
            <mat-icon aria-hidden="true">date_range</mat-icon>
            <span>{{ d.meta.date_from }} — {{ d.meta.date_to }}</span>
            @if (d.filters_applied['workshop_id']) {
              <span class="period-chip-tag">Taller #{{ d.filters_applied['workshop_id'] }}</span>
            }
          </div>
        }
      </header>

      <mat-card class="app-surface-card dash-filters">
        <mat-card-content>
          <form [formGroup]="form" class="filters-row" (ngSubmit)="load()">
            <div class="filters-fields">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Desde</mat-label>
                <input matInput type="date" formControlName="date_from" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Hasta</mat-label>
                <input matInput type="date" formControlName="date_to" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field filter-field--wide">
                <mat-label>Taller</mat-label>
                <mat-select formControlName="workshop_id">
                  <mat-option value="">Todos los talleres</mat-option>
                  @for (w of workshops(); track w.id) {
                    <mat-option [value]="'' + w.id">{{ w.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="filters-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
                <mat-icon>insights</mat-icon>
                Actualizar
              </button>
              <button mat-stroked-button type="button" (click)="resetDates()">30 días</button>
              <a mat-button routerLink="/admin/reportes">
                <mat-icon>open_in_new</mat-icon>
                Reportes
              </a>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-wrap"><mat-spinner diameter="44" /></div>
      } @else if (data()) {
        @let d = data()!;
        @let k = d.kpis;

        <section class="hero-kpis">
          <mat-card class="app-stat-card hero-kpi hero-kpi--primary">
            <mat-card-content>
              <div class="hero-kpi-top">
                <mat-icon aria-hidden="true">report</mat-icon>
                <span class="stat-label">Incidentes</span>
              </div>
              <div class="stat-value">{{ k.incidents_total }}</div>
              <div class="stat-hint">{{ k.incidents_completed }} completados · {{ k.incidents_active }} activos</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-stat-card hero-kpi">
            <mat-card-content>
              <div class="hero-kpi-top">
                <mat-icon aria-hidden="true">task_alt</mat-icon>
                <span class="stat-label">Tasa resolución</span>
              </div>
              <div class="stat-value">{{ k.resolution_rate_pct }}%</div>
              <div class="stat-hint">Casos cerrados en el período</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-stat-card hero-kpi">
            <mat-card-content>
              <div class="hero-kpi-top">
                <mat-icon aria-hidden="true">speed</mat-icon>
                <span class="stat-label">SLA llegada</span>
              </div>
              <div class="stat-value">{{ k.sla_compliance_pct ?? '—' }}@if (k.sla_compliance_pct != null) { %}</div>
              <div class="stat-hint">{{ k.sla_cases_met }}/{{ k.sla_cases_measured }} dentro del ETA</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="app-stat-card hero-kpi">
            <mat-card-content>
              <div class="hero-kpi-top">
                <mat-icon aria-hidden="true">timer</mat-icon>
                <span class="stat-label">Resolución total</span>
              </div>
              <div class="stat-value">{{ formatDuration(k.avg_resolution_seconds) }}</div>
              <div class="stat-hint">Promedio ciclo completo</div>
            </mat-card-content>
          </mat-card>
        </section>

        @if (isBrowser) {
          <div class="dash-main-grid">
            <mat-card class="app-surface-card chart-featured">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon aria-hidden="true">show_chart</mat-icon>
                  Evolución diaria
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <canvas baseChart [data]="dayChart()" [type]="'line'" [options]="lineOpts"></canvas>
              </mat-card-content>
            </mat-card>

            <mat-card class="app-surface-card chart-side">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon aria-hidden="true">donut_large</mat-icon>
                  Por tipo
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <canvas baseChart [data]="typeChart()" [type]="'doughnut'" [options]="doughnutOpts"></canvas>
              </mat-card-content>
            </mat-card>
          </div>
        }

        <div class="dash-panels">
          <section class="dash-panel">
            <div class="panel-head">
              <mat-icon aria-hidden="true">schedule</mat-icon>
              <h2>Tiempos operativos</h2>
            </div>
            <div class="metric-tiles">
              <div class="metric-tile">
                <span class="metric-tile-label">Reporte → asignación</span>
                <strong>{{ formatDuration(k.avg_report_to_assignment_seconds) }}</strong>
                <span class="metric-tile-hint">Hasta aceptación del taller</span>
              </div>
              <div class="metric-tile">
                <span class="metric-tile-label">Asignación → llegada</span>
                <strong>{{ formatDuration(k.avg_assignment_to_arrival_seconds) }}</strong>
                <span class="metric-tile-hint">Hasta llegada del técnico</span>
              </div>
              <div class="metric-tile">
                <span class="metric-tile-label">Casos asignados</span>
                <strong>{{ k.assignments_with_accepted_count }}</strong>
                <span class="metric-tile-hint">{{ k.assignments_with_arrival_count }} con llegada</span>
              </div>
              <div class="metric-tile">
                <span class="metric-tile-label">Talleres verificados</span>
                <strong>{{ k.verified_workshops_total }}</strong>
                <span class="metric-tile-hint">Activos en plataforma</span>
              </div>
            </div>
          </section>

          <section class="dash-panel">
            <div class="panel-head">
              <mat-icon aria-hidden="true">analytics</mat-icon>
              <h2>Volumen y alertas</h2>
            </div>
            <div class="metric-tiles metric-tiles--compact">
              <div class="metric-tile metric-tile--warn">
                <span class="metric-tile-label">Cancelados</span>
                <strong>{{ k.incidents_cancelled }}</strong>
                <span class="metric-tile-hint">{{ k.cancellation_rate_pct }}% del período</span>
              </div>
              <div class="metric-tile metric-tile--danger">
                <span class="metric-tile-label">No atendidos</span>
                <strong>{{ k.incidents_unattended }}</strong>
                <span class="metric-tile-hint">Sin taller tras {{ unattendedMinutes }} min</span>
              </div>
              <div class="metric-tile">
                <span class="metric-tile-label">SLA default</span>
                <strong>{{ k.sla_default_minutes }} min</strong>
                <span class="metric-tile-hint">Referencia de cumplimiento</span>
              </div>
            </div>
          </section>
        </div>

        @if (isBrowser) {
          <div class="dash-charts-row">
            <mat-card class="app-surface-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon aria-hidden="true">map</mat-icon>
                  Zonas con más incidentes
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <canvas baseChart [data]="zoneChart()" [type]="'bar'" [options]="hBarOpts"></canvas>
              </mat-card-content>
            </mat-card>
            <mat-card class="app-surface-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon aria-hidden="true">emoji_events</mat-icon>
                  Talleres más eficientes
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p class="chart-note">Menor respuesta y más casos completados.</p>
                <canvas baseChart [data]="workshopChart()" [type]="'bar'" [options]="hBarOpts"></canvas>
              </mat-card-content>
            </mat-card>
          </div>
        }

        @if (d.charts.top_workshops_efficiency.length > 0 || d.charts.top_geo_zones.length > 0) {
          <div class="dash-tables">
            @if (d.charts.top_workshops_efficiency.length > 0) {
              <mat-card class="app-surface-card table-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon aria-hidden="true">store</mat-icon>
                    Eficiencia por taller
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="app-table-wrap">
                    <table mat-table [dataSource]="d.charts.top_workshops_efficiency" class="eff-table">
                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Taller</th>
                        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                      </ng-container>
                      <ng-container matColumnDef="response">
                        <th mat-header-cell *matHeaderCellDef>Respuesta</th>
                        <td mat-cell *matCellDef="let row">{{ formatDuration(row.avg_response_seconds) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="arrival">
                        <th mat-header-cell *matHeaderCellDef>Llegada</th>
                        <td mat-cell *matCellDef="let row">{{ formatDuration(row.avg_arrival_seconds) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="completed">
                        <th mat-header-cell *matHeaderCellDef>Completados</th>
                        <td mat-cell *matCellDef="let row">{{ row.completed_count }} / {{ row.cases_count }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="effColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: effColumns"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            }
            @if (d.charts.top_geo_zones.length > 0) {
              <mat-card class="app-surface-card table-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon aria-hidden="true">place</mat-icon>
                    Top zonas
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="app-table-wrap">
                    <table mat-table [dataSource]="d.charts.top_geo_zones" class="eff-table">
                      <ng-container matColumnDef="label">
                        <th mat-header-cell *matHeaderCellDef>Zona</th>
                        <td mat-cell *matCellDef="let row">{{ row.label }}</td>
                      </ng-container>
                      <ng-container matColumnDef="coords">
                        <th mat-header-cell *matHeaderCellDef>Coordenadas</th>
                        <td mat-cell *matCellDef="let row">{{ row.latitude }}, {{ row.longitude }}</td>
                      </ng-container>
                      <ng-container matColumnDef="count">
                        <th mat-header-cell *matHeaderCellDef>Nº</th>
                        <td mat-cell *matCellDef="let row"><span class="count-pill">{{ row.count }}</span></td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="zoneColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: zoneColumns"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .admin-dash {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .dash-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .dash-header-text .app-page-title {
      background: linear-gradient(135deg, var(--app-text) 0%, var(--app-accent) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin-bottom: 0.25rem;
    }

    .dash-header-text .app-page-sub {
      max-width: 48ch;
    }

    .period-chip {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem 0.5rem;
      padding: 0.5rem 0.85rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--app-accent-hover);
      background: rgb(37 99 235 / 8%);
      border: 1px solid rgb(37 99 235 / 14%);
      backdrop-filter: blur(8px);
    }

    .period-chip .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .period-chip-tag {
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      background: rgb(37 99 235 / 12%);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .dash-filters .mat-mdc-card-content {
      padding: 1rem 1.25rem !important;
    }

    .filters-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .filters-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      flex: 1;
      min-width: min(100%, 280px);
    }

    .filter-field {
      flex: 1 1 140px;
      min-width: 130px;
    }

    .filter-field--wide {
      flex: 1 1 200px;
      min-width: 180px;
    }

    .filters-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .filters-actions button mat-icon,
    .filters-actions a mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      margin-right: 2px;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 4rem 1rem;
    }

    .hero-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: clamp(10px, 2vw, 14px);
    }

    @media (max-width: 1024px) {
      .hero-kpis {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 520px) {
      .hero-kpis {
        grid-template-columns: 1fr;
      }
    }

    .hero-kpi .mat-mdc-card-content {
      padding: 1.1rem 1.15rem !important;
    }

    .hero-kpi-top {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.35rem;
    }

    .hero-kpi-top .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--app-accent);
    }

    .hero-kpi--primary {
      border-color: rgb(37 99 235 / 22%) !important;
      background: linear-gradient(145deg, rgb(255 255 255 / 82%), rgb(219 234 254 / 45%)) !important;
    }

    .hero-kpi--primary .hero-kpi-top .mat-icon {
      color: var(--app-accent-hover);
    }

    .hero-kpi .stat-value {
      font-size: clamp(1.35rem, 3vw, 1.75rem);
    }

    .stat-hint {
      font-size: 0.72rem;
      color: var(--app-text-muted);
      margin-top: 0.35rem;
      line-height: 1.35;
    }

    .dash-main-grid {
      display: grid;
      grid-template-columns: 1.65fr 1fr;
      gap: 1rem;
      align-items: stretch;
    }

    @media (max-width: 960px) {
      .dash-main-grid {
        grid-template-columns: 1fr;
      }
    }

    .chart-featured canvas {
      max-height: min(320px, 42vh);
    }

    .chart-side canvas {
      max-height: min(280px, 38vh);
    }

    .app-surface-card .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .app-surface-card .mat-mdc-card-title .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--app-accent);
    }

    .dash-panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 840px) {
      .dash-panels {
        grid-template-columns: 1fr;
      }
    }

    .dash-panel {
      padding: 1rem 1.15rem;
      border-radius: var(--app-radius);
      border: 1px solid rgb(255 255 255 / 85%);
      background: var(--app-surface);
      backdrop-filter: var(--app-glass-blur);
      -webkit-backdrop-filter: var(--app-glass-blur);
      box-shadow: var(--app-shadow-md);
    }

    .panel-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
    }

    .panel-head .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--app-accent);
    }

    .panel-head h2 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--app-text);
    }

    .metric-tiles {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.65rem;
    }

    .metric-tiles--compact {
      grid-template-columns: 1fr;
    }

    @media (max-width: 520px) {
      .metric-tiles {
        grid-template-columns: 1fr;
      }
    }

    .metric-tile {
      padding: 0.75rem 0.85rem;
      border-radius: var(--app-radius-sm);
      background: rgb(255 255 255 / 55%);
      border: 1px solid rgb(37 99 235 / 8%);
    }

    .metric-tile--warn {
      border-color: rgb(251 146 60 / 25%);
      background: rgb(255 247 237 / 70%);
    }

    .metric-tile--danger {
      border-color: rgb(248 113 113 / 25%);
      background: rgb(254 242 242 / 70%);
    }

    .metric-tile-label {
      display: block;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
      margin-bottom: 0.25rem;
    }

    .metric-tile strong {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--app-text);
    }

    .metric-tile-hint {
      display: block;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      margin-top: 0.2rem;
      line-height: 1.3;
    }

    .dash-charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .dash-charts-row {
        grid-template-columns: 1fr;
      }
    }

    .dash-charts-row canvas {
      max-height: min(260px, 40vh);
    }

    .chart-note {
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      margin: 0 0 0.65rem;
    }

    .dash-tables {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 960px) {
      .dash-tables {
        grid-template-columns: 1fr;
      }
    }

    .table-card .mat-mdc-card-content {
      padding-top: 0 !important;
    }

    .eff-table {
      width: 100%;
    }

    .count-pill {
      display: inline-flex;
      min-width: 1.75rem;
      justify-content: center;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--app-accent-hover);
      background: var(--app-accent-soft);
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
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
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
          backgroundColor: '#3b82f6',
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
          backgroundColor: '#2563eb',
        },
        {
          label: 'Completados',
          data: shops.map((w) => w.completed_count),
          backgroundColor: '#60a5fa',
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
