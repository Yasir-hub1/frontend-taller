import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { IncidentWebService } from '../services/incident-web.service';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-send-quote-dialog',
  imports: [MatDialogModule, MatFormField, MatLabel, MatInput, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Cotización al cliente</h2>
    <mat-dialog-content>
      <p class="hint">El cliente verá el monto y el tiempo estimado de reparación en la app.</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Monto (Bs.)</mat-label>
        <input matInput type="number" step="0.01" [(ngModel)]="amount" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Tiempo de reparación (minutos)</mat-label>
        <input matInput type="number" [(ngModel)]="repairMinutes" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Descripción del daño</mat-label>
        <textarea matInput rows="3" [(ngModel)]="damageDescription"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="saving">
        Enviar cotización
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; display: block; }
    .hint { font-size: 0.875rem; color: var(--app-text-muted, #64748b); margin: 0 0 12px; }
  `,
})
export class SendQuoteDialog {
  private readonly ref = inject(MatDialogRef<SendQuoteDialog>);
  private readonly api = inject(IncidentWebService);
  private readonly messages = inject(MessagesService);
  readonly data = inject<{ incidentId: number }>(MAT_DIALOG_DATA);

  amount = 0;
  repairMinutes = 60;
  damageDescription = '';
  saving = false;

  submit() {
    if (this.amount <= 0 || this.repairMinutes < 1) {
      this.messages.error('Indica monto y tiempo de reparación válidos');
      return;
    }
    this.saving = true;
    this.api
      .sendQuote(this.data.incidentId, {
        amount: this.amount,
        estimated_repair_minutes: this.repairMinutes,
        damage_description: this.damageDescription,
      })
      .subscribe({
        next: (res) => {
          this.messages.mutationSuccess(res, 'Cotización enviada al cliente');
          this.ref.close(true);
        },
        error: (err) => {
          this.messages.error(err.error?.error || 'No se pudo enviar la cotización');
          this.saving = false;
        },
      });
  }
}
