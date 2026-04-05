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
    <h2 mat-dialog-title>Rechazar incidente</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Motivo</mat-label>
        <input matInput [formControl]="form.controls.reason" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" (click)="save()">Rechazar</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; }`,
})
export class RejectIncidentDialog {
  private readonly ref = inject(MatDialogRef<RejectIncidentDialog, boolean>);
  private readonly data = inject<{ id: number }>(MAT_DIALOG_DATA);
  private readonly api = inject(IncidentWebService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessagesService);

  form = this.fb.nonNullable.group({ reason: ['No podemos atender', Validators.required] });

  save() {
    if (this.messages.showFormValidationWarning(this.form)) return;
    this.api.rejectIncident(this.data.id, this.form.controls.reason.value).subscribe(() => {
      this.messages.success('Incidente rechazado');
      this.ref.close(true);
    });
  }
}
