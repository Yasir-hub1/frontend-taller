import { Component, Input } from '@angular/core';
import { MatChip } from '@angular/material/chips';

@Component({
  selector: 'app-priority-chip',
  standalone: true,
  imports: [MatChip],
  template: `<mat-chip [class]="cls">{{ label }}</mat-chip>`,
  styles: `
    mat-chip {
      font-size: 12px;
      min-height: 26px;
    }
    .crit {
      background: #b71c1c !important;
      color: #fff;
    }
    .high {
      background: #ef6c00 !important;
      color: #fff;
    }
    .med {
      background: #f9a825 !important;
    }
    .low {
      background: #2e7d32 !important;
      color: #fff;
    }
    .unk {
      background: #757575 !important;
      color: #fff;
    }
  `,
})
export class PriorityChipComponent {
  @Input({ required: true }) label!: string;
  @Input() priorityKey: string | null = null;

  get cls(): string {
    const p = (this.priorityKey ?? this.label ?? '').toLowerCase();
    if (p.includes('crít') || p.includes('crit')) return 'crit';
    if (p.includes('alta') || p.includes('high')) return 'high';
    if (p.includes('media') || p.includes('medium')) return 'med';
    if (p.includes('baja') || p.includes('low')) return 'low';
    return 'unk';
  }
}
