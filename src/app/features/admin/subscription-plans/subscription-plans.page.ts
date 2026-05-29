import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AdminService } from '../services/admin.service';
import { SubscriptionPlan } from '../../../shared/models/subscription.model';
import { MessagesService } from '../../../core/services/messages.service';
import { asPaged } from '../utils/paginated-response.util';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';

@Component({
  standalone: true,
  selector: 'app-subscription-plans',
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
    MatSelect,
    MatOption,
    MatTableModule,
    MatCheckboxModule,
    CurrencyPipe,
  ],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Planes de suscripción</h1>
      <p class="app-page-sub">Define los planes que los talleres eligen al registrarse. Se sincronizan con Stripe.</p>
    </header>

    <mat-card class="app-surface-card mb">
      <mat-card-header><mat-card-title>Nuevo / editar plan</mat-card-title></mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="2" formControlName="description"></textarea>
          </mat-form-field>
          <div class="app-form-grid-2">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Precio (USD)</mat-label>
              <input matInput type="number" step="0.01" formControlName="price_amount" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Facturación</mat-label>
              <mat-select formControlName="billing_interval">
                <mat-option value="month">Mensual</mat-option>
                <mat-option value="year">Anual</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="checks">
            <mat-checkbox formControlName="is_active">Activo</mat-checkbox>
            <mat-checkbox formControlName="is_public">Visible en registro</mat-checkbox>
          </div>
          <div class="form-actions">
            <button mat-flat-button color="primary" type="submit">Guardar y sincronizar Stripe</button>
            @if (editingId()) {
              <button mat-button type="button" (click)="resetForm()">Cancelar edición</button>
            }
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <mat-card class="app-surface-card">
      <mat-card-header><mat-card-title>Planes existentes</mat-card-title></mat-card-header>
      <mat-card-content>
        @if (plans().length === 0) {
          <p class="empty">Aún no hay planes. Crea uno arriba.</p>
        } @else {
          <table mat-table [dataSource]="plans()" class="full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Plan</th>
              <td mat-cell *matCellDef="let p">
                <strong>{{ p.name }}</strong>
                @if (p.description) {
                  <p class="desc">{{ p.description }}</p>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Precio</th>
              <td mat-cell *matCellDef="let p">
                {{ p.price_amount | currency : 'USD' : 'symbol' : '1.2-2' }} /
                {{ p.billing_interval === 'year' ? 'año' : 'mes' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="flags">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">
                {{ p.is_active ? 'Activo' : 'Inactivo' }} · {{ p.is_public ? 'Público' : 'Oculto' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-button type="button" (click)="edit(p)">Editar</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .mb {
      margin-bottom: 1rem;
    }
    .full {
      width: 100%;
    }
    .checks {
      display: flex;
      gap: 1rem;
      margin: 0.5rem 0 1rem;
    }
    .empty {
      color: var(--app-text-muted, #64748b);
      margin: 0;
    }
    .desc {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
      margin: 4px 0 0;
    }
  `,
})
export class SubscriptionPlansPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminService);
  private readonly messages = inject(MessagesService);
  private readonly cache = inject(OfflineCacheService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly cols = ['name', 'price', 'flags', 'actions'];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price_amount: [29.99, [Validators.required, Validators.min(0.5)]],
    billing_interval: ['month' as 'month' | 'year', Validators.required],
    is_active: [true],
    is_public: [true],
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getSubscriptionPlans().subscribe({
      next: (res) => this.plans.set(asPaged<SubscriptionPlan>(res).results),
      error: () => this.plans.set([]),
    });
  }

  edit(p: SubscriptionPlan) {
    this.editingId.set(p.id);
    this.form.patchValue({
      name: p.name,
      description: p.description,
      price_amount: Number(p.price_amount),
      billing_interval: p.billing_interval,
      is_active: p.is_active ?? true,
      is_public: p.is_public ?? true,
    });
  }

  resetForm() {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      description: '',
      price_amount: 29.99,
      billing_interval: 'month',
      is_active: true,
      is_public: true,
    });
  }

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const body = this.form.getRawValue();
    const id = this.editingId();
    const req = id
      ? this.api.updateSubscriptionPlan(id, body)
      : this.api.createSubscriptionPlan(body);
    req.subscribe({
      next: () => {
        this.messages.success('Plan guardado y sincronizado con Stripe');
        this.cache.remove('admin:sub-plans');
        this.resetForm();
        this.load();
      },
    });
  }
}
