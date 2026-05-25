import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-offline-banner',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (visible()) {
      <div class="offline-banner" [class.offline-banner--warn]="!network.online()">
        <mat-icon>{{ network.online() ? 'cloud_upload' : 'cloud_offline' }}</mat-icon>
        <div class="offline-banner__text">
          <strong>{{ title() }}</strong>
          <span>{{ subtitle() }}</span>
        </div>
        @if (network.online() && queue.pendingCount() > 0) {
          <button mat-stroked-button type="button" (click)="retrySync()" [disabled]="syncing()">
            {{ syncing() ? 'Sincronizando…' : 'Sincronizar ahora' }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    .offline-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px clamp(12px, 3vw, 24px);
      font-size: 0.875rem;
      line-height: 1.45;
      background: #e0f2fe;
      color: #0c4a6e;
      border-bottom: 1px solid rgb(56 189 248 / 35%);
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .offline-banner--warn {
      background: #fff7ed;
      color: #9a3412;
      border-bottom-color: rgb(251 146 60 / 35%);
    }
    .offline-banner mat-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .offline-banner__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .offline-banner__text span {
      font-size: 0.8125rem;
      opacity: 0.9;
    }
  `,
})
export class OfflineBannerComponent {
  readonly network = inject(NetworkStatusService);
  readonly queue = inject(OfflineQueueService);
  private readonly messages = inject(MessagesService);
  readonly syncing = signal(false);

  visible(): boolean {
    return !this.network.online() || this.queue.pendingCount() > 0;
  }

  title(): string {
    if (!this.network.online()) return 'Sin conexión';
    if (this.queue.pendingCount() > 0) return `${this.queue.pendingCount()} acción(es) pendiente(s)`;
    return '';
  }

  subtitle(): string {
    if (!this.network.online()) {
      return 'Las acciones se guardan en el navegador y se envían al recuperar internet.';
    }
    if (this.queue.pendingCount() > 0) {
      return 'Hay cambios en cola. Pulsa sincronizar o espera la reconexión automática.';
    }
    return '';
  }

  async retrySync(): Promise<void> {
    this.syncing.set(true);
    try {
      const r = await this.queue.flush();
      if (r.synced > 0) {
        this.messages.success(`${r.synced} acción(es) sincronizada(s)`);
      }
      if (r.failed > 0) {
        this.messages.warning(`${r.failed} acción(es) fallaron. Reintenta más tarde.`);
      }
    } finally {
      this.syncing.set(false);
    }
  }
}
