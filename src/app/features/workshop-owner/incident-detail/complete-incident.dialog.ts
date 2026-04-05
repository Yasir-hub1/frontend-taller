import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { IncidentWebService } from '../services/incident-web.service';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Completar servicio</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Costo del servicio</mat-label>
        <input matInput type="number" [formControl]="form.controls.service_cost" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Notas</mat-label>
        <input matInput [formControl]="form.controls.notes" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Cerrar servicio</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; display:block; margin-bottom:8px;}`,
})
export class CompleteIncidentDialog {
  private readonly ref = inject(MatDialogRef<CompleteIncidentDialog, boolean>);
  private readonly data = inject<{ incidentId: number }>(MAT_DIALOG_DATA);
  private readonly api = inject(IncidentWebService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  form = this.fb.nonNullable.group({
    service_cost: [0, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const v = this.form.getRawValue();
    this.api
      .completeService(this.data.incidentId, v.service_cost, v.notes || undefined)
      .subscribe(() => {
        this.messages.success('Servicio completado');
        this.ref.close(true);
      });
  }
}
