import { Component, inject } from '@angular/core';
import { VoiceReportPanelComponent } from '../../../shared/components/voice-report/voice-report-panel';
import { WorkshopOwnerService } from '../services/workshop-owner.service';

@Component({
  standalone: true,
  selector: 'app-workshop-reports',
  imports: [VoiceReportPanelComponent],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Reportes de tu taller</h1>
      <p class="app-page-sub">
        Pide el reporte hablando o escribiendo. Solo verás datos de tu taller: asignaciones,
        ingresos, técnicos y calificaciones. Puedes previsualizar y exportar a Excel.
      </p>
    </header>

    <app-voice-report-panel
      title="Pedir reporte por voz"
      description='Ejemplos: «listado de todos mis incidentes», «cuántas ofertas tengo pendientes», «servicios completados esta semana», «ingresos del mes».'
      [queryReport]="voiceQuery"
      [exportReport]="voiceExport"
    />
  `,
})
export class WorkshopReportsPage {
  private readonly api = inject(WorkshopOwnerService);

  readonly voiceQuery = (fd: FormData) => this.api.postVoiceQuery(fd);
  readonly voiceExport = (filters: Record<string, string>) => this.api.downloadReportsExcel(filters);
}
