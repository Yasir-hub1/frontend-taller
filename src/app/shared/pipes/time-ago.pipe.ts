import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '—';
    const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone('local');
    return dt.toRelative() ?? iso;
  }
}
