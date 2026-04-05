import { Component, Input } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatChip } from '@angular/material/chips';
import { AISummary } from '../../models/incident.model';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-ai-summary-card',
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatProgressBar, MatChip, NgFor],
  template: `
    @if (summary) {
      <mat-card class="app-surface-card ai-card">
        <mat-card-header>
          <mat-card-title>Resumen IA</mat-card-title>
        </mat-card-header>
        <mat-card-content class="gap">
          @if (confidence !== null && confidence !== undefined) {
            <div>
              <span class="muted">Confianza</span>
              <mat-progress-bar mode="determinate" [value]="confidence * 100"></mat-progress-bar>
            </div>
          }
          @if (summary.tipo_incidente) {
            <p><strong>Tipo:</strong> {{ summary.tipo_incidente }}</p>
          }
          @if (summary.prioridad) {
            <p><strong>Prioridad:</strong> {{ summary.prioridad }}</p>
          }
          @if (summary.resumen_breve) {
            <p>{{ summary.resumen_breve }}</p>
          }
          @if (summary.servicios_requeridos?.length) {
            <div class="chips">
              <mat-chip *ngFor="let s of summary.servicios_requeridos">{{ s }}</mat-chip>
            </div>
          }
          @if (summary.requiere_grua) {
            <mat-chip color="warn">Requiere grúa</mat-chip>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .ai-card .mat-mdc-card-title {
      font-size: 1rem;
    }
    .gap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .muted {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted, #64748b);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  `,
})
export class AiSummaryCardComponent {
  @Input() summary: AISummary | null = null;
  @Input() confidence: number | null = null;
}
