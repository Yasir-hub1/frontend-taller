import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'distanceKm', standalone: true })
export class DistanceKmPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return `${n.toFixed(1)} km`;
  }
}
