import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { IncidentWebService } from '../services/incident-web.service';
import { AvailableIncidentRow, IncidentHistoryRow } from '../../../shared/models/incident.model';
import { PriorityChipComponent } from '../../../shared/components/priority-chip/priority-chip';
import { DistanceKmPipe } from '../../../shared/pipes/distance.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { RejectIncidentDialog } from './reject-incident.dialog';

@Component({
  standalone: true,
  selector: 'app-incident-list',
  imports: [
    MatTabsModule, MatButtonModule, MatTableModule, MatDialogModule,
    RouterLink, PriorityChipComponent, DistanceKmPipe, TimeAgoPipe,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Incidentes</h1>
      <p class="app-page-sub">Ofertas nuevas, trabajo en curso e historial en un solo lugar.</p>
    </header>
    <mat-tab-group [(selectedIndex)]="tab" class="incident-tabs">
      <mat-tab label="Disponibles">
        <div class="app-table-wrap">
          <table mat-table [dataSource]="available()" class="full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let r">{{ r.incident_id }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let r">{{ r.incident_type }}</td>
            </ng-container>
            <ng-container matColumnDef="pri">
              <th mat-header-cell *matHeaderCellDef>Prioridad</th>
              <td mat-cell *matCellDef="let r">
                <app-priority-chip [label]="r.priority || '—'" />
              </td>
            </ng-container>
            <ng-container matColumnDef="addr">
              <th mat-header-cell *matHeaderCellDef>Ubicación</th>
              <td mat-cell *matCellDef="let r">{{ r.address }} ({{ r.distance_km | distanceKm }})</td>
            </ng-container>
            <ng-container matColumnDef="when">
              <th mat-header-cell *matHeaderCellDef>Creado</th>
              <td mat-cell *matCellDef="let r">{{ r.created_at | timeAgo }}</td>
            </ng-container>
            <ng-container matColumnDef="act">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r" class="cell-actions">
                <a mat-button [routerLink]="[r.incident_id]">Detalle</a>
                <button mat-button color="warn" (click)="reject(r)">Rechazar</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colsA"></tr>
            <tr mat-row *matRowDef="let row; columns: colsA"></tr>
          </table>
        </div>
      </mat-tab>
      <mat-tab label="En proceso">
        <div class="app-table-wrap">
          <table mat-table [dataSource]="inProgress()" class="full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let r">{{ r.incident_id }}</td>
            </ng-container>
            <ng-container matColumnDef="st">
              <th mat-header-cell *matHeaderCellDef>Estado asignación</th>
              <td mat-cell *matCellDef="let r">{{ r.status }}</td>
            </ng-container>
            <ng-container matColumnDef="act">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <a mat-button [routerLink]="[r.incident_id]">Detalle</a>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colsP"></tr>
            <tr mat-row *matRowDef="let row; columns: colsP"></tr>
          </table>
        </div>
      </mat-tab>
      <mat-tab label="Historial">
        <div class="app-table-wrap">
          <table mat-table [dataSource]="historyDone()" class="full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let r">{{ r.incident_id }}</td>
            </ng-container>
            <ng-container matColumnDef="st">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let r">{{ r.status }}</td>
            </ng-container>
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef>Costo</th>
              <td mat-cell *matCellDef="let r">{{ r.service_cost ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="act">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <a mat-button [routerLink]="[r.incident_id]">Ver</a>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colsH"></tr>
            <tr mat-row *matRowDef="let row; columns: colsH"></tr>
          </table>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .full { width: 100%; }
    .cell-actions { white-space: nowrap; }
    .cell-actions a, .cell-actions button { margin: 2px 0; }
    @media (max-width: 700px) {
      .cell-actions { white-space: normal; }
      .cell-actions a, .cell-actions button { display: inline-flex; margin: 4px 4px 4px 0; }
    }
  `,
})
export class IncidentListPage implements OnInit {
  private readonly api = inject(IncidentWebService);
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);

  tab = 0;
  readonly available = signal<AvailableIncidentRow[]>([]);
  readonly inProgress = signal<IncidentHistoryRow[]>([]);
  readonly historyDone = signal<IncidentHistoryRow[]>([]);

  colsA = ['id', 'type', 'pri', 'addr', 'when', 'act'];
  colsP = ['id', 'st', 'act'];
  colsH = ['id', 'st', 'cost', 'act'];

  private static readonly ACTIVE = new Set(['accepted', 'in_route', 'arrived', 'in_service']);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.reload();
  }

  reload() {
    this.api.getAvailableIncidents().subscribe((a) => this.available.set(a));
    this.api.getHistory().subscribe((h) => {
      this.inProgress.set(h.filter((r) => IncidentListPage.ACTIVE.has(r.assignment_status)));
      this.historyDone.set(h.filter((r) => r.assignment_status === 'completed' || r.assignment_status === 'rejected'));
    });
  }

  reject(row: AvailableIncidentRow) {
    const ref = this.dialog.open(RejectIncidentDialog, { data: { id: row.incident_id } });
    ref.afterClosed().subscribe((ok) => ok && this.reload());
  }
}
