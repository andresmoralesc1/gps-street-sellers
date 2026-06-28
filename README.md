# GPS Street Sellers (BarrioTech)

Plataforma que conecta vendedores informales de calle con consumidores cercanos usando geolocalización en tiempo real.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- PostgreSQL 14+
- npm

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp apps/web/.env.example apps/web/.env
# Editar apps/web/.env con tus credenciales (DB, JWT_SECRET, etc.)

# Aplicar migraciones
npm run migrate

# Iniciar desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000` (configurable via `PORT`).

## 📁 Estructura del Proyecto

```
gps-street-sellers/
├── apps/
│   └── web/              # Next.js 14 App Router
├── packages/
│   └── core/             # Tipos y utilidades compartidas
├── migrations/           # SQL migrations (numeradas, idempotentes)
└── scripts/
    ├── migrate.js        # Migration runner
    └── tests/            # node:test integration suite
```

## 🎨 Stack Técnico

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Mapas:** React-Leaflet + OpenStreetMap
- **Estado:** Zustand
- **Backend:** Next.js API routes + PostgreSQL (direct via `pg`)
- **Auth:** JWT (jose para edge/middleware, jsonwebtoken para node routes)
- **Mobile:** Expo (próximamente)

## 🛠️ Scripts Útiles

```bash
npm run dev               # Development server
npm run build             # Production build (core + web)
npm run migrate           # Apply pending DB migrations
npm run migrate:status    # Show migration status
npm test                  # Run integration tests
```

## 🗄️ Base de Datos

Las migraciones viven en `/migrations` como archivos `NNN_description.sql` numerados.
El runner (`scripts/migrate.js`) las aplica en orden lexicográfico y registra
los nombres aplicados en la tabla `migrations`.

Para agregar una nueva migración:

1. Crea `migrations/NNN_descripcion.sql` con `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, etc.
2. Hazla idempotente (segura de correr 2+ veces).
3. Corre `npm run migrate`.

## 🔐 Auth

- `lib/auth-edge.ts` — funciones seguras para middleware (edge runtime)
- `lib/auth.ts` — funciones para API routes (node runtime, incluye `jsonwebtoken`)
- `lib/auth-db.ts` — helpers que tocan DB (`isTokenRevoked`)
- `lib/rate-limit.ts` — rate limiter persistente en Postgres

**Secret:** `JWT_SECRET` en `apps/web/.env`. Genera con `openssl rand -base64 64`.

## 🧪 Tests

Integration tests escritos con `node:test` (sin deps externas).
Cada test corre contra el deployment en vivo (`https://gps.neuralflow.space`).

```bash
npm test                  # all tests
npm run test:auth         # solo auth
npm run test:vendors      # solo vendors/products
```

Cada test resetea `rate_limit_attempts` antes de empezar para no depender de runs previas.

## 📋 Reglas de Negocio

- Vendedores activos con GPS < 5 min aparecen en el mapa
- Frecuencia de GPS: cada 15-30 segundos
- Máximo 10 favoritos por comprador
- Notificaciones solo si el usuario las habilita
- Rate limit: 5 intentos de login / 5 min por IP

## 🔧 Operations

### Health endpoints

```
GET /api/health       # Cheap liveness — no DB. For load balancers.
GET /api/health/ready # Deep readiness — pings DB. 200 OK / 503 degraded.
```

Example:

```bash
curl -s http://localhost:3005/api/health | jq
# {
#   "status": "ok",
#   "uptime": 12345,
#   "uptimeHuman": "3h 25m",
#   "memory": { "heapUsedMB": 45, "rssMB": 102 },
#   ...
# }

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/api/health/ready
# 200
```

Point UptimeRobot / BetterStack / Pingdom at `/api/health/ready` (every 60s, alert on non-200).

### Database backups

`scripts/backup-db.sh` produces a gzipped `pg_dump` with timestamp + configurable retention:

```bash
# Manual run (uses apps/web/.env credentials)
./scripts/backup-db.sh

# Override destination + retention
BACKUP_DIR=/var/backups/gps BACKUP_KEEP_DAILY=14 ./scripts/backup-db.sh

# Cron (3am daily)
0 3 * * * /home/telchar/gps-street-sellers/scripts/backup-db.sh >> /var/log/gps-backup.log 2>&1
```

Retention: 7 daily + 4 weekly (Sundays). Optional S3 upload — set `BACKUP_S3_BUCKET`.

**Restore from a backup:**

```bash
gunzip -c backups/gps_street_sellers_2026-06-28_030001.sql.gz \
  | psql -h localhost -U postgres -d gps_street_sellers
```

## 🚢 Deploy

```bash
npm run build
pm2 start "npm run start" --name gps
# or use pm2 ecosystem.config.js
```

## 📜 CI/CD

`.github/workflows/ci.yml` corre build + tests en cada PR a `main`/`master`.

## 📱 Pantallas

1. **Onboarding** - 3 slides de introducción
2. **Login/Registro** - Autenticación por email
3. **Selección de rol** - Buyer o Seller
4. **Mapa (Buyer)** - Vendedores activos en el mapa
5. **Detalle vendedor** - Perfil, productos, reseñas
6. **Dashboard (Seller)** - Toggle activo/inactivo, métricas
7. **Editar perfil** - Datos y productos del vendedor
8. **Configuración** - Notificaciones y preferencias

## 🔜 Roadmap

- [x] Push notifications ✅ (Etapa 2)
- [x] Health endpoints + backups ✅ (Etapa 3)
- [ ] Legal Colombia (Ley 1581) — Etapa 4
- [ ] Security headers (HSTS, CSP) + rate limits — Etapa 5
- [ ] Realtime GPS tracking (WebSockets)
- [ ] Mobile app (Expo)
- [ ] Pagos integrados (Wompi/Nequi)
- [ ] Next.js 16 upgrade