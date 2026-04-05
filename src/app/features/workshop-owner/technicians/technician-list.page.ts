import { Component, OnInit, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { Technician } from '../../../shared/models/workshop.model';
import { MapViewComponent } from '../../../shared/components/map-view/map-view';
import { TechnicianFormDialog } from './technician-form.dialog';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-technician-list',
  imports: [MatTableModule, MatButtonModule, MatSlideToggleModule, MapViewComponent],
  template: `
    <header class="app-page-head head-row">
      <div>
        <h1 class="app-page-title">Técnicos</h1>
        <p class="app-page-sub">Gestioná disponibilidad y especialidades de tu equipo.</p>
      </div>
      <button mat-flat-button color="primary" (click)="add()">+ Agregar técnico</button>
    </header>

    <div class="app-table-wrap">
      <table mat-table [dataSource]="rows()" class="full">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let t">{{ t.name }}</td>
        </ng-container>
        <ng-container matColumnDef="phone">
          <th mat-header-cell *matHeaderCellDef>Teléfono</th>
          <td mat-cell *matCellDef="let t">{{ t.phone }}</td>
        </ng-container>
        <ng-container matColumnDef="spec">
          <th mat-header-cell *matHeaderCellDef>Especialidades</th>
          <td mat-cell *matCellDef="let t">{{ t.specialties?.join(', ') }}</td>
        </ng-container>
        <ng-container matColumnDef="av">
          <th mat-header-cell *matHeaderCellDef>Disponible</th>
          <td mat-cell *matCellDef="let t">
            <mat-slide-toggle [checked]="t.is_available" (change)="toggle(t, $event.checked)" />
          </td>
        </ng-container>
        <ng-container matColumnDef="del">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let t">
            <button mat-button color="warn" (click)="remove(t)">Eliminar</button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
    </div>

    @if (withLoc().length > 0) {
      <h2 class="mt section-title">Ubicaciones</h2>
      <div class="maps">
        @for (t of withLoc(); track t.id) {
          <div class="mc">
            <p>{{ t.name }}</p>
            <app-map-view
              [incidentLat]="num(t.current_latitude)"
              [incidentLng]="num(t.current_longitude)"
            />
          </div>
        }
      </div>
    }
  `,
  styles: `
    .head-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .head-row button { flex-shrink: 0; }
    .full { width: 100%; }
    .mt { margin-top: 1.75rem; }
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 0.75rem;
    }
    .maps {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 1rem;
    }
    .mc p { font-weight: 600; font-size: 0.9rem; }
  `,
})
export class TechnicianListPage implements OnInit {
  private readonly api = inject(WorkshopOwnerService);
  private readonly dialog = inject(MatDialog);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = signal<Technician[]>([]);
  readonly withLoc = computed(() =>
    this.rows().filter((t) => t.current_latitude != null && t.current_longitude != null),
  );
  cols = ['name', 'phone', 'spec', 'av', 'del'];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getTechnicians().subscribe((r) => this.rows.set(r));
  }

  num(v: string | number | null) {
    return Number(v);
  }

  toggle(t: Technician, v: boolean) {
    this.api.patchAvailability(t.id, v).subscribe((u) => {
      this.rows.update((list) => list.map((x) => (x.id === t.id ? { ...x, is_available: u.is_available } : x)));
      this.messages.success('Disponibilidad actualizada');
    });
  }

  remove(t: Technician) {
    if (!confirm('¿Eliminar técnico?')) return;
    this.api.deleteTechnician(t.id).subscribe(() => {
      this.messages.success('Técnico eliminado');
      this.load();
    });
  }

  add() {
    const ref = this.dialog.open(TechnicianFormDialog, {
      width: 'min(480px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'app-dialog-panel',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    ref.afterClosed().subscribe((ok) => ok && this.load());
  }
}
