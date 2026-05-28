/** PWA + Web Push (VAPID, sin Firebase). */
const CACHE = 'taller-shell-v2';
const SHELL = ['/', '/index.html', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Emergencias', body: '', data: {} };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const title = payload.title || 'Notificación';
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: String(payload.data?.incident_id || payload.data?.type || 'panel'),
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let path = data.panel_path || '/taller/notificaciones';
  if (data.type === 'workshop_pending_review' || data.event === 'admin_new_incident') {
    path = data.panel_path || (data.incident_id ? `/admin/incidentes/${data.incident_id}` : '/admin/talleres');
  } else if (data.incident_id && !String(path).startsWith('/admin')) {
    path = `/taller/incidentes/${data.incident_id}`;
  } else if (data.workshop_id && data.type === 'workshop_pending_review') {
    path = data.panel_path || '/admin/talleres';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
    }),
  );
});
