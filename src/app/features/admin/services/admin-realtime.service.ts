import { Injectable, inject } from '@angular/core';
import { PanelRealtimeService } from '../../../core/services/panel-realtime.service';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService {
  private readonly panel = inject(PanelRealtimeService);

  readonly userEvent$ = this.panel.userEvent$;

  start(): Promise<void> {
    return this.panel.start();
  }

  stop(): void {
    this.panel.stop();
  }
}
