import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

/**
 * SSE con JWT: fetch + ReadableStream (EventSource no envía Authorization).
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly storage = inject(StorageService);

  /**
   * @param abort$ emite una vez para cerrar la lectura del stream
   */
  listenUserStream(abort$: Observable<void>): Observable<string> {
    const out = new Subject<string>();
    const token = this.storage.get('access_token');
    const url = `${environment.apiUrl}/api/web/notifications/stream/`;

    if (!token) {
      out.complete();
      return out.asObservable();
    }

    const ac = new AbortController();
    const sub = abort$.subscribe(() => ac.abort());

    void (async () => {
      try {
        const res = await fetch(url, {
          signal: ac.signal,
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        });
        if (!res.ok || !res.body) {
          out.error(new Error(`SSE ${res.status}`));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const block of parts) {
            for (const line of block.split('\n')) {
              if (line.startsWith('data:')) {
                out.next(line.slice(5).trim());
              }
            }
          }
        }
        out.complete();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          out.error(e);
        } else {
          out.complete();
        }
      } finally {
        sub.unsubscribe();
      }
    })();

    return out.asObservable();
  }
}
