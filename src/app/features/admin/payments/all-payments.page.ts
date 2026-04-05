import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminService } from '../services/admin.service';
import { Payment } from '../../../shared/models/payment.model';
import { CurrencyBoPipe } from '../../../shared/pipes/currency-bo.pipe';
import { asPaged } from '../utils/paginated-response.util';

@Component({
  standalone: true,
  selector: 'app-all-payments',
  imports: [MatTableModule, MatPaginatorModule, CurrencyBoPipe],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Pagos</h1>
      <p class="app-page-sub">Transacciones registradas en la plataforma.</p>
    </header>
    <div class="app-data-block">
      <div class="app-table-wrap">
        <table mat-table [dataSource]="rows()" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let p">{{ p.id }}</td>
          </ng-container>
          <ng-container matColumnDef="ws">
            <th mat-header-cell *matHeaderCellDef>Taller</th>
            <td mat-cell *matCellDef="let p">{{ p.workshop_name }}</td>
          </ng-container>
          <ng-container matColumnDef="cl">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let p">{{ p.client_name }}</td>
          </ng-container>
          <ng-container matColumnDef="tot">
            <th mat-header-cell *matHeaderCellDef>Total</th>
            <td mat-cell *matCellDef="let p">{{ p.total_amount | currencyBo }}</td>
          </ng-container>
          <ng-container matColumnDef="com">
            <th mat-header-cell *matHeaderCellDef>Comisión</th>
            <td mat-cell *matCellDef="let p">{{ p.commission_amount | currencyBo }}</td>
          </ng-container>
          <ng-container matColumnDef="st">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let p">{{ p.status }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>
      <mat-paginator
        class="app-paginator"
        [length]="total()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        (page)="page($event)"
      />
    </div>
  `,
  styles: `
    .full { width: 100%; }
  `,
})
export class AllPaymentsPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = signal<Payment[]>([]);
  readonly total = signal(0);
  pageSize = 20;
  pageIndex = 0;
  cols = ['id', 'ws', 'cl', 'tot', 'com', 'st'];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getAllPayments({ page: String(this.pageIndex + 1) }).subscribe((res) => {
      const { results, count } = asPaged<Payment>(res);
      this.rows.set(results);
      this.total.set(count);
    });
  }

  page(ev: PageEvent) {
    this.pageIndex = ev.pageIndex;
    this.pageSize = ev.pageSize;
    this.load();
  }
}
