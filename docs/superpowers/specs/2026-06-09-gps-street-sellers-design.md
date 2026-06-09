# GPS Street Sellers — Especificación de Diseño

## 1. Concepto y Visión

**GPS Street Sellers** es una plataforma que conecta vendedores informales de calle con consumidores cercanos usando geolocalización en tiempo real. El mercado principal es Colombia (inicialmente Bogotá), donde los vendedores informales representan ~47% de la fuerza laboral.

La experiencia debe sentirse **cercana, vibrante y humana** — no tech frío. Evoca mercados latinoamericanos con colores cálidos y una interfaz accesible para usuarios de todos los niveles.

---

## 2. Stack Técnico

| Capa | Tecnología |
|------|------------|
| **Web** | Next.js 14 (App Router) + Tailwind CSS |
| **Mapas** | React-Leaflet + OpenStreetMap (gratuito) |
| **Estado global** | Zustand |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Mobile** | Expo (futuro, compartido via packages/core) |

### Estructura de Monorepo
```
gps-street-sellers/
├── apps/
│   ├── web/                    # Next.js App Router
│   └── mobile/                 # Expo (futuro)
├── packages/
│   └── core/                   # Tipos, hooks, utils compartidos
├── supabase/
│   └── migrations/             # SQL migrations
└── docs/
```

---

## 3. Usuarios y Flujos Principales

### Vendedor (Vendor)
1. **Registro/Onboarding** — Nombre, tipo de productos, foto, ubicación habitual
2. **Dashboard** — Toggle activo/inactivo, métricas (clientes viendo, rating), reseñas
3. **Editar perfil** — Datos, productos, foto

### Comprador (Customer)
1. **Mapa principal** — Pins de vendedores activos por categoría
2. **Filtros** — Por categoría, por distancia (500m, 1km, 2km)
3. **Detalle vendedor** — Info, productos, reseñas, botón "Notificarme cuando esté cerca"
4. **Favoritos** — Hasta 10 vendedores favoritos

---

## 4. Pantallas MVP

| # | Pantalla | Usuario |
|---|----------|---------|
| 1 | Splash / Onboarding (2-3 slides) | Ambos |
| 2 | Login / Registro (email) | Ambos |
| 3 | Selección de rol: Vendedor / Comprador | Ambos |
| 4 | Mapa principal con vendedores activos | Comprador |
| 5 | Detalle de vendedor | Comprador |
| 6 | Dashboard del vendedor | Vendedor |
| 7 | Editar perfil del vendedor | Vendedor |
| 8 | Configuración / Preferencias | Ambos |

---

## 5. Diseño Visual

### Paleta de Colores
| Rol | Color |
|-----|-------|
| Primario | Naranja/amarillo vivo (`#F59E0B`, `#FBBF24`) |
| Secundario | Verde esmeralda (`#10B981`) |
| Fondo | Blanco cálido / crema (`#FFFBEB`, `#FEF3C7`) |
| Texto | Gris oscuro (`#1F2937`) |
| Acento | Rojo coral (`#EF4444`) para alertas |

### Tipografía
- **Display/Títulos:** Fraunces o Playfair Display (expresiva, con carácter latino)
- **Cuerpo:** Sans-serif limpia (Inter o similar)

### Íconos de Categoría (diseños custom por categoría)
- Frutas, Comida caliente, Bebidas, Artesanías, Ropa, Otros

### Animaciones
- Transición suave al abrir cards de vendedores
- Pulso animado en pin cuando vendedor actualiza ubicación

---

## 6. Reglas de Negocio

1. **Visibilidad en mapa:** Vendedor debe estar "activo" + GPS actualizado en los últimos **5 minutos**
2. **Frecuencia GPS:** Vendedor activo envía ubicación cada **15-30 segundos**
3. **Rating:** Promedio de todas las reseñas (escala 1-5 estrellas)
4. **Favoritos:** Máximo **10** por comprador
5. **Notificaciones:** Solo si usuario las habilitó explícitamente

---

## 7. Estructura de Datos (Supabase/PostgreSQL)

```sql
-- Perfiles de usuario (extensión de auth.users)
profiles (id, email, role, full_name, avatar_url, created_at)

-- Vendedores
vendors (id, user_id, name, category, description, photo_url, is_active, rating_avg, created_at)

-- Ubicación en tiempo real
vendor_locations (id, vendor_id, lat, lng, updated_at)

-- Productos
products (id, vendor_id, name, description, photo_url, price)

-- Reseñas
reviews (id, vendor_id, customer_id, rating, comment, created_at)

-- Favoritos
favorites (id, customer_id, vendor_id, created_at)

-- Preferencias de notificación
notification_prefs (id, customer_id, categories[], max_distance_meters, enabled)
```

---

## 8. Flujo de Datos en Tiempo Real

1. Vendedor activa toggle → app envía GPS cada 15-30s → `vendor_locations`
2. Comprador abre mapa → suscribe a cambios realtime en `vendor_locations`
3. Si GPS > 5 min sin actualizar → pin desaparece automáticamente
4. Seller dashboard → métricas desde `reviews` + conteo de favoritos

---

## 9. Implementación en Fases

### Fase 1: Buyer Web (Core del producto)
- Onboarding + Auth + Mapa + Filtros + Detalle vendedor

### Fase 2: Seller Web
- Dashboard + Toggle activo/inactivo + Editar perfil

### Fase 3: Realtime + Notificaciones
- GPS tracking + Push notifications + Favoritos

### Fase 4: Mobile (Expo)
- Compartiendo packages/core con web

---

## 10. Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Mapas (opcional, Leaflet es gratis)
# No se requiere API key para OSM
```

---

## 11. Criterios de Éxito MVP

- Mapa muestra vendedores activos con pins por categoría
- Filtros de categoría y distancia funcionan
- Vendedor puede activar/desactivar presencia
- Navegación completa entre todas las 8 pantallas
- Diseño visual coherente y vibrante
- Datos mock para demo sin backend real