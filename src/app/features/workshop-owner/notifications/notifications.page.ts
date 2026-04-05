import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NotificationsApiService } from '../services/notifications-api.service';
import { AppNotification } from '../../../shared/models/notification.model';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import * as AuthActions from '../../../store/auth/auth.actions';
import { SseService } from '../../../core/services/sse.service';
import { MessagesService } from '../../../core/services/messages.service';

@Component({
  standalone: true,
  selector: 'app-notifications',
  imports: [MatCard, MatCardContent, MatButtonModule, TimeAgoPipe],
  template: `
    <header class="app-page-head head-actions">
      <div>
        <h1 class="app-page-title">Notificaciones</h1>
        <p class="app-page-sub">Alertas y avisos de tu cuenta.</p>
      </div>
      <button mat-stroked-button color="primary" (click)="markAll()">Marcar todas leídas</button>
    </header>
    @for (n of items(); track n.id) {
      <mat-card class="notif-card app-surface-card" [class.unread]="!n.is_read">
        <mat-card-content>
          <div class="notif-top">
            <strong class="notif-title">{{ n.title }}</strong>
            <small class="notif-time">{{ n.created_at | timeAgo }}</small>
          </div>
          <p class="notif-body">{{ n.body }}</p>
          @if (!n.is_read) {
            <button mat-button color="primary" (click)="one(n)">Marcar leída</button>
          }
        </mat-card-content>
      </mat-card>
    }
    @if (items().length === 0) {
      <p class="empty">No hay notificaciones.</p>
    }
  `,
  styles: `
    .head-actions {
      display: flex; flex-wrap: wrap;
      justify-content: space-between; align-items: flex-start; gap: 1rem;
    }
    .notif-card { margin-bottom: 12px; }
    .notif-card.unread { border-left: 4px solid var(--app-accent, #0d9488); }
    .notif-top {
      display: flex; flex-wrap: wrap; justify-content: space-between;
      gap: 8px; align-items: baseline; margin-bottom: 6px;
    }
    .notif-title { font-size: 0.9375rem; }
    .notif-time { color: var(--app-text-muted, #64748b); font-size: 0.75rem; }
    .notif-body { margin: 0 0 8px; font-size: 0.875rem; line-height: 1.45; color: var(--app-text, #0f172a); }
    .empty { color: var(--app-text-muted, #64748b); font-size: 0.9375rem; margin-top: 2rem; text-align: center; }
  `,
})
export class NotificationsPage implements OnInit, OnDestroy {
  private readonly api = inject(NotificationsApiService);
  private readonly store = inject(Store);
  private readonly sse = inject(SseService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();

  readonly items = signal<AppNotification[]>([]);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
    this.sse.listenUserStream(this.destroy$).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load() {
    this.api.list().subscribe((list) => {
      this.items.set(list);
      const unread = list.filter((x) => !x.is_read).length;
      this.store.dispatch(AuthActions.setUnreadNotifications({ count: unread }));
    });
  }

  one(n: AppNotification) {
    this.api.markRead(n.id).subscribe(() => {
      this.messages.info('Notificación marcada como leída');
      this.load();
    });
  }

  markAll() {
    this.api.markAllRead().subscribe(() => {
      this.messages.info('Todas las notificaciones marcadas como leídas');
      this.load();
    });
  }
}
