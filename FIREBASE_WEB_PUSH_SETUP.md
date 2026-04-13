# 🔔 Configuración de Push Notifications Web para Frontend Taller

## 📋 Requisitos Previos

1. Tener un proyecto en Firebase Console: https://console.firebase.google.com
2. Proyecto Angular con routing configurado
3. Backend Django con endpoints de FCM token

---

## 🚀 Instalación

### 1. Instalar Firebase SDK

```bash
npm install firebase
```

### 2. Obtener Credenciales de Firebase

Ve a Firebase Console → **Tu Proyecto** → **⚙️ Project Settings**

#### a) General Tab
Copia la configuración de tu Web App:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxx...",
  authDomain: "appemergenciasbeet.firebaseapp.com",
  projectId: "appemergenciasbeet",
  storageBucket: "appemergenciasbeet.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

#### b) Cloud Messaging Tab
1. Scroll hasta **Web Push certificates**
2. Si no existe, clic en **Generate key pair**
3. Copia el **VAPID Key** (empieza con `B...`)

Ejemplo:
```
BLxyz123...ABC456
```

---

## ⚙️ Configuración

### 3. Actualizar `push-notifications.service.ts`

Abre: `src/app/core/services/push-notifications.service.ts`

Reemplaza estos valores:

```typescript
// Línea ~50
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "appemergenciasbeet.firebaseapp.com",
  projectId: "appemergenciasbeet",
  storageBucket: "appemergenciasbeet.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Línea ~70
const token = await getToken(this.firebaseMessaging, {
  vapidKey: 'TU_VAPID_KEY_AQUI' // Comienza con B...
});
```

### 4. Actualizar `firebase-messaging-sw.js`

Abre: `public/firebase-messaging-sw.js`

Reemplaza la configuración:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "appemergenciasbeet.firebaseapp.com",
  projectId: "appemergenciasbeet",
  storageBucket: "appemergenciasbeet.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 5. Configurar `angular.json`

Añade el service worker a los assets:

```json
{
  "projects": {
    "frontend_taller": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              "src/favicon.ico",
              "src/assets",
              {
                "glob": "firebase-messaging-sw.js",
                "input": "public",
                "output": "/"
              }
            ]
          }
        }
      }
    }
  }
}
```

---

## 🧪 Pruebas

### 6. Verificar Instalación

```bash
# Compilar proyecto
ng build

# Verificar que el service worker se copió
ls dist/frontend_taller/browser/firebase-messaging-sw.js
```

### 7. Ejecutar en desarrollo

```bash
ng serve
```

**IMPORTANTE:** Las notificaciones push web **NO funcionan en `ng serve` normal**.

Debes usar un servidor HTTPS o localhost. Opciones:

#### Opción A: Servidor local con HTTPS

```bash
# Instalar http-server
npm install -g http-server

# Compilar
ng build

# Servir con SSL
http-server -p 4200 -S -C cert.pem -K key.pem dist/frontend_taller/browser
```

#### Opción B: Usar ngrok (más fácil)

```bash
# Terminal 1: Compilar y servir
ng build --watch
cd dist/frontend_taller/browser
python3 -m http.server 8080

# Terminal 2: Exponer con HTTPS
npx ngrok http 8080
```

Usa la URL HTTPS que te da ngrok (ej: `https://abc123.ngrok.io`)

### 8. Probar Flujo Completo

1. **Login en el panel taller**: https://localhost:4200/auth/login
2. **Permitir notificaciones** cuando el navegador lo solicite
3. **Verificar token registrado**:
   ```
   GET http://localhost:8080/api/admin-api/users/push-tokens/
   ```
   Deberías ver tu usuario con `token_type: "fcm_native"`

4. **Enviar notificación de prueba desde backend**:
   ```bash
   curl -X POST http://localhost:8080/api/admin-api/users/test-push-broadcast/ \
     -H "Authorization: Bearer {admin_token}" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "body": "Hola desde Firebase"}'
   ```

5. **Verificar en navegador**:
   - Deberías ver una notificación push nativa
   - Si haces clic, te lleva a `/taller/incidentes`

### 9. Probar Flujo Real

1. **Crear incidencia desde app móvil**
2. **El backend ejecuta AssignmentEngine**
3. **Envía push a talleres cercanos**
4. **Panel web recibe**:
   - ✅ Notificación push del navegador
   - ✅ Actualización SSE en tiempo real
   - ✅ Auto-refresh de lista de incidentes
   - ✅ Sonido de notificación (opcional)

---

## 🐛 Troubleshooting

### Problema: "Service Worker registration failed"

**Causa:** El navegador no permite service workers en HTTP (excepto localhost)

**Solución:**
- Usa HTTPS (ngrok, certificado SSL)
- O usa `localhost` exacto (no `127.0.0.1`)

### Problema: "Messaging: This browser doesn't support the API"

**Causa:** Navegador viejo o incompatible

**Solución:**
- Usa Chrome 50+, Firefox 44+, Edge 79+
- Safari no soporta FCM, usa APNs

### Problema: "Permission denied"

**Causa:** Usuario bloqueó las notificaciones

**Solución:**
1. Chrome: Settings → Privacy → Site Settings → Notifications
2. Permitir para tu dominio
3. Recargar página

### Problema: "Failed to register token on backend"

**Causa:** Backend no accesible o CORS

**Solución:**
```python
# backend/config/settings.py
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'https://abc123.ngrok.io'  # Si usas ngrok
]
```

### Problema: No llegan notificaciones

**Verificar:**

1. **Token registrado en BD**:
   ```sql
   SELECT id, username, fcm_token FROM users_user WHERE fcm_token != '';
   ```

2. **Logs del backend** al enviar push:
   ```
   Successfully sent FCM message: projects/appemergenciasbeet/messages/xxx
   ```

3. **Console del navegador** (F12):
   ```
   [firebase-messaging-sw.js] Received background message
   ```

4. **Firebase Console** → Cloud Messaging → ver estadísticas de entrega

---

## 📊 Verificación Final

✅ Checklist:

- [ ] Firebase SDK instalado
- [ ] Credenciales configuradas en service y SW
- [ ] `firebase-messaging-sw.js` copiado a `/dist`
- [ ] Navegador permite notificaciones
- [ ] Token FCM registrado en backend
- [ ] Notificaciones de prueba funcionan
- [ ] SSE + Push funcionan en conjunto
- [ ] Navegación desde notificación funciona

---

## 🎯 Características Implementadas

### Frontend Taller

✅ **WorkshopRealtimeService**
- Inicializa push notifications automáticamente al login
- Registra token FCM en backend
- Escucha mensajes en foreground
- Reproduce sonido de notificación

✅ **Service Worker (firebase-messaging-sw.js)**
- Maneja notificaciones en background
- Muestra notificaciones nativas del navegador
- Permite acciones (Ver detalle / Cerrar)
- Navega al incidente al hacer clic

✅ **PushNotificationsService**
- Solicita permisos al usuario
- Obtiene token FCM web
- Registra en backend vía `/api/web/auth/fcm-token/`
- Maneja errores gracefully

### Backend Django

✅ **push_service.py**
- Detecta tokens FCM web nativos
- Envía vía Firebase Admin SDK
- Soporta Expo tokens (app móvil) y FCM web (navegador)

✅ **Endpoints**
- `POST /api/web/auth/fcm-token/` - Registrar token taller
- `GET /api/admin-api/users/push-tokens/` - Listar tokens
- `POST /api/admin-api/users/test-push-broadcast/` - Prueba broadcast

---

## 🔗 Referencias

- [Firebase Cloud Messaging Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Firebase Admin Python SDK](https://firebase.google.com/docs/admin/setup)

---

**¡Listo! 🎉** Tu sistema de notificaciones push web está configurado.
