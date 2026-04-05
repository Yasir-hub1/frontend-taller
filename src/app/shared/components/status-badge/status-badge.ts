import { Component, Input } from '@angular/core';
import { MatChip } from '@angular/material/chips';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [MatChip],
  template: `<mat-chip class="st">{{ status }}</mat-chip>`,
  styles: `
    .st {
      font-size: 12px;
      min-height: 24px;
      background: #e3f2fd !important;
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
}
