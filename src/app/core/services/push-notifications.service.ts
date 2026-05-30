import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

/** Convierte clave VAPID base64url a Uint8Array para PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export interface WebPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly api = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private initialized = false;
  private subscriptionEndpoint: string | null = null;
  private deniedLogged = false;

  /** true si el navegador puede usar notificaciones (aunque el permiso aún no esté concedido). */
  isSupported(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /** Estado actual del permiso del navegador. */
  permissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Web Push (VAPID). Solo se activa si el permiso ya es "granted".
   * No pide permiso al cargar la app (evita bloqueos y ruido en consola).
   */
  async initialize(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (this.initialized) return true;
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      return false;
    }

    return this.subscribeAndRegister();
  }

  /**
   * Pide permiso al usuario (debe llamarse desde un clic) y registra Web Push.
   */
  async requestPermissionAndInitialize(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (!this.isSupported()) return false;
    if (this.initialized) return true;

    if (Notification.permission === 'denied') {
      return false;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    return this.subscribeAndRegister();
  }

  private async subscribeAndRegister(): Promise<boolean> {
    try {
      let publicKey = environment.webPushPublicKey?.trim() || '';
      if (!publicKey) {
        const res = await firstValueFrom(
          this.api.get<{ public_key: string }>('/api/web/notifications/web-push/vapid-public-key/'),
        );
        publicKey = res.public_key;
      }

      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const keys = json.keys;
      if (!json.endpoint || !keys?.['p256dh'] || !keys?.['auth']) {
        throw new Error('Suscripción push incompleta');
      }

      await firstValueFrom(
        this.api.post('/api/web/notifications/web-push/subscribe/', {
          endpoint: json.endpoint,
          keys: { p256dh: keys['p256dh'], auth: keys['auth'] },
        }),
      );

      this.subscriptionEndpoint = json.endpoint;
      this.initialized = true;

      navigator.serviceWorker.addEventListener('message', (ev: MessageEvent) => {
        if (ev.data?.type === 'web_push' && Notification.permission === 'granted') {
          const p = ev.data.payload as WebPushPayload;
          this.showLocalNotification(p);
        }
      });

      return true;
    } catch (error) {
      if (!this.deniedLogged) {
        this.deniedLogged = true;
        console.warn('[WebPush] No se pudo activar:', error);
      }
      return false;
    }
  }

  /** Notificación cuando la pestaña está activa (SSE complementario). */
  showLocalNotification(payload: WebPushPayload): void {
    if (!isPlatformBrowser(this.platformId) || Notification.permission !== 'granted') return;
    const title = payload.title || 'Notificación';
    const options: NotificationOptions = {
      body: payload.body || '',
      icon: '/favicon.ico',
      data: payload.data,
      tag: String(payload.data?.['incident_id'] ?? payload.data?.['type'] ?? 'panel'),
    };
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, options));
    } else {
      new Notification(title, options);
    }
  }

  async deleteToken(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (this.subscriptionEndpoint) {
        await firstValueFrom(
          this.api.post('/api/web/notifications/web-push/unsubscribe/', {
            endpoint: this.subscriptionEndpoint,
          }),
        );
      } else {
        await firstValueFrom(this.api.post('/api/web/notifications/web-push/unsubscribe/', {}));
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch {
      /* ignore */
    }
    this.initialized = false;
    this.subscriptionEndpoint = null;
  }
}
