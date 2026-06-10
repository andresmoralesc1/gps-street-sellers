# GPS Street Sellers

Plataforma que conecta vendedores informales de calle con consumidores cercanos usando geolocalización en tiempo real.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp apps/web/.env.example apps/web/.env.local

# Editar .env.local con tus credenciales de Supabase

# Iniciar desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`

### Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 📁 Estructura del Proyecto

```
gps-street-sellers/
├── apps/
│   └── web/              # Next.js 14 App Router
├── packages/
│   └── core/             # Tipos y utilidades compartidas
└── docs/
```

## 🎨 Stack Técnico

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Mapas:** React-Leaflet + OpenStreetMap
- **Estado:** Zustand
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Mobile:** Expo (próximamente)

## 📱 Pantallas

1. **Onboarding** - 3 slides de introducción
2. **Login/Registro** - Autenticación por email
3. **Selección de rol** - Buyer o Seller
4. **Mapa (Buyer)** - Vendedores activos en el mapa
5. **Detalle vendedor** - Perfil, productos, reseñas
6. **Dashboard (Seller)** - Toggle activo/inactivo, métricas
7. **Editar perfil** - Datos y productos del vendedor
8. **Configuración** - Notificaciones y preferencias

## 📋 Reglas de Negocio

- Vendedores activos con GPS < 5 min aparecen en el mapa
- Frecuencia de GPS: cada 15-30 segundos
- Máximo 10 favoritos por comprador
- Notificaciones solo si el usuario las habilita

## 🔜 Roadmap

- [ ] Realtime GPS tracking
- [ ] Push notifications
- [ ] Mobile app (Expo)
- [ ] Pagos integrados