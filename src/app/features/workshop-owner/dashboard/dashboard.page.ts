import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { RouterLink } from '@angular/router';
import { WorkshopOwnerService, WorkshopDashboard } from '../services/workshop-owner.service';
import { IncidentWebService } from '../services/incident-web.service';
import { CurrencyBoPipe } from '../../../shared/pipes/currency-bo.pipe';
import { Technician } from '../../../shared/models/workshop.model';
import { AvailableIncidentRow } from '../../../shared/models/incident.model';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-workshop-dashboard',
  imports: [
    MatCard, MatCardHeader, MatCardTitle, MatCardContent,
    BaseChartDirective, MatSlideToggleModule,
    CurrencyBoPipe, RouterLink,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Dashboard</h1>
      <p class="app-page-sub">Resumen de tu taller: cola, ingresos y equipo.</p>
    </header>
    <div class="grid">
      <mat-card class="app-stat-card">
        <mat-card-content>
          <div class="stat-label">Solicitudes ofertadas</div>
          <div class="stat-value">{{ d()?.pending_requests ?? '—' }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="app-stat-card">
        <mat-card-content>
          <div class="stat-label">Servicios activos</div>
          <div class="stat-value">{{ d()?.active_services ?? '—' }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="app-stat-card">
        <mat-card-content>
          <div class="stat-label">Completados (mes)</div>
          <div class="stat-value">{{ d()?.completed_this_month ?? '—' }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="app-stat-card">
        <mat-card-content>
          <div class="stat-label">Ingresos acumulados</div>
          <div class="stat-value">{{ d()?.total_earnings | currencyBo }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="app-stat-card">
        <mat-card-content>
          <div class="stat-label">Calificación</div>
          <div class="stat-value">{{ d()?.rating_avg ?? '—' }}</div>
        </mat-card-content>
      </mat-card>
    </div>
    <div class="charts">
      <mat-card class="ch app-surface-card">
        <mat-card-header><mat-card-title>Cola vs activos vs mes</mat-card-title></mat-card-header>
        <mat-card-content>
          <canvas baseChart [data]="donutData()" [type]="'doughnut'" [options]="donutOpts"></canvas>
        </mat-card-content>
      </mat-card>
      <mat-card class="ch app-surface-card">
        <mat-card-header><mat-card-title>Últimos pagos netos</mat-card-title></mat-card-header>
        <mat-card-content>
          <canvas baseChart [data]="barData()" [type]="'bar'" [options]="barOpts"></canvas>
        </mat-card-content>
      </mat-card>
    </div>
    @if (recent().length > 0) {
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Últimas ofertas</mat-card-title></mat-card-header>
        <mat-card-content>
          <ul class="link-list">
            @for (r of recent(); track r.incident_id) {
              <li>
                <a [routerLink]="['/taller/incidentes', r.incident_id]">#{{ r.incident_id }}</a>
                <span class="meta">{{ r.incident_type }} · {{ r.address.slice(0, 36) }}…</span>
              </li>
            }
          </ul>
        </mat-card-content>
      </mat-card>
    }
    @if (techs().length > 0) {
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Técnicos</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (t of techs(); track t.id) {
            <div class="tech">
              <span class="tech-name">{{ t.name }}</span>
              <mat-slide-toggle [checked]="t.is_available" (change)="toggleTech(t, $event.checked)" class="tech-toggle">
                Disponible
              </mat-slide-toggle>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 148px), 1fr));
      gap: clamp(10px, 2vw, 14px);
      margin: 0 0 1.25rem;
    }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
      gap: 1rem;
    }
    .ch .mat-mdc-card-title { font-size: 1rem; }
    .ch canvas { max-height: min(280px, 50vw); }
    .mt { margin-top: 1rem; }
    .link-list { list-style: none; margin: 0; padding: 0; }
    .link-list li {
      padding: 0.65rem 0;
      border-bottom: 1px solid var(--app-border, #e2e8f0);
      display: flex; flex-direction: column; gap: 4px;
    }
    .link-list li:last-child { border-bottom: none; }
    .link-list a { font-weight: 600; color: var(--app-accent, #0d9488); text-decoration: none; }
    .link-list a:hover { text-decoration: underline; }
    .meta { font-size: 0.8125rem; color: var(--app-text-muted, #64748b); }
    .tech {
      display: flex; flex-wrap: wrap; justify-content: space-between;
      align-items: center; gap: 8px;
      padding: 0.65rem 0;
      border-bottom: 1px solid var(--app-border, #e2e8f0);
    }
    .tech:last-child { border-bottom: none; }
    .tech-name { font-weight: 500; }
  `,
})
export class WorkshopDashboardPage implements OnInit {
  private readonly api = inject(WorkshopOwnerService);
  private readonly incidents = inject(IncidentWebService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly d = signal<WorkshopDashboard | null>(null);
  readonly recent = signal<AvailableIncidentRow[]>([]);
  readonly techs = signal<Technician[]>([]);
  readonly donutData = signal<ChartConfiguration<'doughnut'>['data']>({ labels: [], datasets: [] });
  readonly barData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });

  readonly donutOpts: ChartConfiguration<'doughnut'>['options'] = { responsive: true };
  readonly barOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: { x: {}, y: { beginAtZero: true } },
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  private load() {
    this.api.getDashboard().subscribe((x) => {
      this.d.set(x);
      this.donutData.set({
        labels: ['Ofertadas', 'Activos', 'Completados mes'],
        datasets: [{ data: [x.pending_requests, x.active_services, x.completed_this_month], backgroundColor: ['#f59e0b', '#0ea5e9', '#14b8a6'] }],
      });
    });
    this.incidents.getAvailableIncidents().subscribe((list) => this.recent.set(list.slice(0, 5)));
    this.api.getTechnicians().subscribe((t) => this.techs.set(t));
    this.api.getWorkshopEarnings().subscribe((e) => {
      const rp = e.recent_payments.slice(0, 6).reverse();
      this.barData.set({
        labels: rp.map((p) => '#' + p.incident_id),
        datasets: [{ label: 'Neto taller', data: rp.map((p) => Number(p.net_amount)), backgroundColor: '#0d9488' }],
      });
    });
  }

  toggleTech(t: Technician, v: boolean) {
    this.api.patchAvailability(t.id, v).subscribe((updated) => {
      this.techs.update((list) => list.map((x) => (x.id === t.id ? { ...x, is_available: updated.is_available } : x)));
      this.messages.success('Disponibilidad actualizada');
    });
  }
}
