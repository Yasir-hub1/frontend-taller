import { Component, input, output, signal, OnDestroy } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { VoiceQueryResponse, WorkshopReportsPayload } from '../../models/voice-report.model';
import { CurrencyBoPipe } from '../../pipes/currency-bo.pipe';
import { DatePipe } from '@angular/common';

/** Web Speech API (Chrome/Edge/Safari). */
interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

@Component({
  standalone: true,
  selector: 'app-voice-report-panel',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinner,
    MatTableModule,
    CurrencyBoPipe,
    DatePipe,
  ],
  template: `
    <mat-card class="app-surface-card voice-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon class="title-icon">mic</mat-icon>
          {{ title() }}
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="voice-desc">{{ description() }}</p>

        <div class="voice-actions">
          @if (!recording()) {
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="startRecording()"
              [disabled]="loading() || !micSupported()"
            >
              <mat-icon>mic</mat-icon>
              Hablar y pedir reporte
            </button>
          } @else {
            <button mat-flat-button color="warn" type="button" (click)="stopRecording()">
              <mat-icon>stop</mat-icon>
              Detener y buscar
            </button>
            <span class="rec-indicator">● Escuchando…</span>
          }
          @if (loading()) {
            <mat-spinner diameter="22" />
          }
        </div>

        @if (recording() && liveTranscript()) {
          <p class="live-text"><strong>Escucho:</strong> {{ liveTranscript() }}</p>
        }

        @if (!micSupported()) {
          <p class="voice-hint">Tu navegador no soporta micrófono. Escribe tu pedido abajo.</p>
        }

        <div class="text-fallback">
          <input
            class="text-input"
            type="text"
            placeholder='Ej: "incidentes completados en marzo" o "ingresos de esta semana"'
            [value]="textQuery()"
            (input)="textQuery.set($any($event.target).value)"
            (keyup.enter)="submitText()"
          />
          <button mat-stroked-button type="button" (click)="submitText()" [disabled]="loading()">
            Buscar
          </button>
        </div>

        @if (error()) {
          <p class="voice-error">{{ error() }}</p>
        }

        @if (result()) {
          @let r = result()!;
          <div class="result-block">
            <p class="intent">
              <strong>Entendí:</strong> {{ r.intent_summary }}
            </p>
            <p class="transcript">
              <strong>Dijiste:</strong> «{{ r.transcript }}»
            </p>
            <p class="period">
              @if (r.audience === 'workshop_owner' && r.filters.report_focus === 'general' && r.filters.dates_source === 'default_month') {
                Alcance: todos los incidentes/asignaciones en todos los estados (sin filtro de fecha).
              } @else {
                Período: {{ r.filters.date_from }} — {{ r.filters.date_to }}
                @if (r.filters.dates_source === 'default_month') {
                  <span class="muted"> (mes actual — no mencionaste fechas)</span>
                }
              }
            </p>

            @if (r.audience === 'admin') {
              @let rep = $any(r.report);
              @if (r.filters.report_focus === 'new_workshops' && rep.tables?.new_workshops?.length) {
                <p class="focus-label">Talleres registrados en el período</p>
                <div class="kpi-grid">
                  <div class="kpi"><span>Altas</span><strong>{{ rep.tables.new_workshops.length }}</strong></div>
                  <div class="kpi"><span>Verificados</span><strong>{{ countVerified(rep.tables.new_workshops) }}</strong></div>
                </div>
                <div class="app-table-wrap table-scroll">
                  <table mat-table [dataSource]="rep.tables.new_workshops.slice(0, 8)" class="full">
                    <ng-container matColumnDef="id">
                      <th mat-header-cell *matHeaderCellDef>#</th>
                      <td mat-cell *matCellDef="let row">{{ row.id }}</td>
                    </ng-container>
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Taller</th>
                      <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="v">
                      <th mat-header-cell *matHeaderCellDef>Verificado</th>
                      <td mat-cell *matCellDef="let row">{{ row.is_verified ? 'Sí' : 'No' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="wsCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: wsCols"></tr>
                  </table>
                </div>
              } @else {
                <div class="kpi-grid">
                  @if (showAdminKpi(r, 'incidents')) {
                    <div class="kpi"><span>Incidentes</span><strong>{{ rep.kpis.incidents_total }}</strong></div>
                    <div class="kpi"><span>Completados</span><strong>{{ rep.kpis.incidents_completed }}</strong></div>
                  }
                  @if (showAdminKpi(r, 'payments')) {
                    <div class="kpi"><span>Ingresos</span><strong>{{ rep.kpis.revenue_total | currencyBo }}</strong></div>
                    <div class="kpi"><span>Pagos</span><strong>{{ rep.kpis.payments_settled_count }}</strong></div>
                  }
                  @if (r.filters.report_focus === 'general' || !r.filters.report_focus) {
                    <div class="kpi"><span>Resolución</span><strong>{{ rep.kpis.resolution_rate_pct }}%</strong></div>
                    <div class="kpi"><span>Talleres nuevos</span><strong>{{ rep.kpis.new_workshops_in_period }}</strong></div>
                  }
                </div>
                <div class="app-table-wrap table-scroll">
                  <table mat-table [dataSource]="rep.tables.recent_incidents.slice(0, 8)" class="full">
                    <ng-container matColumnDef="id">
                      <th mat-header-cell *matHeaderCellDef>#</th>
                      <td mat-cell *matCellDef="let row">{{ row.id }}</td>
                    </ng-container>
                    <ng-container matColumnDef="st">
                      <th mat-header-cell *matHeaderCellDef>Estado</th>
                      <td mat-cell *matCellDef="let row">{{ row.status }}</td>
                    </ng-container>
                    <ng-container matColumnDef="cl">
                      <th mat-header-cell *matHeaderCellDef>Cliente</th>
                      <td mat-cell *matCellDef="let row">{{ row.client_name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="crt">
                      <th mat-header-cell *matHeaderCellDef>Creado</th>
                      <td mat-cell *matCellDef="let row">{{ row.created_at | date : 'short' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="adminPreviewCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: adminPreviewCols"></tr>
                  </table>
                </div>
              }
            } @else {
              @let rep = workshopReport(r);
              <div class="narrative-box">
                <strong>Resumen:</strong>
                {{ r.narrative_summary || rep.summary?.narrative || r.intent_summary }}
              </div>

              <p class="focus-label">Desglose por estado de asignación</p>
              <div class="status-grid">
                @for (s of rep.charts.assignments_by_status; track s.status) {
                  <div class="status-chip" [class.empty]="s.count === 0">
                    <span>{{ s.status_label || s.status }}</span>
                    <strong>{{ s.count }}</strong>
                  </div>
                }
              </div>

              @if (rep.charts.incidents_by_type.length) {
                <p class="focus-label">Por tipo de incidente</p>
                <div class="type-grid">
                  @for (t of rep.charts.incidents_by_type; track t.incident_type) {
                    <div class="type-chip">
                      <span>{{ t.type_label || t.incident_type }}</span>
                      <strong>{{ t.count }}</strong>
                    </div>
                  }
                </div>
              }

              <div class="kpi-grid">
                <div class="kpi"><span>Total listado</span><strong>{{ rep.kpis.assignments_total }}</strong></div>
                <div class="kpi"><span>Ofertas pend.</span><strong>{{ rep.kpis.offered_pending }}</strong></div>
                @if (showWorkshopKpi(r, 'active')) {
                  <div class="kpi"><span>En servicio</span><strong>{{ rep.kpis.active_services }}</strong></div>
                }
                @if (showWorkshopKpi(r, 'completed')) {
                  <div class="kpi"><span>Completados</span><strong>{{ rep.kpis.completed_in_period }}</strong></div>
                }
                <div class="kpi"><span>Rechazados</span><strong>{{ rep.kpis.rejected_in_period }}</strong></div>
                @if (showWorkshopKpi(r, 'payments')) {
                  <div class="kpi"><span>Neto Bs.</span><strong>{{ rep.kpis.earnings_net_period | currencyBo }}</strong></div>
                  <div class="kpi"><span>Pagos</span><strong>{{ rep.kpis.payments_count }}</strong></div>
                }
                @if (showWorkshopKpi(r, 'technicians')) {
                  <div class="kpi"><span>Técnicos disp.</span><strong>{{ rep.kpis.technicians_available }}</strong></div>
                }
              </div>

              <p class="focus-label">
                Listado completo de incidentes/asignaciones
                ({{ rep.tables.recent_assignments.length }} registro(s))
              </p>
              <div class="app-table-wrap table-scroll table-tall">
                <table mat-table [dataSource]="rep.tables.recent_assignments" class="full">
                  <ng-container matColumnDef="inc">
                    <th mat-header-cell *matHeaderCellDef>Inc.</th>
                    <td mat-cell *matCellDef="let row">{{ row.incident_id }}</td>
                  </ng-container>
                  <ng-container matColumnDef="ast">
                    <th mat-header-cell *matHeaderCellDef>Estado asignación</th>
                    <td mat-cell *matCellDef="let row">{{ row.status_label || row.status }}</td>
                  </ng-container>
                  <ng-container matColumnDef="ist">
                    <th mat-header-cell *matHeaderCellDef>Estado incidente</th>
                    <td mat-cell *matCellDef="let row">{{ row.incident_status_label || row.incident_status }}</td>
                  </ng-container>
                  <ng-container matColumnDef="typ">
                    <th mat-header-cell *matHeaderCellDef>Tipo</th>
                    <td mat-cell *matCellDef="let row">{{ row.incident_type_label || row.incident_type }}</td>
                  </ng-container>
                  <ng-container matColumnDef="cl">
                    <th mat-header-cell *matHeaderCellDef>Cliente</th>
                    <td mat-cell *matCellDef="let row">{{ row.client_name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="veh">
                    <th mat-header-cell *matHeaderCellDef>Vehículo</th>
                    <td mat-cell *matCellDef="let row">{{ row.vehicle_label }}</td>
                  </ng-container>
                  <ng-container matColumnDef="tec">
                    <th mat-header-cell *matHeaderCellDef>Técnico</th>
                    <td mat-cell *matCellDef="let row">{{ row.technician_name || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="off">
                    <th mat-header-cell *matHeaderCellDef>Oferta</th>
                    <td mat-cell *matCellDef="let row">{{ row.offered_at | date : 'short' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="cmp">
                    <th mat-header-cell *matHeaderCellDef>Completado</th>
                    <td mat-cell *matCellDef="let row">{{ row.completed_at | date : 'short' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="workshopPreviewCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: workshopPreviewCols"></tr>
                </table>
              </div>
            }

            <div class="export-row">
              <button mat-flat-button color="primary" type="button" (click)="exportExcel()" [disabled]="exporting()">
                @if (exporting()) {
                  <mat-spinner diameter="20" />
                } @else {
                  <mat-icon>download</mat-icon>
                }
                Exportar Excel
              </button>
              @if (r.audience === 'admin') {
                <button mat-button type="button" (click)="applyToFullView.emit(r)">
                  Ver en vista completa
                </button>
              }
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .voice-card { margin-bottom: 1.25rem; }
    .title-icon { vertical-align: middle; margin-right: 6px; color: var(--app-accent, #0d9488); }
    .voice-desc { margin: 0 0 12px; color: var(--app-text-muted, #64748b); font-size: 0.9rem; }
    .voice-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
    .voice-actions button mat-icon { margin-right: 4px; vertical-align: middle; }
    .rec-indicator { color: #dc2626; font-weight: 600; font-size: 0.875rem; }
    .live-text { font-size: 0.9rem; color: var(--app-accent, #0d9488); margin: 0 0 10px; font-style: italic; }
    .text-fallback { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .text-input {
      flex: 1; min-width: 220px; padding: 10px 12px;
      border: 1px solid var(--app-border, #e2e8f0); border-radius: 8px; font-size: 0.9rem;
    }
    .voice-hint, .voice-error { font-size: 0.875rem; margin: 6px 0; }
    .voice-error { color: #b91c1c; }
    .result-block { margin-top: 16px; border-top: 1px solid var(--app-border, #e2e8f0); padding-top: 12px; }
    .intent, .transcript, .period, .focus-label { font-size: 0.875rem; margin: 6px 0; color: var(--app-text-muted, #64748b); }
    .narrative-box {
      margin: 12px 0; padding: 12px 14px; border-radius: 10px;
      background: #ecfdf5; border: 1px solid #a7f3d0; font-size: 0.92rem; line-height: 1.5;
      color: #065f46;
    }
    .status-grid, .type-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px; margin: 8px 0 14px;
    }
    .status-chip, .type-chip {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 10px; border-radius: 8px; font-size: 0.78rem;
      background: var(--app-surface-muted, #f8fafc); border: 1px solid var(--app-border, #e2e8f0);
    }
    .status-chip.empty { opacity: 0.55; }
    .status-chip strong, .type-chip strong { font-size: 1rem; margin-left: 8px; }
    .table-tall { max-height: 420px; overflow: auto; }
    .muted { font-size: 0.8rem; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px; margin: 12px 0;
    }
    .kpi { padding: 10px; background: var(--app-surface-muted, #f8fafc); border-radius: 8px; font-size: 0.8rem; }
    .kpi strong { display: block; font-size: 1.1rem; margin-top: 4px; }
    .table-scroll { overflow-x: auto; margin: 8px 0; }
    .full { width: 100%; }
    .export-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .export-row button mat-icon { margin-right: 4px; vertical-align: middle; }
  `,
})
export class VoiceReportPanelComponent implements OnDestroy {
  readonly title = input('Pedir reporte por voz');
  readonly description = input(
    'Habla claro 2–5 segundos: menciona qué quieres (completados, ingresos, talleres nuevos…) y el período (esta semana, marzo, últimos 15 días).',
  );
  readonly queryReport = input.required<(formData: FormData) => Observable<VoiceQueryResponse>>();
  readonly exportReport = input.required<(filters: Record<string, string>) => Observable<Blob>>();

  readonly applyToFullView = output<VoiceQueryResponse>();

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<VoiceQueryResponse | null>(null);
  readonly recording = signal(false);
  readonly liveTranscript = signal('');
  readonly textQuery = signal('');
  readonly micSupported = signal(
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  );

  adminPreviewCols = ['id', 'st', 'cl', 'crt'];
  workshopPreviewCols = ['inc', 'ast', 'ist', 'typ', 'cl', 'veh', 'tec', 'off', 'cmp'];
  wsCols = ['id', 'name', 'v'];

  private mediaRecorder: MediaRecorder | null = null;
  private speechRecognition: BrowserSpeechRecognition | null = null;
  private chunks: Blob[] = [];
  private speechFinal = '';
  private recordStartedAt = 0;

  ngOnDestroy(): void {
    this.stopMediaTracks();
    this.speechRecognition?.abort();
  }

  startRecording(): void {
    this.error.set(null);
    this.liveTranscript.set('');
    this.speechFinal = '';
    this.recordStartedAt = Date.now();

    this.startBrowserSpeech();

    void navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        this.chunks = [];
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => this.onRecordStop(mime);
        this.mediaRecorder.start(250);
        this.recording.set(true);
      })
      .catch(() => this.error.set('No se pudo acceder al micrófono. Revisa permisos del navegador.'));
  }

  stopRecording(): void {
    const elapsed = Date.now() - this.recordStartedAt;
    if (elapsed < 1200) {
      this.error.set('Habla un poco más (al menos 2 segundos) antes de detener.');
      return;
    }
    this.speechRecognition?.stop();
    if (this.mediaRecorder && this.recording()) {
      this.mediaRecorder.stop();
      this.recording.set(false);
    }
  }

  submitText(): void {
    const text = this.textQuery().trim();
    if (!text) return;
    const fd = new FormData();
    fd.append('text', text);
    this.runQuery(fd);
  }

  exportExcel(): void {
    const r = this.result();
    if (!r) return;
    this.exporting.set(true);
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.filters)) {
      if (v) params[k] = String(v);
    }
    this.exportReport()(params)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => this.downloadBlob(blob, r),
        error: () => this.error.set('No se pudo exportar el Excel.'),
      });
  }

  countVerified(rows: Array<{ is_verified?: boolean }>): number {
    return rows.filter((x) => x.is_verified).length;
  }

  showAdminKpi(r: VoiceQueryResponse, kind: string): boolean {
    const f = r.filters.report_focus || 'general';
    if (f === 'general') return true;
    if (kind === 'incidents') return ['completed', 'active', 'cancelled', 'general'].includes(f);
    if (kind === 'payments') return f === 'payments';
    return false;
  }

  showWorkshopKpi(r: VoiceQueryResponse, kind: string): boolean {
    const f = r.filters.report_focus || 'general';
    if (f === 'general') return true;
    if (kind === 'offered') return f === 'offered' || f === 'general';
    return f === kind || (kind === 'completed' && f === 'completed');
  }

  workshopReport(r: VoiceQueryResponse): WorkshopReportsPayload {
    return r.report as WorkshopReportsPayload;
  }

  private startBrowserSpeech(): void {
    const w = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    try {
      this.speechRecognition = new SR();
      this.speechRecognition.lang = 'es-BO';
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.maxAlternatives = 1;
      this.speechRecognition.onresult = (ev) => {
        let interim = '';
        for (let i = 0; i < ev.results.length; i++) {
          const part = ev.results[i][0]?.transcript ?? '';
          if (ev.results[i].isFinal) {
            this.speechFinal += part + ' ';
          } else {
            interim += part;
          }
        }
        this.liveTranscript.set((this.speechFinal + interim).trim());
      };
      this.speechRecognition.onerror = () => undefined;
      this.speechRecognition.start();
    } catch {
      this.speechRecognition = null;
    }
  }

  private onRecordStop(mime: string): void {
    this.stopMediaTracks();
    const spoken = (this.speechFinal || this.liveTranscript()).trim();
    if (spoken.length >= 10) {
      const fd = new FormData();
      fd.append('text', spoken);
      this.runQuery(fd);
      return;
    }
    const blob = new Blob(this.chunks, { type: mime });
    if (blob.size < 1500) {
      this.error.set(
        'No se captó tu voz. Habla más claro, 2–5 segundos, o escribe el pedido en el campo de texto.',
      );
      return;
    }
    const fd = new FormData();
    fd.append('audio', blob, 'reporte.webm');
    this.runQuery(fd);
  }

  private runQuery(formData: FormData): void {
    this.loading.set(true);
    this.error.set(null);
    this.queryReport()(formData)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.textQuery.set(res.transcript);
        },
        error: (err: { error?: { error?: string } }) =>
          this.error.set(err?.error?.error ?? 'No se pudo procesar tu solicitud.'),
      });
  }

  private downloadBlob(blob: Blob, r: VoiceQueryResponse): void {
    if (blob.size < 64 && blob.type.includes('json')) {
      blob.text().then((t) => {
        try {
          const j = JSON.parse(t) as { error?: string };
          this.error.set(j.error ?? 'Error al exportar');
        } catch {
          this.error.set('Error al exportar');
        }
      });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const meta = r.report.meta as { date_from?: string; date_to?: string; workshop_name?: string };
    const name = meta.workshop_name
      ? `reporte_${meta.workshop_name}_${meta.date_from}_${meta.date_to}.xlsx`
      : `reporte_${meta.date_from}_${meta.date_to}.xlsx`;
    a.href = url;
    a.download = name.replace(/[^\w.\-]+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }

  private stopMediaTracks(): void {
    this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
    this.mediaRecorder = null;
  }
}
