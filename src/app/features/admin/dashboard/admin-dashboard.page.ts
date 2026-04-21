import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AdminService } from '../services/admin.service';
import { CurrencyBoPipe } from '../../../shared/pipes/currency-bo.pipe';
import { GlobalMetrics } from '../../../shared/models/payment.model';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, BaseChartDirective, CurrencyBoPipe],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Dashboard</h1>
      <p class="app-page-sub">Métricas globales de la plataforma.</p>
    </header>
    @if (m()) {
      <div class="grid">
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Usuarios</div>
            <div class="stat-value">{{ m()!.total_users }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Clientes</div>
            <div class="stat-value">{{ m()!.total_clients }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Talleres</div>
            <div class="stat-value">{{ m()!.total_workshops }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Incidentes activos</div>
            <div class="stat-value">{{ m()!.active_incidents }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Ingresos totales</div>
            <div class="stat-value">{{ m()!.total_revenue | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Comisión acumulada</div>
            <div class="stat-value">{{ m()!.total_commission_earned | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tasa resolución</div>
            <div class="stat-value">{{ m()!.resolution_rate_pct }}%</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Tiempo medio asignación</div>
            <div class="stat-value">{{ formatAssignSec(m()!.avg_assignment_seconds) }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Comisión del mes</div>
            <div class="stat-value">{{ m()!.commission_this_month | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Calif. plataforma</div>
            <div class="stat-value">{{ m()!.platform_rating_avg ?? '—' }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card app-stat-card--wide">
          <mat-card-content>
            <div class="stat-label">Muestra IA (último ciclo)</div>
            <div class="stat-value stat-small">
              {{ m()!.ia_sample_predicted_type || '—' }}
              @if (m()!.ia_sample_confidence != null) {
                <span> · {{ formatIaPct(m()!.ia_sample_confidence!) }}%</span>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      @if (isBrowser) {
        <mat-card class="mt app-surface-card">
          <mat-card-header><mat-card-title>Resumen operativo</mat-card-title></mat-card-header>
          <mat-card-content>
            <canvas baseChart [data]="barData()" [type]="'bar'" [options]="barOpts"></canvas>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
      gap: clamp(10px, 2vw, 14px);
      margin: 0 0 1.25rem;
    }
    .app-stat-card--wide { grid-column: span 2; }
    @media (max-width: 520px) {
      .app-stat-card--wide { grid-column: span 1; }
    }
    .stat-small { font-size: 0.9375rem; line-height: 1.35; }
    .mt { margin-top: 1rem; }
    canvas { max-height: min(320px, 55vh); }
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly m = signal<GlobalMetrics | null>(null);
  readonly barData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly barOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.fetchMetrics();
  }

  private fetchMetrics() {
    this.api.getMetrics().subscribe((x) => {
      this.m.set(x);
      this.barData.set({
        labels: ['Incidentes totales', 'Mes', 'Activos', 'Completados'],
        datasets: [
          {
            label: 'Cantidad',
            data: [x.total_incidents, x.incidents_this_month, x.active_incidents, x.completed_incidents],
            backgroundColor: '#6366f1',
          },
        ],
      });
    });
  }

  formatAssignSec(sec: number | null): string {
    if (sec == null || Number.isNaN(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  formatIaPct(c: number): string {
    const v = c <= 1 ? c * 100 : c;
    return String(Math.round(v));
  }
}
