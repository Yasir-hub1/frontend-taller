/**
 * Service Worker para Firebase Cloud Messaging (FCM) en Angular.
 *
 * UBICACIÓN: Este archivo debe estar en /public/ para que Angular lo copie a /dist/.
 *
 * IMPORTANTE: Actualiza firebaseConfig con tus credenciales de Firebase Console.
 */

// Importar scripts de Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase
// Obtener de: Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyBNJzKGl7Qx...", // TODO: Reemplazar con tu API Key
  authDomain: "appemergenciasbeet.firebaseapp.com",
  projectId: "appemergenciasbeet",
  storageBucket: "appemergenciasbeet.firebasestorage.app",
  messagingSenderId: "123456789", // TODO: Reemplazar
  appId: "1:123456789:web:abc123" // TODO: Reemplazar
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de Messaging
const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Nueva emergencia';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva solicitud',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-96x96.png',
    data: payload.data || {},
    tag: payload.data?.incident_id || 'default',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver detalle'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir o enfocar la app
  const urlToOpen = event.notification.data?.incident_id
    ? `/taller/incidentes/${event.notification.data.incident_id}`
    : '/taller/incidentes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Buscar ventana ya abierta
      for (const client of windowClients) {
        if (client.url.includes('/taller') && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE',
            url: urlToOpen
          });
          return;
        }
      }

      // Abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[firebase-messaging-sw.js] Service Worker initialized');
