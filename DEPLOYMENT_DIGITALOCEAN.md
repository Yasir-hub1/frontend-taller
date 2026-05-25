# Guía de Deployment - Frontend Angular (Deployment Profesional)

## Información del Proyecto

**Aplicación:** Panel Web Taller - Sistema de Emergencias Vehiculares
**Framework:** Angular 21.2.0 (SPA - Single Page Application)
**Tipo de deployment:** Static files servidos por Nginx
**Subdominio:** https://ahoringallego.smartcondominio.lat/
**Backend API:** https://ws-taller.smartcondominio.lat/

---

## Filosofía de Deployment (Dev Senior Approach)

### ¿Por qué NO usar Node.js/PM2/SSR?

Si tu aplicación Angular es una **SPA típica** que:
- ✅ Consume una API REST del backend
- ✅ No requiere SEO crítico (no es blog/e-commerce público)
- ✅ Es un panel administrativo/dashboard
- ✅ Los usuarios acceden después de login

Entonces **NO necesitas SSR** y mucho menos Node.js/PM2.

### Arquitectura Correcta (Dev Senior)

```
Usuario → Nginx (443) → Archivos estáticos (HTML/CSS/JS)
                              ↓
                        JavaScript carga en navegador
                              ↓
                        Llama a API Backend (HTTPS)
```

### Ventajas de Static Deployment

| Aspecto | Static (Nginx) | SSR (Node.js/PM2) |
|---------|---------------|-------------------|
| **Simplicidad** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ (Nginx es ultra rápido) | ⭐⭐⭐ |
| **Recursos** | 50MB RAM | 200-500MB RAM |
| **Mantenimiento** | Casi cero | Monitorear PM2, logs, crashes |
| **Deployment** | Subir archivos y recargar Nginx | Build + reiniciar PM2 |
| **Costo** | Mínimo | Requiere más RAM/CPU |
| **Puntos de fallo** | Solo Nginx | Nginx + Node.js + PM2 |

---

## PARTE 1: Preparación del Servidor

### 1.1 Requisitos Previos

Asumiendo que ya tienes:
- ✅ Droplet Ubuntu 22.04 LTS
- ✅ Nginx instalado
- ✅ Backend Django corriendo en `https://ws-taller.smartcondominio.lat/`
- ✅ Firewall UFW configurado

### 1.2 Configurar DNS

```bash
# Crear registro A en tu proveedor DNS:
Tipo: A
Nombre: ahoringallego
Valor: [IP_DEL_SERVIDOR]
TTL: 3600
```

Verificar propagación:
```bash
nslookup ahoringallego.smartcondominio.lat
```

### 1.3 Conectar al Servidor

```bash
ssh root@[IP_DEL_SERVIDOR]
```

---

## PARTE 2: Configuración en Tu Máquina Local

### 2.1 Configurar Environment de Producción

```bash
# En tu máquina local
cd /Volumes/externo/PROYECTOS/proyectos-u/betty/examen/frontend_taller

# Editar environment.production.ts
nano src/environments/environment.production.ts
```

**Configuración correcta:**

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://ws-taller.smartcondominio.lat/',  // ← Con trailing slash
  stripePublishableKey: 'pk_live_TU_CLAVE_STRIPE_PRODUCCION',  // ← Cambiar a live
  appVersion: '1.0.0',
};
```

### 2.2 Desactivar SSR (Opcional pero Recomendado)

Si no necesitas SSR, simplifica tu `angular.json`:

```bash
nano angular.json
```

Buscar la sección `"build"` y **eliminar estas líneas**:

```json
"server": "src/main.server.ts",
"outputMode": "server",
"ssr": {
  "entry": "src/server.ts"
}
```

Dejar solo:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "tsConfig": "tsconfig.app.json",
    "assets": [
      {
        "glob": "**/*",
        "input": "public"
      }
    ],
    "styles": [
      "src/styles.css",
      "node_modules/leaflet/dist/leaflet.css"
    ]
  },
  "configurations": {
    "production": {
      "budgets": [...],
      "outputHashing": "all",
      "optimization": true,
      "sourceMap": false
    }
  }
}
```

### 2.3 Build de Producción

```bash
# Limpiar builds anteriores
rm -rf dist .angular

# Build optimizado para producción
npm run build -- --configuration production

# Resultado: dist/frontend_taller/browser/
```

### 2.4 Verificar Build

```bash
ls -la dist/frontend_taller/browser/

# Debe contener:
# - index.html
# - main-[hash].js
# - polyfills-[hash].js
# - styles-[hash].css
# - assets/
```

### 2.5 Transferir Build al Servidor

**Opción A: rsync (Recomendado)**

```bash
# Desde tu máquina local
rsync -avz --delete \
  dist/frontend_taller/browser/ \
  root@134.209.218.230:/var/www/emergencias/frontend/
```

**Opción B: scp**

```bash
# Comprimir
tar -czf frontend-build.tar.gz -C dist/frontend_taller/browser .

# Transferir
scp frontend-build.tar.gz root@[IP_DEL_SERVIDOR]:/tmp/

# En el servidor:
ssh root@[IP_DEL_SERVIDOR]
mkdir -p /var/www/emergencias/frontend
tar -xzf /tmp/frontend-build.tar.gz -C /var/www/emergencias/frontend/
rm /tmp/frontend-build.tar.gz
```

**Opción C: Git (Setup Inicial)**

Si prefieres hacer build en el servidor:

```bash
# En el servidor
cd /var/www/emergencias
git clone [URL_REPO] frontend-source
cd frontend-source
npm install
npm run build -- --configuration production

# Copiar build a directorio de producción
mkdir -p /var/www/emergencias/frontend
cp -r dist/frontend_taller/browser/* /var/www/emergencias/frontend/
```

---

## PARTE 3: Configuración de Nginx (Simple y Profesional)

### 3.1 Crear Configuración de Nginx

```bash
nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat
```

**Configuración profesional:**

```nginx
##
# Frontend Angular - ahoringallego.smartcondominio.lat
# Static files servidos directamente por Nginx
##

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ahoringallego.smartcondominio.lat;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ahoringallego.smartcondominio.lat;

    # SSL Certificates (generados por certbot)
    ssl_certificate /etc/letsencrypt/live/ahoringallego.smartcondominio.lat/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ahoringallego.smartcondominio.lat/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory
    root /var/www/emergencias/frontend;
    index index.html;

    # Logs
    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log warn;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Cache static assets aggressively
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Angular SPA routing (todas las rutas devuelven index.html)
    location / {
        try_files $uri $uri/ /index.html;

        # Cache control para index.html (no cachear)
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Negar acceso a archivos sensibles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deshabilitar logs para archivos que no existen
    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    location = /robots.txt {
        access_log off;
        log_not_found off;
    }
}
```

### 3.2 Explicación de la Configuración

**Puntos clave:**

1. **`try_files $uri $uri/ /index.html;`**
   - Maneja el routing de Angular
   - Todas las rutas que no existen físicamente devuelven `index.html`
   - Angular router se encarga del resto

2. **Cache agresivo para assets**
   - JS/CSS/Imágenes: 1 año de cache
   - `immutable` = navegador nunca revalida
   - Ahorro de bandwidth y carga más rápida

3. **No cache para index.html**
   - Siempre descarga la última versión
   - Evita que usuarios vean versión vieja después de deploy

4. **Gzip compression**
   - Reduce tamaño de archivos en 70-80%
   - Más rápido en conexiones lentas

5. **Security headers**
   - Protección básica contra XSS, clickjacking, etc.

### 3.3 Habilitar Sitio

```bash
# Crear symlink
ln -s /etc/nginx/sites-available/ahoringallego.smartcondominio.lat \
      /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t
```

### 3.4 Configuración Temporal (antes de SSL)

Si `nginx -t` falla por falta de certificados SSL, comentar temporalmente las líneas SSL:

```bash
nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat
```

Comentar el bloque HTTPS completo y usar solo:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ahoringallego.smartcondominio.lat;

    root /var/www/emergencias/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Reiniciar Nginx
systemctl restart nginx
```

---

## PARTE 4: Configuración SSL con Let's Encrypt

### 4.1 Obtener Certificado

```bash
certbot --nginx -d ahoringallego.smartcondominio.lat

# Responder:
# - Email: tu@email.com
# - Términos: A (aceptar)
# - Redirect HTTP → HTTPS: 2 (sí)
```

### 4.2 Restaurar Configuración Completa

```bash
# Descomentar líneas SSL
nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat

# Verificar
nginx -t

# Recargar
systemctl reload nginx
```

### 4.3 Verificar Renovación Automática

```bash
# Ver timer de renovación
systemctl list-timers | grep certbot

# Test de renovación
certbot renew --dry-run
```

---

## PARTE 5: Verificación del Deployment

### 5.1 Verificar Archivos

```bash
# Listar archivos servidos
ls -la /var/www/emergencias/frontend/

# Verificar permisos
chmod -R 755 /var/www/emergencias/frontend/
```

### 5.2 Probar desde Servidor

```bash
# Test local
curl -I http://localhost

# Test HTTPS
curl -I https://ahoringallego.smartcondominio.lat
```

### 5.3 Probar desde Navegador

1. Abrir: `https://ahoringallego.smartcondominio.lat`
2. DevTools (F12) → Network
3. Verificar:
   - ✅ Archivos cargan desde Nginx
   - ✅ Peticiones API van a `https://ws-taller.smartcondominio.lat/`
   - ✅ No hay errores de CORS
   - ✅ Cache headers correctos

### 5.4 Verificar Cache Headers

```bash
# Verificar cache de JS/CSS
curl -I https://ahoringallego.smartcondominio.lat/main.js | grep -i cache

# Debe mostrar: Cache-Control: public, immutable

# Verificar no-cache de index.html
curl -I https://ahoringallego.smartcondominio.lat/ | grep -i cache

# Debe mostrar: Cache-Control: no-cache, no-store, must-revalidate
```

---

## PARTE 6: Configurar CORS en Backend Django

El backend debe permitir peticiones desde tu frontend:

```bash
# Conectar al servidor backend (si está en el mismo)
nano /var/www/emergencias/backend/.env
```

Agregar a `CORS_ALLOWED_ORIGINS`:

```env
CORS_ALLOWED_ORIGINS=https://ahoringallego.smartcondominio.lat,https://ws-taller.smartcondominio.lat
```

```bash
# Reiniciar backend
systemctl restart emergencias-daphne
```

---

## PARTE 7: Proceso de Deployment (Actualizaciones)

### 7.1 Script de Deployment Automatizado

**En tu máquina local**, crear script de deployment:

```bash
nano deploy.sh
```

Contenido:

```bash
#!/bin/bash

# Configuración
SERVER="root@[IP_DEL_SERVIDOR]"
REMOTE_PATH="/var/www/emergencias/frontend"

echo "🚀 Iniciando deployment a producción..."

# 1. Build de producción
echo "📦 Building..."
npm run build -- --configuration production

if [ $? -ne 0 ]; then
    echo "❌ Build falló"
    exit 1
fi

# 2. Transferir archivos
echo "📤 Transfiriendo archivos..."
rsync -avz --delete \
    dist/frontend_taller/browser/ \
    $SERVER:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    echo "❌ Transferencia falló"
    exit 1
fi

# 3. Recargar Nginx
echo "♻️  Recargando Nginx..."
ssh $SERVER "systemctl reload nginx"

echo "✅ Deployment completado!"
echo "🌐 Verificar: https://ahoringallego.smartcondominio.lat"
```

```bash
# Dar permisos
chmod +x deploy.sh
```

### 7.2 Deployment en Un Solo Comando

```bash
# Desde tu máquina local
./deploy.sh
```

### 7.3 Deployment Manual

Si prefieres hacerlo paso a paso:

```bash
# 1. En tu máquina local - Build
npm run build -- --configuration production

# 2. Transferir
rsync -avz --delete \
    dist/frontend_taller/browser/ \
    root@[IP]:/var/www/emergencias/frontend/

# 3. En el servidor - Recargar Nginx
ssh root@[IP] "systemctl reload nginx"
```

---

## PARTE 8: Backup y Rollback

### 8.1 Script de Backup Antes de Deploy

Modificar `deploy.sh` para incluir backup:

```bash
#!/bin/bash

SERVER="root@[IP_DEL_SERVIDOR]"
REMOTE_PATH="/var/www/emergencias/frontend"
BACKUP_PATH="/var/backups/emergencias/frontend"

echo "🚀 Iniciando deployment..."

# 1. Crear backup en servidor
echo "💾 Creando backup..."
ssh $SERVER "mkdir -p $BACKUP_PATH && \
    tar -czf $BACKUP_PATH/backup_\$(date +%Y%m%d_%H%M%S).tar.gz \
    -C $REMOTE_PATH . && \
    find $BACKUP_PATH -name 'backup_*.tar.gz' -mtime +7 -delete"

# 2. Build
echo "📦 Building..."
npm run build -- --configuration production

# 3. Deploy
echo "📤 Deploying..."
rsync -avz --delete \
    dist/frontend_taller/browser/ \
    $SERVER:$REMOTE_PATH/

# 4. Recargar Nginx
echo "♻️  Recargando Nginx..."
ssh $SERVER "systemctl reload nginx"

echo "✅ Deployment completado!"
```

### 8.2 Rollback a Versión Anterior

```bash
# En el servidor
cd /var/backups/emergencias/frontend

# Listar backups
ls -lh

# Restaurar backup específico
tar -xzf backup_20260423_120000.tar.gz -C /var/www/emergencias/frontend/

# Recargar Nginx
systemctl reload nginx
```

---

## PARTE 9: Optimizaciones Avanzadas

### 9.1 Configurar CDN (Cloudflare - Opcional)

Si quieres máxima performance global:

1. Ir a Cloudflare.com
2. Agregar dominio `smartcondominio.lat`
3. Cambiar nameservers de tu dominio
4. Habilitar:
   - Auto Minify (JS/CSS/HTML)
   - Brotli compression
   - Rocket Loader
   - HTTP/3

**Ventajas:**
- Cache global (usuarios en otros países cargan más rápido)
- DDoS protection gratis
- SSL automático
- Compresión Brotli (mejor que Gzip)

### 9.2 Habilitar HTTP/3 en Nginx

```bash
# Instalar nginx con soporte HTTP/3
apt install -y nginx-extras

nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat
```

Cambiar:

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

A:

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
listen 443 quic reuseport;
listen [::]:443 quic reuseport;
add_header Alt-Svc 'h3=":443"; ma=86400';
```

### 9.3 Precompresión con Brotli

```bash
# Instalar brotli
apt install -y brotli

# Precomprimir archivos estáticos
cd /var/www/emergencias/frontend
find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) \
    -exec brotli -k {} \;

# Configurar Nginx para servir archivos .br
nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat
```

Agregar:

```nginx
# Brotli
brotli_static on;
```

---

## PARTE 10: Monitoreo y Performance

### 10.1 Verificar Performance

```bash
# Test de velocidad con curl
time curl -so /dev/null https://ahoringallego.smartcondominio.lat

# Ver tamaño de archivos transferidos
curl -so /dev/null -w "Size: %{size_download} bytes\nTime: %{time_total}s\n" \
    https://ahoringallego.smartcondominio.lat
```

### 10.2 Logs de Nginx

```bash
# Access log (peticiones exitosas)
tail -f /var/log/nginx/frontend_access.log

# Error log
tail -f /var/log/nginx/frontend_error.log

# Estadísticas de códigos HTTP
awk '{print $9}' /var/log/nginx/frontend_access.log | sort | uniq -c | sort -rn

# Top 10 páginas más visitadas
awk '{print $7}' /var/log/nginx/frontend_access.log | sort | uniq -c | sort -rn | head -10
```

### 10.3 Monitoreo de Recursos

```bash
# Uso de disco
df -h /var/www/emergencias/frontend

# Tamaño del frontend
du -sh /var/www/emergencias/frontend

# Procesos Nginx
ps aux | grep nginx
```

---

## PARTE 11: Troubleshooting

### 11.1 Error 404 en Rutas de Angular

**Síntoma:** Rutas como `/dashboard` dan 404 al recargar

**Causa:** Falta configuración `try_files`

**Solución:**

```bash
nano /etc/nginx/sites-available/ahoringallego.smartcondominio.lat
```

Verificar que tenga:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```bash
nginx -t && systemctl reload nginx
```

### 11.2 Archivos Viejos Después de Deploy

**Síntoma:** Cambios no se ven después de deploy

**Causa:** Cache del navegador

**Solución:**

1. Verificar que `index.html` tenga no-cache:
   ```bash
   curl -I https://ahoringallego.smartcondominio.lat/ | grep -i cache
   ```

2. Verificar que archivos JS/CSS tienen hash:
   ```bash
   ls /var/www/emergencias/frontend/*.js
   # Debe mostrar: main-ABC123.js (con hash)
   ```

3. Hard refresh en navegador: `Ctrl+Shift+R` (o `Cmd+Shift+R`)

### 11.3 Error CORS al Llamar API

**Síntoma:** Errores CORS en consola del navegador

**Solución:**

```bash
# Verificar environment.production.ts
cat /var/www/emergencias/frontend/main-*.js | grep -o 'https://ws-taller[^"]*'

# Verificar CORS en backend
ssh root@[IP] "cat /var/www/emergencias/backend/.env | grep CORS"

# Debe incluir: https://ahoringallego.smartcondominio.lat
```

### 11.4 SSL No Funciona

**Síntoma:** HTTPS da error de certificado

**Solución:**

```bash
# Verificar certificados
certbot certificates

# Renovar si es necesario
certbot renew

# Verificar configuración Nginx
nginx -t

# Ver logs SSL
tail -f /var/log/letsencrypt/letsencrypt.log
```

### 11.5 Nginx No Inicia

**Síntoma:** `systemctl status nginx` muestra error

**Solución:**

```bash
# Ver error específico
nginx -t

# Ver logs
journalctl -u nginx -n 50 --no-pager

# Verificar puerto 80/443 no ocupado
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Reiniciar
systemctl restart nginx
```

---

## PARTE 12: Checklist de Deployment

Antes de considerar completo:

- [ ] DNS configurado y propagado
- [ ] Build de producción ejecutado sin errores
- [ ] `environment.production.ts` apunta a backend correcto
- [ ] Archivos transferidos a `/var/www/emergencias/frontend/`
- [ ] Permisos correctos (755)
- [ ] Nginx configurado con `try_files` para SPA
- [ ] SSL certificado instalado y activo
- [ ] CORS configurado en backend
- [ ] Sitio accesible en `https://ahoringallego.smartcondominio.lat`
- [ ] Rutas de Angular funcionan (sin 404)
- [ ] API calls funcionan sin errores CORS
- [ ] Cache headers correctos
- [ ] Gzip habilitado
- [ ] Logs rotando correctamente
- [ ] Script de deployment automatizado creado

---

## PARTE 13: Comparación Final (Static vs SSR)

### Tu Configuración Actual (Static + Nginx)

```
Recursos usados:
- RAM: ~10MB (solo archivos estáticos)
- CPU: Mínimo (Nginx ultra eficiente)
- Disco: 5-10MB (archivos build)
- Procesos: 0 (solo Nginx que ya está corriendo)

Deployment:
1. npm run build
2. rsync archivos
3. Reload nginx
Total: 1-2 minutos

Mantenimiento:
- No hay procesos que monitorear
- No hay crashes de Node.js
- No hay memory leaks
- Solo verificar Nginx (que ya tienes)
```

### Alternativa SSR (Node.js + PM2) ❌

```
Recursos usados:
- RAM: 200-500MB (Node.js + PM2)
- CPU: Medio (procesar requests)
- Disco: 50MB+
- Procesos: 2-4 instancias Node.js

Deployment:
1. npm run build
2. Transferir archivos
3. Restart PM2
4. Monitorear si inició bien
5. Ver logs por crashes
Total: 5-10 minutos

Mantenimiento:
- Monitorear PM2 diario
- Revisar crashes de Node.js
- Memory leaks posibles
- Logs de aplicación
- Reiniciar si se cuelga
```

**Conclusión:** Para una SPA típica, static deployment es **objetivamente superior**.

---

## PARTE 14: CI/CD (Bonus)

### 14.1 GitHub Actions (Automated Deployment)

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build -- --configuration production

    - name: Deploy to server
      uses: easingthemes/ssh-deploy@v4
      with:
        SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
        REMOTE_USER: root
        SOURCE: "dist/frontend_taller/browser/"
        TARGET: "/var/www/emergencias/frontend/"

    - name: Reload Nginx
      uses: appleboy/ssh-action@v0.1.10
      with:
        host: ${{ secrets.REMOTE_HOST }}
        username: root
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: systemctl reload nginx
```

**Setup:**
1. En GitHub → Settings → Secrets → New secret
2. Agregar `SSH_PRIVATE_KEY` (tu clave privada SSH)
3. Agregar `REMOTE_HOST` (IP de tu servidor)

**Resultado:** Cada push a `main` → deploy automático

---

## Comandos de Referencia Rápida

```bash
# BUILD (local)
npm run build -- --configuration production

# DEPLOY (local)
rsync -avz --delete dist/frontend_taller/browser/ root@[IP]:/var/www/emergencias/frontend/

# RELOAD NGINX (servidor)
systemctl reload nginx

# VERIFICAR
curl -I https://ahoringallego.smartcondominio.lat

# LOGS
tail -f /var/log/nginx/frontend_access.log
tail -f /var/log/nginx/frontend_error.log

# BACKUP
tar -czf backup.tar.gz -C /var/www/emergencias/frontend .

# ROLLBACK
tar -xzf backup.tar.gz -C /var/www/emergencias/frontend/
```

---

## Conclusión

Has implementado un **deployment profesional y simple** de tu frontend Angular:

✅ **Sin complejidad innecesaria** (no PM2, no Node.js)
✅ **Máximo performance** (Nginx sirve archivos estáticos)
✅ **Mínimos recursos** (10MB RAM vs 500MB)
✅ **Deployment en segundos** (subir archivos + reload)
✅ **Cero mantenimiento** (sin procesos que monitorear)
✅ **Escalable** (Nginx maneja miles de requests fácilmente)

**URLs finales:**
- Frontend: https://ahoringallego.smartcondominio.lat
- Backend: https://ws-taller.smartcondominio.lat

Esta es la forma **correcta y profesional** de deployar una SPA Angular en producción.

---

**Recursos:**
- Nginx docs: https://nginx.org/en/docs/
- Angular build: https://angular.dev/tools/cli/build
- Let's Encrypt: https://letsencrypt.org/
