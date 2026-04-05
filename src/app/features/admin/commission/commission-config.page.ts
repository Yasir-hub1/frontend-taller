import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { AdminService } from '../services/admin.service';
import { CommissionConfig } from '../../../shared/models/payment.model';
import { MessagesService } from '../../../core/services/messages.service';
import { asPaged } from '../utils/paginated-response.util';

@Component({
  standalone: true,
  selector: 'app-commission-config',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
    MatTableModule,
    DatePipe,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Comisión de plataforma</h1>
      <p class="app-page-sub">Porcentaje aplicado a los pagos de servicios.</p>
    </header>
    @if (current()) {
      <mat-card class="hero app-surface-card">
        <mat-card-content>
          <div class="big">{{ current()!.percentage }}%</div>
          <p class="hero-meta">Vigente desde {{ current()!.effective_from | date : 'mediumDate' }}</p>
          <p class="hero-desc">{{ current()!.description }}</p>
        </mat-card-content>
      </mat-card>
    }
    <mat-card class="mt app-surface-card">
      <mat-card-header><mat-card-title>Nueva configuración</mat-card-title></mat-card-header>
      <mat-card-content>
        <p class="warn">
          La nueva comisión afecta a todos los servicios desde la fecha de vigencia indicada.
        </p>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="app-form-grid-2">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Porcentaje (0.01 – 99.99)</mat-label>
              <input matInput type="number" step="0.01" formControlName="percentage" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Vigencia desde (YYYY-MM-DD)</mat-label>
              <input matInput formControlName="effective_from" />
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
          <div class="form-actions">
            <button mat-flat-button color="primary" type="submit">Guardar</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
    <mat-card class="mt app-surface-card">
      <mat-card-header><mat-card-title>Historial</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="app-table-wrap">
          <table mat-table [dataSource]="hist()" class="full">
          <ng-container matColumnDef="pct">
            <th mat-header-cell *matHeaderCellDef>%</th>
            <td mat-cell *matCellDef="let c">{{ c.percentage }}</td>
          </ng-container>
          <ng-container matColumnDef="from">
            <th mat-header-cell *matHeaderCellDef>Desde</th>
            <td mat-cell *matCellDef="let c">{{ c.effective_from | date : 'mediumDate' }}</td>
          </ng-container>
          <ng-container matColumnDef="act">
            <th mat-header-cell *matHeaderCellDef>Activa</th>
            <td mat-cell *matCellDef="let c">{{ c.is_active ? 'Sí' : 'No' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .hero .big {
      font-size: clamp(2.25rem, 6vw, 2.75rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      background: linear-gradient(120deg, #0d9488, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-meta {
      font-size: 0.875rem;
      color: var(--app-text-muted, #64748b);
      margin: 0.5rem 0 0.25rem;
    }
    .hero-desc {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.45;
    }
    .full {
      width: 100%;
      display: block;
      margin-bottom: 6px;
    }
    .mt {
      margin-top: 1.25rem;
    }
    .warn {
      font-size: 0.875rem;
      line-height: 1.45;
      color: var(--app-warn-text, #9a3412);
      background: var(--app-warn-bg, #fff7ed);
      border: 1px solid rgb(251 146 60 / 22%);
      padding: 0.75rem 1rem;
      border-radius: var(--app-radius-sm, 10px);
      margin: 0 0 1rem;
    }
    .form-actions {
      margin-top: 0.5rem;
    }
  `,
})
export class CommissionConfigPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly current = signal<CommissionConfig | null>(null);
  readonly hist = signal<CommissionConfig[]>([]);
  cols = ['pct', 'from', 'act'];

  form = this.fb.nonNullable.group({
    percentage: [10, [Validators.required, Validators.min(0.01), Validators.max(99.99)]],
    description: ['', Validators.required],
    effective_from: ['', Validators.required],
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.reload();
  }

  reload() {
    this.api.getCurrentCommission().subscribe({
      next: (c) => this.current.set(c),
      error: () => this.current.set(null),
    });
    this.api.getCommissionHistory().subscribe((res) => {
      this.hist.set(asPaged<CommissionConfig>(res).results);
    });
  }

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    this.api
      .setCommission({
        percentage: v.percentage,
        description: v.description,
        effective_from: v.effective_from,
      })
      .subscribe(() => {
        this.messages.success('Comisión guardada correctamente');
        this.reload();
      });
  }
}
