import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { WorkshopOwnerService, PaymentsEarningsSummary } from '../services/workshop-owner.service';
import { CurrencyBoPipe } from '../../../shared/pipes/currency-bo.pipe';

type RecentPayment = {
  id: number;
  incident_id: number;
  total_amount: string;
  net_amount: string;
  status: string;
};

@Component({
  standalone: true,
  selector: 'app-earnings',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatTableModule, CurrencyBoPipe],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Ingresos</h1>
      <p class="app-page-sub">Resumen de pagos y comisiones de la plataforma.</p>
    </header>
    @if (sum()) {
      <div class="grid">
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Bruto</div>
            <div class="stat-value">{{ sum()!.total_earnings_gross | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Comisiones</div>
            <div class="stat-value">{{ sum()!.total_commission | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Neto</div>
            <div class="stat-value">{{ sum()!.total_earnings_net | currencyBo }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="app-stat-card">
          <mat-card-content>
            <div class="stat-label">Pendientes / pagados</div>
            <div class="stat-value">{{ sum()!.pending_payments }} / {{ sum()!.completed_payments }}</div>
          </mat-card-content>
        </mat-card>
      </div>
    }
    <mat-card class="mt app-surface-card">
      <mat-card-header><mat-card-title>Pagos recientes</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="app-table-wrap">
          <table mat-table [dataSource]="recent()" class="full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let p">{{ p.id }}</td>
            </ng-container>
            <ng-container matColumnDef="inc">
              <th mat-header-cell *matHeaderCellDef>Incidente</th>
              <td mat-cell *matCellDef="let p">{{ p.incident_id }}</td>
            </ng-container>
            <ng-container matColumnDef="tot">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let p">{{ p.total_amount | currencyBo }}</td>
            </ng-container>
            <ng-container matColumnDef="net">
              <th mat-header-cell *matHeaderCellDef>Neto</th>
              <td mat-cell *matCellDef="let p">{{ p.net_amount | currencyBo }}</td>
            </ng-container>
            <ng-container matColumnDef="st">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">{{ p.status }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 148px), 1fr));
      gap: clamp(10px, 2vw, 14px);
      margin: 0 0 1rem;
    }
    .mt { margin-top: 1.25rem; }
    .full { width: 100%; }
  `,
})
export class EarningsPage implements OnInit {
  private readonly api = inject(WorkshopOwnerService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly sum = signal<PaymentsEarningsSummary | null>(null);
  readonly recent = signal<RecentPayment[]>([]);
  cols = ['id', 'inc', 'tot', 'net', 'st'];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  private load() {
    this.api.getPaymentsEarnings().subscribe((s) => this.sum.set(s));
    this.api.getWorkshopEarnings().subscribe((e) => this.recent.set(e.recent_payments));
  }
}
