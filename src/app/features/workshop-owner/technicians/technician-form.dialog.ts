import { Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { ServiceCategory } from '../../../shared/models/workshop.model';
import { MessagesService } from '../../../core/services/messages.service';

const CATS: ServiceCategory[] = [
  'battery',
  'tire',
  'towing',
  'engine',
  'accident',
  'locksmith',
  'general',
];

@Component({
  standalone: true,
  host: { class: 'technician-form-dialog-host' },
  imports: [
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo técnico</h2>
    <mat-dialog-content class="dialog-body">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Nombre</mat-label>
        <input matInput [formControl]="form.controls.name" autocomplete="name" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Teléfono</mat-label>
        <input matInput [formControl]="form.controls.phone" type="tel" autocomplete="tel" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Especialidades</mat-label>
        <mat-select [formControl]="form.controls.specialties" multiple placeholder="Elegí una o más">
          @for (c of cats; track c) {
            <mat-option [value]="c">{{ c }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      color: var(--app-text, #0f172a);
    }
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 10rem;
      padding-top: 4px !important;
    }
    .full {
      width: 100%;
    }
  `,
})
export class TechnicianFormDialog {
  private readonly ref = inject(MatDialogRef<TechnicianFormDialog, boolean>);
  private readonly api = inject(WorkshopOwnerService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  readonly cats = CATS;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    specialties: [[] as ServiceCategory[]],
  });

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    this.api
      .createTechnician({
        name: v.name,
        phone: v.phone,
        specialties: v.specialties ?? [],
        is_available: true,
      })
      .subscribe(() => {
        this.messages.success('Técnico registrado');
        this.ref.close(true);
      });
  }
}
