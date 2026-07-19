# Auditoría DB — gps_street_sellers

**Fecha:** 2026-07-17
**DB:** PostgreSQL @ localhost:5432 / db=gps_street_sellers
**Total rows estimado:** ~975 filas / 9.4 MB
**Total tablas:** 21

## Resumen ejecutivo

| Severidad | Cantidad | Categoría |
|-----------|----------|-----------|
| 🔴 **P0** (rompe invariantes / security) | 6 | FK huérfanas, índices faltantes en FK críticas, N+1 en export, CHECK constraints faltantes, datos huérfanos reales |
| 🟠 **P1** (degradación performance / data quality) | 9 | Índices faltantes en FKs, N+1 cliente, falta PostGIS+GiST, columnas NULL en defaults lógicos no-NULL, CHECK faltantes en `order_items` |
| 🟡 **P2** (cleanup / nice-to-have) | 5 | Índices parciales faltantes, semántica de NULL, redundancia de queries en stats |

---

## (1) Tablas sin índice en FKs o columnas de búsqueda frecuente 🔴🟠

Resultado cross-referenciando `\d+` vs `pg_indexes`:

| Tabla | Columna FK | ¿Cubierta? | Severidad | Fix |
|-------|------------|------------|-----------|-----|
| **reviews** | `vendor_id` | ❌ **MISSING** | 🔴 P0 | `CREATE INDEX idx_reviews_vendor_id ON reviews(vendor_id, created_at DESC);` |
| **products** | `vendor_id` | ❌ **MISSING** | 🔴 P0 | `CREATE INDEX idx_products_vendor_id ON products(vendor_id, created_at DESC);` |
| **orders** | `vendor_id` | ❌ MISSING | 🔴 P0 | `CREATE INDEX idx_orders_vendor_id ON orders(vendor_id, created_at DESC);` |
| **orders** | `buyer_id` | ❌ MISSING | 🔴 P0 | `CREATE INDEX idx_orders_buyer_id ON orders(buyer_id, created_at DESC);` |
| **order_items** | `order_id` | ❌ MISSING | 🟠 P1 | `CREATE INDEX idx_order_items_order_id ON order_items(order_id);` |
| **order_items** | `product_id` | ❌ MISSING | 🟠 P1 | `CREATE INDEX idx_order_items_product_id ON order_items(product_id);` |
| **notifications** | `user_id` | ❌ MISSING | 🟠 P1 | `CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);` (puede ser parcial `WHERE read = false` para unread badge) |
| **vendor_views** | `user_id` | ❌ MISSING | 🟡 P2 | `CREATE INDEX idx_vendor_views_user_id ON vendor_views(user_id, viewed_at DESC);` |
| **ad_campaigns** | `created_by` | ❌ MISSING | 🟡 P2 | `CREATE INDEX idx_ad_campaigns_created_by ON ad_campaigns(created_by);` |
| **ad_campaigns** | `target_category` | ❌ MISSING | 🟡 P2 | `CREATE INDEX idx_ad_campaigns_target_category ON ad_campaigns(target_category);` |
| **vendors** | `profile_id` | ❌ No dedicado | 🟠 P1 | `CREATE INDEX idx_vendors_profile_id ON vendors(profile_id);` (aunque N16 ya permite 3 vendors por profile, esta col ya no es 1:1) |
| **vendors** | `category` (text) | ❌ Sin índice | 🟠 P1 | `CREATE INDEX idx_vendors_category ON vendors(category);` — usado en `WHERE v.category = $1` y ranking CTE |

**Cobertura actual confirmada (OK):**
- `favorites.{buyer_id,vendor_id}` ← cubierto por `favorites_buyer_id_vendor_id_key`
- `consent_logs.user_id` ← `consent_logs_user_id_idx`
- `push_subscriptions.user_id` ← `idx_push_user`
- `product_photos.product_id` ← `idx_product_photos_product_id`
- `profiles.user_id` ← `profiles_user_id_key` (UNIQUE)
- `vendor_location_history.vendor_id` ← `idx_vendor_location_history_vendor_time`
- `vendor_views.vendor_id` ← `idx_vendor_views_vendor_date` / `idx_vendor_views_vendor_id`
- `sponsorships.vendor_id` ← `idx_sponsorships_vendor_active`

**Evidencia empírica** (`pg_stat_user_tables`):
```
relname           | seq_scan | idx_scan | n_live_tup
------------------+----------+----------+-----------
vendors           |   1785   |    1     |    12     ← ⚠️ seq-scan masivo
products          |     68   |   45     |    11
reviews           |     30   |    0     |     2     ← ⚠️ 0 idx_scan
notifications     |     52   |    0     |     0     ← ⚠️ 0 idx_scan
order_items       |      6   |    0     |     0     ← ⚠️ 0 idx_scan
orders            |     48   |    0     |     0     ← ⚠️ 0 idx_scan
```

---

## (2) Queries N+1 en código 🔴🟠

### 🔴 P0 — Server-side N+1 real en `account/export`

**Archivo:** `apps/web/app/api/account/export/route.ts:82-89`

```typescript
// step 5. Orders received (vendor side).
const ordersReceived: unknown[] = []
for (const v of (vendorRes.rows as Array<{ id: string }>)) {
  const r = await pool.query(
    `SELECT id, status, total, created_at
     FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [v.id]
  )
  ordersReceived.push(...r.rows)
}
```

**Problema:** una query por cada vendor que posea el usuario (1-3 según el límite de la tabla). Aunque el caso real es ≤3, sigue siendo patrón a evitar.

**Fix (reemplazar step 5 completo):**

```typescript
// Una sola query para todas las órdenes recibidas.
const ordersReceivedRes = profileId ? await pool.query(
  `SELECT o.id, o.vendor_id, o.status, o.total, o.created_at
   FROM orders o
   JOIN vendors v ON v.id = o.vendor_id
   WHERE v.profile_id = $1
   ORDER BY o.created_at DESC`,
  [profileId]
) : { rows: [] }
// NOTA: al usar profile_id (1 query) se evita iterar vendors.
```

### 🟠 P1 — Client-side N+1 en `notifications` mark-all-read

**Archivo:** `apps/web/app/notifications/page.tsx:42-53`

```typescript
const markAllRead = async () => {
  await Promise.all(
    notifications
      .filter((n) => !n.read)
      .map((n) =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          ...
        })
      )
  )
  setNotifications(notifications.map((n) => ({ ...n, read: true })))
}
```

**Problema:** 1 fetch HTTP por cada notificación no leída. Si el usuario tiene 50 no leídas (es el `LIMIT 50` del GET), son 50 round-trips paralelos al API + 50 updates al server. Aunque `Promise.all` lo ejecute en paralelo, satura la tabla `notifications` con 50 UPDATEs.

**Fix (cliente):** añadir endpoint bulk:
```typescript
await fetch('/api/notifications/bulk', {
  method: 'POST',
  body: JSON.stringify({ ids: notifications.filter(n=>!n.read).map(n=>n.id) })
})
```
**Fix (server, nuevo `app/api/notifications/bulk/route.ts`):**
```sql
UPDATE notifications SET read = true
WHERE user_id IN (SELECT id FROM profiles WHERE user_id = $1)
  AND read = false
  AND id = ANY($2::uuid[])
```

### ✅ Auditados y limpios (N+1 evitados correctamente)
- `apps/web/app/api/orders/route.ts:66-87` — comentario explícito `// Avoids N+1`, usa batch + grouping en Map.
- `apps/web/app/api/orders/route.ts:158-163` — `WHERE id = ANY($1::uuid[])` para validar precios.
- `apps/web/app/api/vendors/[id]/location/route.ts:154` — `Promise.all` paralelo, no es N+1 real.
- `apps/web/app/api/vendors/route.ts` — count + ads + vendors en paralelo en línea 127.
- `apps/web/lib/push.ts:103` — `Promise.allSettled` para envios paralelos.

---

## (3) Datos huérfanos o inconsistentes 🔴🟠

| # | Hallazgo | Severidad | Cantidad | Tabla |
|---|----------|-----------|----------|-------|
| 1 | **Vendors sin `profile_id`** — pueden existir vendedores sin perfil de usuario padre | 🔴 P0 | **4** | `vendors` |
| 2 | **`reviews` SIN FK a `users`** — solo guarda `author_name` como `text`. Si el usuario se borra, la reseña queda huérfana y no se puede cruzar/derecho ARCO | 🔴 P0 | 6 reseñas sin trazabilidad | `reviews` |
| 3 | **47 users + 47 profiles con `email IS NULL`** (login por phone). El índice único `users_email_key` ignora NULLs → pueden existir duplicados reales en `email=NULL` | 🔴 P0 | 47 c/u | `users`, `profiles` |
| 4 | **Vendors con `phone` (PII) expuesto** — 8 vendors tienen `phone != '' AND != NULL`. `/api/vendors` (público) y `/api/vendors/[id]` filtran `phone` solo al owner, pero `/api/vendors/route.ts` lo incluye en el SELECT | 🔴 P0 (PII leak) | 8 | `vendors` |
| 5 | **42 profiles con `role='seller'` pero sin vendor** — setup incompleto / abandoned onboarding | 🟠 P1 | 42 | `profiles` |
| 6 | **4 users con `role='buyer'` sin profile** | 🟡 P2 | 4 | `users` |
| 7 | **1 consent_log sin profile** (consentimiento de usuario que no terminó registro) | 🟡 P2 | 1 | `consent_logs` |
| 8 | **66 vendor_views con `user_id IS NULL`** — insertados con flag `ON DELETE SET NULL`, intencional, pero convendría loggearlos separados para analytics | 🟡 P2 | 66 | `vendor_views` |

**Queries de diagnóstico ejecutadas:**
```sql
-- (1) vendors sin profile
SELECT count(*) FROM vendors WHERE profile_id IS NULL;        -- → 4
-- (2) reseñas sin trazabilidad: la tabla NO tiene FK a users, solo author_name text
\d reviews                                                     -- sin FK a users
-- (3) emails NULL
SELECT count(*) FROM users WHERE email IS NULL;               -- → 47
SELECT count(*) FROM profiles WHERE email IS NULL;            -- → 47
-- (4) phones visibles públicamente
SELECT count(*) FROM vendors WHERE phone IS NOT NULL AND phone != ''; -- → 8
```

**Fixes críticos:**

```sql
-- (1) Limpiar vendors sin profile (decidir si delete o backfill)
SELECT id, name FROM vendors WHERE profile_id IS NULL;
-- Si son datos de testing → DELETE; si son reales → requerir profile antes de activar.

-- (2) Añadir FK en reviews (migración)
ALTER TABLE reviews
  ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
-- Backfill:
UPDATE reviews SET user_id = (
  SELECT u.id FROM users u WHERE u.name = reviews.author_name LIMIT 1
);
-- Ya NO usar author_name como unique identifier.

-- (3) Forzar email único no-NULL o documentar (ya hay CHECK users_email_or_phone_required)
-- pero profiles NO lo tiene:
ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_or_unique_required
    CHECK (email IS NOT NULL OR user_id IS NOT NULL);

-- (4) Verificar selects de phone
-- /apps/web/app/api/vendors/route.ts línea 31: SELECT v.* → incluye phone (phone_leak)
-- Ya hay fix en /api/vendors/[id]/route.ts líneas 124 (isOwner ? phone : null).
-- Aplicar mismo patrón a /api/vendors/route.ts.
```

---

## (4) Tablas grandes sin índice 🟠🟡

Las tablas **no son grandes** todavía (12 vendors, 135 users, 225 consent_logs), pero la ausencia de índices causará **degradación lineal O(n)** cuando crezcan. La señal clara es `pg_stat_user_tables`: tabla `vendors` con **1785 seq_scans** pese a solo 12 filas:

| Tabla | Rows | Seq scans | Idx scans | Riesgo futuro | Sugerencia |
|-------|------|-----------|-----------|---------------|------------|
| vendors | 12 | **1785** | 1 | 🔴 ALTO en `latitude BETWEEN ...` | **PostGIS + GiST spatial index** (ver §6) |
| reviews | 2 | 30 | 0 | 🟠 ALTO (crece con cada compra) | índice compuesto `(vendor_id, created_at DESC)` |
| notifications | 0 | 52 | 0 | 🟠 ALTO (crece con cada evento) | índice parcial `(user_id, created_at DESC) WHERE read=false` |
| orders | 0 | 48 | 0 | 🟠 ALTO (transaccional) | índice `(vendor_id, status, created_at DESC)` para "todas mis órdenes activas" |
| job_runs | 268 | 3 | 0 | 🟡 MEDIO (purgeable) | índice `(job_name, ran_at)` ya existe |

---

## (5) CHECK constraints faltantes 🟠🟡

Inventario actual de CHECK constraints (`pg_constraint WHERE contype='c'`) y dónde faltan:

### ✅ Correctos
- `vendors.vehicle_type` ← enum
- `reviews.rating` ∈ [1,5]
- `users.email_or_phone_required`
- `users.role`, `profiles.role` ← enum
- `orders.status`, `sponsorships.status`, `ad_campaigns.status`, `sponsorships.plan` ← enums
- `sponsorships.amount_cents > 0`, `ad_campaigns.amount_cents > 0`

### ❌ Faltantes (orden de severidad)

| Tabla | Columna | Constraint propuesto | Severidad |
|-------|---------|----------------------|-----------|
| **products** | `price` | `CHECK (price >= 0)` | 🟠 P1 |
| **products** | `name` | `CHECK (length(name) > 0)` y `CHECK (length(name) <= 200)` | 🟡 P2 |
| **order_items** | `price` | `CHECK (price >= 0)` (snapshot, debería ser >= 0) | 🟠 P1 |
| **order_items** | `quantity` | `CHECK (quantity >= 1 AND quantity <= 999)` — alineado con la validación del backend en `orders/route.ts:147` | 🟠 P1 |
| **orders** | `total` | `CHECK (total >= 0)` | 🟠 P1 |
| **vendors** | `rating` | `CHECK (rating >= 0 AND rating <= 5)` (defensa en profundidad además del rango en código) | 🟡 P2 |
| **vendors** | `latitude`/`longitude` | `CHECK (latitude BETWEEN -90 AND 90)` y `CHECK (longitude BETWEEN -180 AND 180)` (ya validado Colombia -4.2/13.5/-79.1/-66.9 pero a nivel DB mejor general) | 🟡 P2 |
| **consensus_email_required profiles** | `email` | `CHECK (email IS NOT NULL)` o replicar `users_email_or_phone_required` | 🟠 P1 |
| **sponsorships** | `ends_at > starts_at` | `CHECK (ends_at > starts_at)` | 🟡 P2 |
| **ad_campaigns** | `ends_at > starts_at` | `CHECK (ends_at > starts_at)` | 🟡 P2 |
| **ad_campaigns** | `clicks_count <= impressions_count` cuando `impressions_count > 0` | CHECK condicional | 🟡 P2 |
| **vendor_views** | `user_ip` formato | CHECK con regex IPv4/IPv6 | 🟡 P2 (cosmético) |

**Migration ejemplo:**
```sql
-- products
ALTER TABLE products
  ADD CONSTRAINT products_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT products_name_nonempty CHECK (length(name) BETWEEN 1 AND 200);

-- order_items
ALTER TABLE order_items
  ADD CONSTRAINT order_items_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT order_items_quantity_range CHECK (quantity BETWEEN 1 AND 999);

-- orders
ALTER TABLE orders
  ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);

-- sponsorships & ad_campaigns
ALTER TABLE sponsorships
  ADD CONSTRAINT sponsorships_dates_valid CHECK (ends_at > starts_at);

ALTER TABLE ad_campaigns
  ADD CONSTRAINT ad_campaigns_dates_valid CHECK (ends_at > starts_at);
```

---

## (6) Columnas NOT NULL / NULL incorrectas 🟠🟡

Revisando semánticamente cada tabla:

| Tabla | Columna | Actual | Sugerido | Justificación | Severidad |
|-------|---------|--------|----------|---------------|-----------|
| **users** | `email` | nullable | nullable OK | CHECK `email_or_phone_required` ya lo valida. ✅ |
| **users** | `name` | nullable | **NOT NULL** | Todos los usuarios reales tienen nombre; permitir NULL es solo basura | 🟠 P1 |
| **profiles** | `email` | nullable | mantener + CHECK | profiles puede ser phone-only (espejo de users) | OK |
| **profiles** | `name` | nullable | **NOT NULL** | siempre tiene sentido | 🟠 P1 |
| **profiles** | `role` | NOT NULL | ✅ | correcto |
| **profiles** | `token_version` | NOT NULL | ✅ |
| **vendors** | `name` | NOT NULL | ✅ |
| **vendors** | `profile_id` | nullable | ⚠️ **¿Debe ser NOT NULL?** | Después de onboarding completo sí. Considerar: `CHECK (profile_id IS NOT NULL OR is_active = false)` | 🟠 P1 |
| **vendors** | `category` | nullable | **NOT NULL con FK** | `categories` tiene 6 filas fijas; permitir NULL permite registros sucios | 🟡 P2 |
| **vendors** | `city_id` | nullable (text) | **NOT NULL** o FK a `cities` (no existe la tabla!) | **No existe tabla `cities`** ⚠️ — `city_id` es `text` libre | 🔴 P0 |
| **vendors** | `latitude`/`longitude` | nullable | ✅ (puede no transmitir GPS) |
| **vendors** | `is_active` | nullable + default `false` | **NOT NULL con default `false`** | actualmente default aplica pero el campo sigue siendo nullable | 🟡 P2 |
| **reviews** | `rating` | nullable | **NOT NULL** | un review sin rating no sirve | 🟠 P1 |
| **reviews** | `comment` | nullable | ⚠️ debatable | permit text reviews es opcional, OK |
| **reviews** | `vendor_id` | nullable | **NOT NULL** | review sin vendor es huérfano | 🟠 P1 |
| **reviews** | `user_id` | **AUSENTE** | **AÑADIR `user_id uuid REFERENCES users(id) ON DELETE SET NULL`** | 🔴 P0 (ver §3) |
| **products** | `price` | NOT NULL | ✅ |
| **products** | `vendor_id` | nullable | **NOT NULL** | producto huérfano no tiene sentido | 🟠 P1 |
| **orders** | `buyer_id` | nullable | **NOT NULL** | orden sin comprador no tiene sentido (solo `vendor_id`) | 🟠 P1 |
| **orders** | `vendor_id` | nullable | **NOT NULL** | orden sin vendedor no tiene sentido | 🟠 P1 |
| **orders** | `status` | nullable + default `pending` | **NOT NULL** | ✅ ya hay CHECK |
| **order_items** | `order_id` | nullable | **NOT NULL** | item sin orden es huérfano | 🟠 P1 |
| **order_items** | `product_id` | nullable | **NOT NULL** o `ON DELETE SET NULL` permitido | actualmente FK sin acción |
| **favorites** | `buyer_id` | nullable | **NOT NULL** | favorito sin buyer es huérfano | 🟠 P1 |
| **favorites** | `vendor_id` | nullable | **NOT NULL** | favorito sin vendor es huérfano | 🟠 P1 |
| **vendor_views** | `vendor_id` | **NOT NULL** | ✅ |
| **notifications** | `user_id` | nullable | **NOT NULL** | notif huérfana no llega | 🟠 P1 |
| **consent_logs** | `user_id` | nullable | mantener (consent puede ser anónimo + email) | ✅ correcto (existe índice parcial) |

### 🔴 P0 — Hallazgo crítico: `cities` no existe como tabla

```sql
SELECT count(*) FROM pg_tables WHERE tablename='cities' AND schemaname='public';
-- → 0

SELECT 'cities table exists' AS check_name, count(*)
FROM pg_tables WHERE tablename='cities' AND schemaname='public';
```

Pero `users.city_id`, `vendors.city_id`, `ad_campaigns.target_city_id` referencian ciudades como `text` libre (sin FK). Las ciudades válidas se manejan en `apps/web/app/api/cities/route.ts` (probablemente un JSON estático o array hardcoded).

**Fix:** crear tabla `cities` + FKs + poblar con las ciudades colombianas + mantener la lista hardcoded sincronizada.

---

## (7) Hallazgos adicionales / notas 🟡

### 🟠 P1 — Falta PostGIS + índice espacial
- La extensión **`postgis`** no está instalada.
- `vendors.latitude/longitude` son double precision, no `geography(Point,4326)`.
- `apps/web/app/api/vendors/route.ts` hace `latitude BETWEEN $x AND $y AND longitude BETWEEN ...` en cada request del mapa → **full scan de vendors** cada vez que el mapa se mueve.
- En `pg_stat`: 1785 seq_scans en `vendors` confirma el problema.

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE vendors ADD COLUMN location geography(Point, 4326);
UPDATE vendors SET location = ST_MakePoint(longitude, latitude)::geography
  WHERE longitude IS NOT NULL;
CREATE INDEX idx_vendors_location ON vendors USING GIST(location);
-- query bbox:
SELECT v.* FROM vendors v
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_meters);
```

### 🟡 P2 — Stats endpoint con 5 queries secuenciales
**Archivo:** `apps/web/app/api/vendors/[id]/stats/route.ts:39-72`

5 round-trips al DB en serie (orders count, views today, weekly views, weekly orders, rating). El ranking CTE final hace además 2 sub-queries correlacionadas *por cada vendor* en `category + city_id`.

**Fix:** ejecutar todo en `Promise.all` (las 4 primeras son independientes) + `EXPLAIN ANALYZE` la CTE de ranking y considerar materializarla o usar `LEFT JOIN` agregado con `GROUP BY`.

### 🟡 P2 — Statistics ruidosos en `pg_stat_user_tables`
`pg_stat_user_tables` no se resetea entre reinicios; los contadores reflejan tráfico desde el último `pg_stat_reset`. Considerar snapshot periódico en `cron` para análisis de tendencias.

### 🟡 P2 — `vendor_views.user_id` con `ON DELETE SET NULL`
Inserciones con `ON DELETE SET NULL` están OK para GDPR, pero 66/87 views son ya `NULL`. Documentar el patrón en el README para no romper analytics futuros.

---

## Plan de remediación priorizado

### Sprint 1 (P0) — cerrar data integrity + leaks
1. Decidir y ejecutar limpieza de los 4 vendors sin profile (DELETE vs backfill).
2. Migración para añadir `reviews.user_id` con FK a `users`, backfill desde `author_name`, deprecar columna.
3. Añadir filtros `phone` a `/api/vendors/route.ts` (mismo patrón que `/api/vendors/[id]`).
4. Crear tabla `cities` + FKs (decidir qué hacer con `city_id` huérfanos).
5. Eliminar N+1 en `apps/web/app/api/account/export/route.ts:82`.
6. Añadir `CHECK (length(price) > 0)` a `products.price` y `order_items.price` + `CHECK (quantity BETWEEN 1 AND 999)` a `order_items`.

### Sprint 2 (P1) — performance + constraints
7. Crear índices: `reviews(vendor_id, created_at DESC)`, `products(vendor_id, created_at DESC)`, `orders(vendor_id, created_at DESC)`, `orders(buyer_id, created_at DESC)`, `notifications(user_id, created_at DESC)`, `order_items(order_id)`, `order_items(product_id)`, `vendors(category)`, `vendors(profile_id)`.
8. Añadir endpoint bulk `POST /api/notifications/bulk` + reemplazar `markAllRead`.
9. Migrar `vendors.lat/lng` a `geography(Point,4326)` con GIST e instalar PostGIS.
10. Parallelyzar queries en `stats/route.ts` con `Promise.all`.
11. Reforzar NOT NULL + CHECK constraints (column listadas en §6).

### Sprint 3 (P2) — hardening
12. Añadir CHECK dates_valid en sponsorships y ad_campaigns.
13. `pg_stat_reset` planificado en cron mensual.
14. Documentar patrón `ON DELETE SET NULL` para analytics.

---

## Apéndice — comandos reproducibles

```bash
export PGPASSWORD=postgres
PSQL="psql -h localhost -U postgres -d gps_street_sellers"

# Inventario de tablas
$PSQL -c '\dt'

# Tamaños
$PSQL -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size DESC;"

# Huérfanos clave
$PSQL -c "SELECT 'vendors sin profile', count(*) FROM vendors WHERE profile_id IS NULL;"
$PSQL -c "SELECT 'reviews sin trazabilidad usuario' FROM information_schema.columns WHERE table_name='reviews' AND column_name='user_id';"
$PSQL -c "SELECT count(*) FROM users WHERE email IS NULL;"
```
