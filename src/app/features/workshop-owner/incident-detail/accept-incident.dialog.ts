import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgFor } from '@angular/common';
import { WorkshopOwnerService } from '../services/workshop-owner.service';
import { IncidentWebService } from '../services/incident-web.service';
import { Technician } from '../../../shared/models/workshop.model';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelectModule,
    MatInput,
    MatButtonModule,
    NgFor,
  ],
  template: `
    <h2 mat-dialog-title>Aceptar incidente</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Técnico disponible</mat-label>
        <mat-select [formControl]="form.controls.technician_id">
          <mat-option *ngFor="let t of techs" [value]="t.id">{{ t.name }}</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>ETA (minutos, opcional)</mat-label>
        <input matInput type="number" [formControl]="form.controls.eta" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Aceptar</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; display:block; margin-bottom:8px;}`,
})
export class AcceptIncidentDialog implements OnInit {
  private readonly ref = inject(MatDialogRef<AcceptIncidentDialog, boolean>);
  private readonly data = inject<{ incidentId: number }>(MAT_DIALOG_DATA);
  private readonly workshop = inject(WorkshopOwnerService);
  private readonly incidents = inject(IncidentWebService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  techs: Technician[] = [];

  form = this.fb.nonNullable.group({
    technician_id: [null as number | null, Validators.required],
    eta: [30 as number | null],
  });

  ngOnInit() {
    this.workshop.getTechnicians().subscribe((t) => {
      this.techs = t.filter((x) => x.is_available);
      if (this.techs.length && this.form.controls.technician_id.value == null) {
        this.form.controls.technician_id.setValue(this.techs[0].id);
      }
    });
  }

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    const tid = this.form.controls.technician_id.value;
    if (tid == null) {
      this.messages.warning('Seleccioná un técnico disponible');
      return;
    }
    const eta = this.form.controls.eta.value;
    this.incidents
      .acceptIncident(this.data.incidentId, {
        technician_id: tid,
        estimated_arrival_minutes: eta ?? undefined,
      })
      .subscribe(() => {
        this.messages.success('Incidente aceptado');
        this.ref.close(true);
      });
  }
}
