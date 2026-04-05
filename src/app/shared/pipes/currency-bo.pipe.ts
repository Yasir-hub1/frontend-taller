import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyBo', standalone: true })
export class CurrencyBoPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return 'Bs. 0,00';
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return (
      'Bs. ' +
      n.toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}
