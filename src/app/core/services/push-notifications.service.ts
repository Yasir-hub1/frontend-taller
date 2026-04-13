import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Servicio para gestionar notificaciones push web usando Firebase Cloud Messaging.
 *
 * IMPORTANTE: Para que funcione, necesitas:
 * 1. Instalar Firebase: npm install firebase
 * 2. Crear firebase-messaging-sw.js en src/ (service worker)
 * 3. Configurar Firebase en el proyecto
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly http = inject(HttpClient);
  private firebaseMessaging: any = null;
  private initialized = false;

  /**
   * Inicializar Firebase Messaging y solicitar permisos.
   *
   * @returns Token FCM o null si falla
   */
  async initialize(): Promise<string | null> {
    if (this.initialized) {
      console.warn('[PushNotifications] Already initialized');
      return null;
    }

    // Verificar soporte de Service Worker
    if (!('serviceWorker' in navigator)) {
      console.warn('[PushNotifications] Service Worker not supported in this browser');
      return null;
    }

    // Verificar soporte de Notification API
    if (!('Notification' in window)) {
      console.warn('[PushNotifications] Notification API not supported');
      return null;
    }

    try {
      // Importar Firebase dinámicamente
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      // Configuración de Firebase (obtener de Firebase Console)
      const firebaseConfig = {
        apiKey: "AIzaSyBNJzKGl7Qx...", // TODO: Reemplazar con tu API Key
        authDomain: "appemergenciasbeet.firebaseapp.com",
        projectId: "appemergenciasbeet",
        storageBucket: "appemergenciasbeet.firebasestorage.app",
        messagingSenderId: "123456789", // TODO: Reemplazar
        appId: "1:123456789:web:abc123" // TODO: Reemplazar
      };

      const app = initializeApp(firebaseConfig);
      this.firebaseMessaging = getMessaging(app);

      // Solicitar permisos de notificación
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('[PushNotifications] Permission denied');
        return null;
      }

      // Obtener token FCM
      // VAPID Key: obtener de Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
      const token = await getToken(this.firebaseMessaging, {
        vapidKey: 'YOUR_VAPID_KEY_HERE' // TODO: Reemplazar con tu VAPID Key
      });

      if (token) {
        console.log('[PushNotifications] FCM Token obtained:', token.substring(0, 20) + '...');

        // Registrar token en backend
        await this.registerTokenOnBackend(token);

        // Escuchar mensajes cuando la app está en foreground
        onMessage(this.firebaseMessaging, (payload) => {
          console.log('[PushNotifications] Message received (foreground):', payload);
          this.handleForegroundMessage(payload);
        });

        this.initialized = true;
        return token;
      }

      return null;
    } catch (error) {
      console.error('[PushNotifications] Error initializing:', error);
      return null;
    }
  }

  /**
   * Registrar token FCM en el backend.
   */
  private async registerTokenOnBackend(token: string): Promise<void> {
    try {
      await this.http.post(`${environment.apiUrl}/api/web/auth/fcm-token/`, {
        fcm_token: token
      }).toPromise();
      console.log('[PushNotifications] Token registered on backend');
    } catch (error) {
      console.error('[PushNotifications] Error registering token:', error);
    }
  }

  /**
   * Manejar mensajes recibidos cuando la app está en foreground.
   */
  private handleForegroundMessage(payload: any): void {
    const notificationTitle = payload.notification?.title || 'Nueva notificación';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      data: payload.data || {},
      requireInteraction: true,
      tag: payload.data?.incident_id || 'default'
    };

    // Mostrar notificación nativa del navegador
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(notificationTitle, notificationOptions);
      });
    } else {
      new Notification(notificationTitle, notificationOptions);
    }
  }

  /**
   * Obtener token FCM actual (si ya fue inicializado).
   */
  async getCurrentToken(): Promise<string | null> {
    if (!this.firebaseMessaging) {
      return null;
    }

    try {
      const { getToken } = await import('firebase/messaging');
      return await getToken(this.firebaseMessaging);
    } catch (error) {
      console.error('[PushNotifications] Error getting token:', error);
      return null;
    }
  }

  /**
   * Cancelar token FCM (logout).
   */
  async deleteToken(): Promise<void> {
    if (!this.firebaseMessaging) {
      return;
    }

    try {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(this.firebaseMessaging);
      this.initialized = false;
      console.log('[PushNotifications] Token deleted');
    } catch (error) {
      console.error('[PushNotifications] Error deleting token:', error);
    }
  }
}
