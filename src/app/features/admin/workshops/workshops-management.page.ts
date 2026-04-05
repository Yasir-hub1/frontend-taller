import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminService } from '../services/admin.service';
import { Workshop } from '../../../shared/models/workshop.model';
import { MessagesService } from '../../../core/services/messages.service';
import { asPaged } from '../utils/paginated-response.util';

@Component({
  standalone: true,
  selector: 'app-workshops-management',
  imports: [MatTableModule, MatButtonModule, MatPaginatorModule],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Talleres</h1>
      <p class="app-page-sub">Verificación y estado operativo.</p>
    </header>
    <div class="app-data-block">
      <div class="app-table-wrap">
        <table mat-table [dataSource]="rows()" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let w">{{ w.id }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let w">{{ w.name }}</td>
          </ng-container>
          <ng-container matColumnDef="ver">
            <th mat-header-cell *matHeaderCellDef>Verificado</th>
            <td mat-cell *matCellDef="let w">{{ w.is_verified ? 'Sí' : 'No' }}</td>
          </ng-container>
          <ng-container matColumnDef="act">
            <th mat-header-cell *matHeaderCellDef>Activo</th>
            <td mat-cell *matCellDef="let w">{{ w.is_active ? 'Sí' : 'No' }}</td>
          </ng-container>
          <ng-container matColumnDef="ops">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let w">
              @if (!w.is_verified) {
                <button mat-button color="primary" (click)="verify(w)">Verificar</button>
              }
              <button mat-button (click)="toggle(w)">Toggle activo</button>
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
    .mat-column-ops { white-space: normal; }
    .mat-column-ops button { margin: 2px 4px 2px 0; }
  `,
})
export class WorkshopsManagementPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = signal<Workshop[]>([]);
  readonly total = signal(0);
  pageSize = 20;
  pageIndex = 0;
  cols = ['id', 'name', 'ver', 'act', 'ops'];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getWorkshops({ page: String(this.pageIndex + 1) }).subscribe((res) => {
      const { results, count } = asPaged<Workshop>(res);
      this.rows.set(results);
      this.total.set(count);
    });
  }

  page(ev: PageEvent) {
    this.pageIndex = ev.pageIndex;
    this.pageSize = ev.pageSize;
    this.load();
  }

  verify(w: Workshop) {
    this.api.verifyWorkshop(w.id).subscribe(() => {
      this.messages.success('Taller verificado');
      this.load();
    });
  }

  toggle(w: Workshop) {
    this.api.toggleWorkshopActive(w.id).subscribe(() => {
      this.messages.success('Estado del taller actualizado');
      this.load();
    });
  }
}
