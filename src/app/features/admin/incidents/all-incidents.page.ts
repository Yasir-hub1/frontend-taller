import { SlicePipe, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { Incident } from '../../../shared/models/incident.model';
import { asPaged } from '../utils/paginated-response.util';

@Component({
  standalone: true,
  selector: 'app-all-incidents',
  imports: [MatTableModule, MatPaginatorModule, RouterLink, MatButtonModule, SlicePipe],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Incidentes</h1>
      <p class="app-page-sub">Vista global de todos los incidentes.</p>
    </header>
    <div class="app-data-block">
      <div class="app-table-wrap">
        <table mat-table [dataSource]="rows()" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let i">{{ i.id }}</td>
          </ng-container>
          <ng-container matColumnDef="st">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let i">{{ i.status }}</td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let i">{{ i.incident_type }}</td>
          </ng-container>
          <ng-container matColumnDef="addr">
            <th mat-header-cell *matHeaderCellDef>Dirección</th>
            <td mat-cell *matCellDef="let i">{{ i.address_text | slice : 0 : 48 }}…</td>
          </ng-container>
          <ng-container matColumnDef="lnk">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let i">
              <a mat-button [routerLink]="['/admin/incidentes', i.id]">Detalle</a>
            </td>
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
export class AllIncidentsPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = signal<Incident[]>([]);
  readonly total = signal(0);
  pageSize = 20;
  pageIndex = 0;
  cols = ['id', 'st', 'type', 'addr', 'lnk'];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getIncidents({ page: String(this.pageIndex + 1) }).subscribe((res) => {
      const { results, count } = asPaged<Incident>(res);
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
