import { Component, DestroyRef, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { IncidentWebService } from '../services/incident-web.service';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { Incident } from '../../../shared/models/incident.model';
import { MapViewComponent } from '../../../shared/components/map-view/map-view';
import { AiSummaryCardComponent } from '../../../shared/components/ai-summary-card/ai-summary-card';
import { EvidenceGalleryComponent } from '../../../shared/components/evidence-gallery/evidence-gallery';
import { AcceptIncidentDialog } from './accept-incident.dialog';
import { CompleteIncidentDialog } from './complete-incident.dialog';
import { RejectIncidentDialog } from '../incident-list/reject-incident.dialog';
import { Workshop } from '../../../shared/models/workshop.model';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-incident-detail',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatSelectModule,
    FormsModule,
    MapViewComponent,
    AiSummaryCardComponent,
    EvidenceGalleryComponent,
  ],
  template: `
    @if (loadError) {
      <p class="muted">{{ loadError }}</p>
    } @else if (loading && !inc) {
      <p class="muted">Cargando incidente…</p>
    }
    @if (inc) {
      <header class="app-page-head head-inc">
        <div class="head-row">
          <h1 class="app-page-title">Incidente #{{ inc.id }}</h1>
          <span class="pill">{{ inc.status }}</span>
        </div>
        <p class="app-page-sub">{{ inc.address_text }}</p>
      </header>
      <div class="grid">
        <app-map-view
          [incidentLat]="num(inc.latitude)"
          [incidentLng]="num(inc.longitude)"
          [workshopLat]="ws ? num(ws.latitude) : null"
          [workshopLng]="ws ? num(ws.longitude) : null"
        />
        <app-ai-summary-card
          [summary]="aiParsed"
          [confidence]="inc.ai_confidence"
        />
      </div>
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Vehículo</mat-card-title></mat-card-header>
        <mat-card-content>
          <p>{{ inc.vehicle_info || '—' }}</p>
        </mat-card-content>
      </mat-card>
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Descripción</mat-card-title></mat-card-header>
        <mat-card-content>
          <p class="desc">{{ inc.description }}</p>
        </mat-card-content>
      </mat-card>
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Evidencias</mat-card-title></mat-card-header>
        <mat-card-content>
          <app-evidence-gallery [evidences]="inc.evidences" />
        </mat-card-content>
      </mat-card>
      <div class="actions mt">
        @if (asg === 'offered') {
          <button mat-flat-button color="primary" (click)="openAccept()">Aceptar</button>
          <button mat-stroked-button color="warn" (click)="openReject()">Rechazar</button>
        }
        @if (asg === 'accepted' || asg === 'in_route' || asg === 'arrived' || asg === 'in_service') {
          <mat-form-field appearance="outline" class="status-field">
            <mat-label>Actualizar estado</mat-label>
            <mat-select [(ngModel)]="nextSt" placeholder="Estado">
              <mat-option value="in_route">En ruta</mat-option>
              <mat-option value="arrived">Llegó</mat-option>
              <mat-option value="in_service">En servicio</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="patchStatus()">Guardar estado</button>
          <button mat-stroked-button color="primary" (click)="openComplete()">Completar</button>
        }
      </div>
    }
  `,
  styles: `
    .head-inc .head-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .pill {
      background: var(--app-accent-soft, #ccfbf1);
      color: var(--app-accent-hover, #0f766e);
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .desc {
      margin: 0;
      line-height: 1.55;
      font-size: 0.9375rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .mt {
      margin-top: 12px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .status-field {
      min-width: min(100%, 220px);
    }
    .muted {
      margin: 0;
      color: var(--app-text-muted, #64748b);
      font-size: 0.9375rem;
    }
  `,
})
export class IncidentDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(IncidentWebService);
  private readonly workshopApi = inject(WorkshopOwnerService);
  private readonly dialog = inject(MatDialog);
  private readonly messages = inject(MessagesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  inc: Incident | null = null;
  ws: Workshop | null = null;
  aiParsed = this.api.parseAISummary(null);
  asg = '';
  nextSt = 'in_route';
  loading = false;
  loadError: string | null = null;

  ngOnInit(): void {
    // Cargar workshop una sola vez al inicializar
    this.workshopApi.getMyWorkshop().subscribe({
      next: (w) => {
        this.ws = w;
        this.cdr.markForCheck();
      },
      error: () => {
        this.ws = null;
        this.cdr.markForCheck();
      }
    });

    // Suscribirse a cambios de ruta
    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('id'))),
        filter((id) => Number.isFinite(id) && id > 0),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.loadError = null;
        this.reload(id, true);
      });
  }

  num(v: string | number) {
    return Number(v);
  }

  reload(id: number, clearView = false) {
    if (clearView) {
      this.inc = null;
      this.loading = true;
      this.cdr.markForCheck();
    }

    this.api.getIncidentDetail(id).subscribe({
      next: (data) => {
        this.loading = false;
        this.inc = data;
        this.aiParsed =
          data.ai_summary_parsed ?? this.api.parseAISummary(data.ai_summary ?? null);
        this.asg = (data.assignment?.status as string) || '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading incident:', err);
        this.loading = false;
        const msg = err.error?.error || 'No puedes acceder a este incidente o no existe';
        this.messages.error(msg);
        this.loadError = msg;
        this.cdr.markForCheck();

        // Navegar después de que el mensaje se haya mostrado
        setTimeout(() => {
          void this.router.navigate(['/taller/incidentes']);
        }, 100);
      },
    });
  }

  openAccept() {
    if (!this.inc) return;
    const ref = this.dialog.open(AcceptIncidentDialog, { data: { incidentId: this.inc.id } });
    ref.afterClosed().subscribe((ok) => {
      if (ok && this.inc) {
        this.reload(this.inc.id, false);
      }
    });
  }

  openReject() {
    if (!this.inc) return;
    const ref = this.dialog.open(RejectIncidentDialog, { data: { id: this.inc.id } });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        void this.router.navigate(['/taller/incidentes']);
      }
    });
  }

  patchStatus() {
    if (!this.inc) return;
    this.api.updateStatus(this.inc.id, this.nextSt as 'in_route' | 'arrived' | 'in_service').subscribe({
      next: () => {
        this.messages.success('Estado actualizado');
        if (this.inc) {
          this.reload(this.inc.id, false);
        }
      },
      error: (err) => {
        this.messages.error(err.error?.error || 'Error al actualizar estado');
      }
    });
  }

  openComplete() {
    if (!this.inc) return;
    const ref = this.dialog.open(CompleteIncidentDialog, { data: { incidentId: this.inc.id } });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        void this.router.navigate(['/taller/incidentes']);
      }
    });
  }
}
