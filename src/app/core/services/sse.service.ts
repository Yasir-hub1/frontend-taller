import { Injectable, inject } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * SSE con JWT: fetch + ReadableStream (EventSource no envía Authorization).
 * Reconexión automática para notificaciones con pestaña activa o en segundo plano.
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly storage = inject(StorageService);

  listenUserStream(abort$: Observable<void>): Observable<string> {
    const out = new Subject<string>();
    const token = this.storage.get('access_token');
    const url = `${environment.apiUrl}/api/web/notifications/stream/`;

    if (!token) {
      out.complete();
      return out.asObservable();
    }

    let stopped = false;
    let reconnectAttempt = 0;
    let activeAbort: AbortController | null = null;
    const subs = new Subscription();

    subs.add(
      abort$.subscribe(() => {
        stopped = true;
        activeAbort?.abort();
        subs.unsubscribe();
        out.complete();
      }),
    );

    const scheduleReconnect = () => {
      if (stopped) return;
      reconnectAttempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 5), MAX_RECONNECT_DELAY_MS);
      subs.add(timer(delay).subscribe(() => connect()));
    };

    const connect = () => {
      if (stopped) return;
      activeAbort = new AbortController();

      void (async () => {
        try {
          const res = await fetch(url, {
            signal: activeAbort!.signal,
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          });
          if (!res.ok || !res.body) {
            throw new Error(`SSE ${res.status}`);
          }
          reconnectAttempt = 0;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            if (stopped) break;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';
            for (const block of parts) {
              for (const line of block.split('\n')) {
                if (line.startsWith('data:')) {
                  out.next(line.slice(5).trimStart());
                }
              }
            }
          }
          if (!stopped) scheduleReconnect();
        } catch (e) {
          if (stopped || (e as Error).name === 'AbortError') return;
          scheduleReconnect();
        }
      })();
    };

    connect();
    return out.asObservable();
  }
}
