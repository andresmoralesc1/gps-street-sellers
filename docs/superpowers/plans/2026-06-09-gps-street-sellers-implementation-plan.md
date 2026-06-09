# GPS Street Sellers — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir MVP web completo de GPS Street Sellers con mapa interactivo, flujo buyer/seller, y datos mock.

**Architecture:** Monorepo con Next.js 14 (App Router) + Tailwind. Mapa con React-Leaflet + OSM. Estado con Zustand. Supabase para auth y datos (mock para MVP). Estructura: apps/web + packages/core.

**Tech Stack:** Next.js 14, Tailwind CSS, React-Leaflet, Zustand, Supabase (mock), TypeScript.

---

## Estructura de Archivos

```
gps-street-sellers/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/           # Login, Registro, Onboarding
│       │   │   ├── onboarding/
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   └── role-select/
│       │   ├── (buyer)/          # Mapa, Detalle vendedor
│       │   │   ├── map/
│       │   │   └── vendor/[id]/
│       │   ├── (seller)/          # Dashboard, Editar perfil
│       │   │   ├── dashboard/
│       │   │   └── profile/edit/
│       │   ├── settings/          # Configuración común
│       │   ├── layout.tsx
│       │   └── page.tsx          # Splash redirect
│       ├── components/
│       │   ├── map/
│       │   │   ├── MapView.tsx
│       │   │   ├── VendorPin.tsx
│       │   │   └── VendorCard.tsx
│       │   ├── vendor/
│       │   │   ├── VendorProfile.tsx
│       │   │   ├── VendorProducts.tsx
│       │   │   └── VendorReviews.tsx
│       │   ├── seller/
│       │   │   ├── SellerDashboard.tsx
│       │   │   └── ActiveToggle.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Input.tsx
│       │       ├── Card.tsx
│       │       └── Badge.tsx
│       ├── lib/
│       │   ├── supabase/
│       │   │   └── client.ts
│       │   └── utils.ts
│       ├── store/
│       │   └── useStore.ts
│       └── types/
│           └── index.ts
├── packages/
│   └── core/
│       ├── types/
│       │   └── index.ts
│       ├── constants/
│       │   └── categories.ts
│       └── utils/
│           └── geo.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── package.json
└── README.md
```

---

## Tarea 1: Configuración del Proyecto

**Archivos:**
- Crear: `package.json` (raíz monorepo)
- Crear: `apps/web/package.json`
- Crear: `apps/web/next.config.js`
- Crear: `apps/web/tailwind.config.ts`
- Crear: `apps/web/tsconfig.json`
- Crear: `apps/web/.env.local`
- Crear: `packages/core/package.json`
- Crear: `packages/core/tsconfig.json`

- [ ] **Paso 1: Crear package.json raíz**

```json
{
  "name": "gps-street-sellers",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "cd apps/web && npm run dev",
    "build": "cd apps/web && npm run build"
  }
}
```

- [ ] **Paso 2: Crear apps/web/package.json**

```json
{
  "name": "@gps-street-sellers/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4",
    "zustand": "^4.5.0",
    "@supabase/supabase-js": "^2.43.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/leaflet": "^1.9.8",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19"
  }
}
```

- [ ] **Paso 3: Crear tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        secondary: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        background: {
          cream: '#FFFBEB',
          warm: '#FEF3C7',
        },
        accent: '#EF4444',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Paso 4: Crear apps/web/.env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Paso 5: Crear packages/core/package.json**

```json
{
  "name": "@gps-street-sellers/core",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./constants": "./dist/constants/index.js"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Paso 6: Commit**

```bash
git add package.json apps/web/package.json apps/web/tailwind.config.ts apps/web/.env.local packages/core/package.json
git commit -m "feat: setup monorepo structure with Next.js 14 and Tailwind"
```

---

## Tarea 2: Tipos y Constantes Compartidas

**Archivos:**
- Crear: `packages/core/types/index.ts`
- Crear: `packages/core/constants/categories.ts`
- Crear: `packages/core/utils/geo.ts`
- Crear: `apps/web/types/index.ts`
- Crear: `apps/web/lib/utils.ts`

- [ ] **Paso 1: Crear packages/core/types/index.ts**

```typescript
export type UserRole = 'buyer' | 'seller'

export type VendorCategory =
  | 'frutas'
  | 'comida'
  | 'bebidas'
  | 'artesanias'
  | 'ropa'
  | 'otros'

export interface Vendor {
  id: string
  userId: string
  name: string
  category: VendorCategory
  description: string
  photoUrl: string
  isActive: boolean
  ratingAvg: number
  createdAt: string
}

export interface VendorLocation {
  id: string
  vendorId: string
  lat: number
  lng: number
  updatedAt: string
}

export interface Product {
  id: string
  vendorId: string
  name: string
  description: string
  photoUrl: string
  price: number
}

export interface Review {
  id: string
  vendorId: string
  customerId: string
  rating: number
  comment: string
  createdAt: string
}

export interface Favorite {
  id: string
  customerId: string
  vendorId: string
  createdAt: string
}

export interface NotificationPrefs {
  id: string
  customerId: string
  categories: VendorCategory[]
  maxDistanceMeters: number
  enabled: boolean
}

export interface VendorWithLocation extends Vendor {
  location: VendorLocation
  distance?: number
}
```

- [ ] **Paso 2: Crear packages/core/constants/categories.ts**

```typescript
import type { VendorCategory } from '../types'

export interface CategoryInfo {
  id: VendorCategory
  label: string
  icon: string
  color: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'frutas', label: 'Frutas', icon: '🍎', color: '#10B981' },
  { id: 'comida', label: 'Comida caliente', icon: '🍔', color: '#F59E0B' },
  { id: 'bebidas', label: 'Bebidas', icon: '🥤', color: '#3B82F6' },
  { id: 'artesanias', label: 'Artesanías', icon: '🎨', color: '#8B5CF6' },
  { id: 'ropa', label: 'Ropa', icon: '👕', color: '#EC4899' },
  { id: 'otros', label: 'Otros', icon: '📦', color: '#6B7280' },
]

export const getCategoryInfo = (id: VendorCategory): CategoryInfo => {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[5]
}
```

- [ ] **Paso 3: Crear packages/core/utils/geo.ts**

```typescript
/**
 * Calcula distancia entre dos puntos usando fórmula de Haversine
 * @returns distancia en metros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Filtra vendedores por distancia máxima
 */
export function filterByDistance<T extends { lat: number; lng: number }>(
  items: T[],
  userLat: number,
  userLng: number,
  maxDistanceMeters: number
): T[] {
  return items.filter(item => {
    const dist = calculateDistance(userLat, userLng, item.lat, item.lng)
    return dist <= maxDistanceMeters
  })
}
```

- [ ] **Paso 4: Crear apps/web/types/index.ts**

```typescript
// Re-exportar tipos del core
export type {
  UserRole,
  VendorCategory,
  Vendor,
  VendorLocation,
  Product,
  Review,
  Favorite,
  NotificationPrefs,
  VendorWithLocation,
} from '@gps-street-sellers/core/types'
```

- [ ] **Paso 5: Commit**

```bash
git add packages/core/types/index.ts packages/core/constants/categories.ts packages/core/utils/geo.ts apps/web/types/index.ts
git commit -m "feat: add shared types, categories, and geo utilities"
```

---

## Tarea 3: Componentes UI Base

**Archivos:**
- Crear: `apps/web/components/ui/Button.tsx`
- Crear: `apps/web/components/ui/Input.tsx`
- Crear: `apps/web/components/ui/Card.tsx`
- Crear: `apps/web/components/ui/Badge.tsx`

- [ ] **Paso 1: Crear apps/web/components/ui/Button.tsx**

```typescript
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'rounded-lg font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        {
          'bg-primary text-white hover:bg-primary-dark active:scale-95': variant === 'primary',
          'bg-secondary text-white hover:bg-secondary-dark active:scale-95': variant === 'secondary',
          'border-2 border-primary text-primary hover:bg-primary hover:text-white': variant === 'outline',
          'text-gray-600 hover:bg-gray-100': variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Paso 2: Crear apps/web/components/ui/Input.tsx**

```typescript
import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full px-4 py-2 rounded-lg border border-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'placeholder:text-gray-400',
          error && 'border-accent focus:ring-accent',
          className
        )}
        {...props}
      />
      {error && <span className="text-sm text-accent">{error}</span>}
    </div>
  )
}
```

- [ ] **Paso 3: Crear apps/web/components/ui/Card.tsx**

```typescript
import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-white p-4',
        {
          'shadow-md': variant === 'elevated',
          'border border-gray-200': variant === 'outlined',
          'shadow-sm': variant === 'default',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

- [ ] **Paso 4: Crear apps/web/components/ui/Badge.tsx**

```typescript
import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-primary/10 text-primary': variant === 'primary',
          'bg-secondary/10 text-secondary': variant === 'secondary',
          'border border-current': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
```

- [ ] **Paso 5: Commit**

```bash
git add apps/web/components/ui/Button.tsx apps/web/components/ui/Input.tsx apps/web/components/ui/Card.tsx apps/web/components/ui/Badge.tsx
git commit -m "feat: add base UI components (Button, Input, Card, Badge)"
```

---

## Tarea 4: Store de Estado Global (Zustand)

**Archivos:**
- Crear: `apps/web/store/useStore.ts`

- [ ] **Paso 1: Crear apps/web/store/useStore.ts**

```typescript
import { create } from 'zustand'
import type { Vendor, VendorCategory, UserRole } from '@/types'

interface User {
  id: string
  email: string
  role: UserRole | null
  fullName: string
  avatarUrl: string
}

interface Filters {
  category: VendorCategory | null
  maxDistanceMeters: number
}

interface AppState {
  // Usuario
  user: User | null
  setUser: (user: User | null) => void

  // Vendedores (mock data)
  vendors: Vendor[]
  setVendors: (vendors: Vendor[]) => void

  // Filtros del mapa
  filters: Filters
  setFilters: (filters: Partial<Filters>) => void

  // Favoritos
  favoriteIds: string[]
  addFavorite: (vendorId: string) => void
  removeFavorite: (vendorId: string) => void

  // Ubicación del usuario
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (location: { lat: number; lng: number } | null) => void

  // Estado del vendedor
  isSellerActive: boolean
  setSellerActive: (active: boolean) => void

  // UI
  selectedVendorId: string | null
  setSelectedVendorId: (id: string | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  // Usuario
  user: null,
  setUser: (user) => set({ user }),

  // Vendedores
  vendors: [],
  setVendors: (vendors) => set({ vendors }),

  // Filtros
  filters: {
    category: null,
    maxDistanceMeters: 2000,
  },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  // Favoritos
  favoriteIds: [],
  addFavorite: (vendorId) =>
    set((state) => {
      if (state.favoriteIds.length >= 10) return state
      if (state.favoriteIds.includes(vendorId)) return state
      return { favoriteIds: [...state.favoriteIds, vendorId] }
    }),
  removeFavorite: (vendorId) =>
    set((state) => ({
      favoriteIds: state.favoriteIds.filter((id) => id !== vendorId),
    })),

  // Ubicación
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),

  // Seller activo
  isSellerActive: false,
  setSellerActive: (active) => set({ isSellerActive: active }),

  // UI
  selectedVendorId: null,
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),
}))
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/store/useStore.ts
git commit -m "feat: add Zustand store for global state management"
```

---

## Tarea 5: Mock Data

**Archivos:**
- Crear: `apps/web/lib/mockData.ts`

- [ ] **Paso 1: Crear apps/web/lib/mockData.ts**

```typescript
import type { Vendor, Product, Review, VendorLocation } from '@gps-street-sellers/core/types'

// Ubicaciones en Bogotá (coordenadas aproximadas)
const BOGOTA_CENTER = { lat: 4.6097, lng: -74.0817 }

// Vendedores mock con ubicaciones en Bogotá
export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1',
    userId: 'u1',
    name: 'Don的水果摊',
    category: 'frutas',
    description: 'Frutas frescas del día, directo del mercado.',
    photoUrl: 'https://images.unsplash.com/photo-1595855759920-9b5a9f0e2e0e?w=400',
    isActive: true,
    ratingAvg: 4.5,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'v2',
    userId: 'u2',
    name: 'María Comidas',
    category: 'comida',
    description: 'Empanadas, arepas y algo más. ¡Pruébelas!',
    photoUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
    isActive: true,
    ratingAvg: 4.8,
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: 'v3',
    userId: 'u3',
    name: 'Bebidas Frías',
    category: 'bebidas',
    description: 'Jugos naturales, aguapanela y más.',
    photoUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
    isActive: true,
    ratingAvg: 4.2,
    createdAt: '2024-03-05T09:15:00Z',
  },
  {
    id: 'v4',
    userId: 'u4',
    name: 'Artesanías Zulu',
    category: 'artesanias',
    description: 'Artefactos tejidos a mano, recuerdos únicos.',
    photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    isActive: false,
    ratingAvg: 4.9,
    createdAt: '2024-01-10T11:45:00Z',
  },
  {
    id: 'v5',
    userId: 'u5',
    name: 'Ropa Vintage',
    category: 'ropa',
    description: 'Camisetas y jeans únicos.',
    photoUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
    isActive: true,
    ratingAvg: 4.6,
    createdAt: '2024-04-01T16:00:00Z',
  },
]

export const MOCK_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  v1: { lat: 4.6110, lng: -74.0830 },
  v2: { lat: 4.6085, lng: -74.0795 },
  v3: { lat: 4.6105, lng: -74.0850 },
  v4: { lat: 4.6070, lng: -74.0800 },
  v5: { lat: 4.6090, lng: -74.0760 },
}

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', vendorId: 'v1', name: 'Mango', description: 'Mango maduro', photoUrl: '', price: 2000 },
  { id: 'p2', vendorId: 'v1', name: 'Papaya', description: 'Papaya fresca', photoUrl: '', price: 3000 },
  { id: 'p3', vendorId: 'v2', name: 'Empanada', description: 'Empanada de pollo', photoUrl: '', price: 2500 },
  { id: 'p4', vendorId: 'v2', name: 'Arepa', description: 'Arepa con queso', photoUrl: '', price: 1500 },
  { id: 'p5', vendorId: 'v3', name: 'Jugo de naranja', description: 'Natural', photoUrl: '', price: 3000 },
]

export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', vendorId: 'v1', customerId: 'c1', rating: 5, comment: 'Excelente fruta', createdAt: '2024-05-01' },
  { id: 'r2', vendorId: 'v1', customerId: 'c2', rating: 4, comment: 'Muy bueno', createdAt: '2024-05-02' },
  { id: 'r3', vendorId: 'v2', customerId: 'c3', rating: 5, comment: 'Las mejores empanadas', createdAt: '2024-05-03' },
]

export function getVendorLocation(vendorId: string): VendorLocation | null {
  const loc = MOCK_LOCATIONS[vendorId]
  if (!loc) return null
  return {
    id: `loc-${vendorId}`,
    vendorId,
    lat: loc.lat,
    lng: loc.lng,
    updatedAt: new Date().toISOString(),
  }
}

export function getVendorProducts(vendorId: string): Product[] {
  return MOCK_PRODUCTS.filter((p) => p.vendorId === vendorId)
}

export function getVendorReviews(vendorId: string): Review[] {
  return MOCK_REVIEWS.filter((r) => r.vendorId === vendorId)
}

export function getActiveVendors(): Vendor[] {
  return MOCK_VENDORS.filter((v) => v.isActive)
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/lib/mockData.ts
git commit -m "feat: add mock data for vendors, products, and reviews"
```

---

## Tarea 6: Layout Principal y Providers

**Archivos:**
- Crear: `apps/web/app/layout.tsx`
- Crear: `apps/web/app/globals.css`
- Crear: `apps/web/app/providers.tsx`

- [ ] **Paso 1: Crear apps/web/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

@layer base {
  html {
    font-family: 'Inter', sans-serif;
  }

  h1, h2, h3, h4 {
    font-family: 'Fraunces', serif;
  }
}

@layer components {
  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 0.75rem;
  }
}
```

- [ ] **Paso 2: Crear apps/web/app/providers.tsx**

```typescript
'use client'

import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Paso 3: Crear apps/web/app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'GPS Street Sellers',
  description: 'Conecta con vendedores informales cercanos a ti',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-background-cream min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Paso 4: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/globals.css apps/web/app/providers.tsx
git commit -m "feat: add root layout with fonts and global styles"
```

---

## Tarea 7: Página Splash y Redirect

**Archivos:**
- Crear: `apps/web/app/page.tsx`

- [ ] **Paso 1: Crear apps/web/app/page.tsx**

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/onboarding')
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: add splash page redirect to onboarding"
```

---

## Tarea 8: Onboarding (3 slides)

**Archivos:**
- Crear: `apps/web/app/(auth)/onboarding/page.tsx`
- Crear: `apps/web/app/(auth)/onboarding/components/OnboardingSlider.tsx`

- [ ] **Paso 1: Crear apps/web/app/(auth)/onboarding/components/OnboardingSlider.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const SLIDES = [
  {
    title: 'Encuentra vendedores cercanos',
    description: 'Descubre vendedores informales cerca de ti en tiempo real',
    emoji: '📍',
  },
  {
    title: 'Activa tu negocio',
    description: 'Como vendedor, muestra tu ubicación y reach más clientes',
    emoji: '🛒',
  },
  {
    title: 'Califica y favorito',
    description: 'Guarda tus vendedores favoritos y recíbelo cuando esté cerca',
    emoji: '❤️',
  },
]

interface OnboardingSliderProps {
  onComplete: () => void
}

export function OnboardingSlider({ onComplete }: OnboardingSliderProps) {
  const [current, setCurrent] = useState(0)

  const next = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1)
    } else {
      onComplete()
    }
  }

  const slide = SLIDES[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-8xl mb-8">{slide.emoji}</div>
      <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
        {slide.title}
      </h1>
      <p className="text-lg text-gray-600 text-center mb-12">
        {slide.description}
      </p>

      {/* Dots */}
      <div className="flex gap-2 mb-12">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === current ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <Button onClick={next} size="lg">
        {current === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
      </Button>
    </div>
  )
}
```

- [ ] **Paso 2: Crear apps/web/app/(auth)/onboarding/page.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { OnboardingSlider } from './components/OnboardingSlider'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/login')
  }

  return <OnboardingSlider onComplete={handleComplete} />
}
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/app/\(auth\)/onboarding/page.tsx apps/web/app/\(auth\)/onboarding/components/OnboardingSlider.tsx
git commit -m "feat: add onboarding screen with 3 slides"
```

---

## Tarea 9: Login y Registro

**Archivos:**
- Crear: `apps/web/app/(auth)/login/page.tsx`
- Crear: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Paso 1: Crear apps/web/app/(auth)/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mock login - siempre succeeds
    setUser({
      id: 'user-1',
      email,
      role: null,
      fullName: 'Usuario Demo',
      avatarUrl: '',
    })

    router.push('/role-select')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Bienvenido</h1>
        <p className="text-gray-600 text-center mb-8">
          Ingresa a tu cuenta para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="text-accent text-sm">{error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary font-semibold">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  )
}
```

- [ ] **Paso 2: Crear apps/web/app/(auth)/register/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mock register - siempre succeeds
    setUser({
      id: 'user-new',
      email,
      role: null,
      fullName,
      avatarUrl: '',
    })

    router.push('/role-select')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Crear Cuenta</h1>
        <p className="text-gray-600 text-center mb-8">
          Regístrate para comenzar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="text-accent text-sm">{error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Crear Cuenta
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary font-semibold">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
```

- [ ] **Paso 3: Commit**

```bash
git add apps/web/app/\(auth\)/login/page.tsx apps/web/app/\(auth\)/register/page.tsx
git commit -m "feat: add login and register pages"
```

---

## Tarea 10: Selección de Rol

**Archivos:**
- Crear: `apps/web/app/(auth)/role-select/page.tsx`

- [ ] **Paso 1: Crear apps/web/app/(auth)/role-select/page.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'
import type { UserRole } from '@/types'

export default function RoleSelectPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const user = useStore((s) => s.user)

  const selectRole = (role: UserRole) => {
    if (!user) return

    setUser({ ...user, role })

    if (role === 'buyer') {
      router.push('/map')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-2">¿Cómo quieres usar la app?</h1>
        <p className="text-gray-600 text-center mb-12">
          Elige tu rol principal
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Opción Comprador */}
          <Card
            variant="elevated"
            className="cursor-pointer hover:scale-105 transition-transform p-8 text-center"
            onClick={() => selectRole('buyer')}
          >
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold mb-2">Comprador</h2>
            <p className="text-gray-600 text-sm">
              Encuentra vendedores cercanos a ti
            </p>
          </Card>

          {/* Opción Vendedor */}
          <Card
            variant="elevated"
            className="cursor-pointer hover:scale-105 transition-transform p-8 text-center"
            onClick={() => selectRole('seller')}
          >
            <div className="text-6xl mb-4">📍</div>
            <h2 className="text-xl font-bold mb-2">Vendedor</h2>
            <p className="text-gray-600 text-sm">
              Muestra tu ubicación y reach más clientes
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/app/\(auth\)/role-select/page.tsx
git commit -m "feat: add role selection page"
```

---

## Tarea 11: Mapa Principal (Comprador)

**Archivos:**
- Crear: `apps/web/app/(buyer)/map/page.tsx`
- Crear: `apps/web/components/map/MapView.tsx`
- Crear: `apps/web/components/map/VendorPin.tsx`
- Crear: `apps/web/components/map/VendorCard.tsx`
- Crear: `apps/web/components/map/FilterBar.tsx`

- [ ] **Paso 1: Crear apps/web/components/map/MapView.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { VendorPin } from './VendorPin'
import { VendorCard } from './VendorCard'
import { useStore } from '@/store/useStore'
import { MOCK_VENDORS, MOCK_LOCATIONS, getActiveVendors } from '@/lib/mockData'
import type { Vendor } from '@gps-street-sellers/core/types'
import type { LatLng } from 'leaflet'

// Fix para íconos de Leaflet en Next.js
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [map, center])
  return null
}

const BOGOTA_CENTER: [number, number] = [4.6097, -74.0817]

export function MapView() {
  const [center, setCenter] = useState<[number, number]>(BOGOTA_CENTER)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const filters = useStore((s) => s.filters)
  const userLocation = useStore((s) => s.userLocation)

  useEffect(() => {
    // Simular ubicación del usuario (Bogotá)
    if (!userLocation) {
      useStore.getState().setUserLocation({ lat: 4.6097, lng: -74.0817 })
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      setCenter([userLocation.lat, userLocation.lng])
    }
  }, [userLocation])

  const activeVendors = getActiveVendors().filter((v) => {
    if (filters.category && v.category !== filters.category) return false
    return true
  })

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={15}
        className="w-full h-full rounded-xl"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={{ lat: center[0], lng: center[1] } as LatLng} />

        {activeVendors.map((vendor) => {
          const loc = MOCK_LOCATIONS[vendor.id]
          if (!loc) return null

          return (
            <Marker
              key={vendor.id}
              position={[loc.lat, loc.lng]}
              eventHandlers={{
                click: () => setSelectedVendor(vendor),
              }}
            >
              <Popup>
                <VendorCard vendor={vendor} compact />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Vendor Card Overlay */}
      {selectedVendor && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <VendorCard
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
            onViewDetails={() => {
              window.location.href = `/vendor/${selectedVendor.id}`
            }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Crear apps/web/components/map/VendorPin.tsx**

```typescript
'use client'

import L from 'leaflet'
import type { VendorCategory } from '@gps-street-sellers/core/types'
import { getCategoryInfo } from '@gps-street-sellers/core/constants'

interface VendorPinProps {
  category: VendorCategory
  isActive: boolean
}

export function createVendorIcon(category: VendorCategory, isActive: boolean): L.DivIcon {
  const info = getCategoryInfo(category)
  const pulseClass = isActive ? 'animate-pulse' : ''

  return L.divIcon({
    className: 'vendor-pin',
    html: `
      <div style="
        background: ${info.color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isActive ? 'animation: pulse 2s infinite;' : ''}
      ">
        ${info.icon}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}
```

- [ ] **Paso 3: Crear apps/web/components/map/VendorCard.tsx**

```typescript
'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Vendor } from '@gps-street-sellers/core/types'
import { getCategoryInfo } from '@gps-street-sellers/core/constants'

interface VendorCardProps {
  vendor: Vendor
  compact?: boolean
  onClose?: () => void
  onViewDetails?: () => void
}

export function VendorCard({ vendor, compact, onClose, onViewDetails }: VendorCardProps) {
  const category = getCategoryInfo(vendor.category)

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>
        <div>
          <h3 className="font-semibold">{vendor.name}</h3>
          <p className="text-sm text-gray-500">{category.label}</p>
        </div>
      </div>
    )
  }

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex gap-4">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{vendor.name}</h3>
              <Badge variant="primary">{category.label}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{vendor.ratingAvg.toFixed(1)}</span>
            </div>
          </div>

          <p className="text-gray-600 mt-2 text-sm line-clamp-2">
            {vendor.description}
          </p>

          <div className="flex gap-2 mt-3">
            {onViewDetails && (
              <Button size="sm" onClick={onViewDetails}>
                Ver detalles
              </Button>
            )}
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Paso 4: Crear apps/web/components/map/FilterBar.tsx**

```typescript
'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@gps-street-sellers/core/constants'
import type { VendorCategory } from '@gps-street-sellers/core/types'

const DISTANCES = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
]

export function FilterBar() {
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setFilters({ category: null })}
          className={clsx(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            filters.category === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Todos
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilters({ category: cat.id as VendorCategory })}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filters.category === cat.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            style={filters.category === cat.id ? { background: cat.color } : {}}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Distancia */}
      <div className="flex gap-2">
        {DISTANCES.map((dist) => (
          <button
            key={dist.value}
            onClick={() => setFilters({ maxDistanceMeters: dist.value })}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filters.maxDistanceMeters === dist.value
                ? 'bg-secondary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            📍 {dist.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Paso 5: Crear apps/web/app/(buyer)/map/page.tsx**

```typescript
'use client'

import dynamic from 'next/dynamic'
import { FilterBar } from '@/components/map/FilterBar'
import { useStore } from '@/store/useStore'
import { useEffect } from 'react'

// Dynamic import para evitar SSR con Leaflet
const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-200 animate-pulse rounded-xl" /> }
)

export default function MapPage() {
  const setVendors = useStore((s) => s.setVendors)
  const { MOCK_VENDORS } = require('@/lib/mockData')

  useEffect(() => {
    setVendors(MOCK_VENDORS)
  }, [setVendors])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-800">GPS Street Sellers</h1>
      </header>

      {/* Filtros */}
      <div className="px-4 pt-4">
        <FilterBar />
      </div>

      {/* Mapa */}
      <div className="flex-1 px-4 pb-4">
        <MapView />
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <button className="flex flex-col items-center text-primary">
          <span className="text-2xl">🗺️</span>
          <span className="text-xs">Mapa</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">❤️</span>
          <span className="text-xs">Favoritos</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </button>
      </nav>
    </div>
  )
}
```

- [ ] **Paso 6: Commit**

```bash
git add apps/web/components/map/MapView.tsx apps/web/components/map/VendorPin.tsx apps/web/components/map/VendorCard.tsx apps/web/components/map/FilterBar.tsx apps/web/app/\(buyer\)/map/page.tsx
git commit -m "feat: add buyer map page with vendor pins and filters"
```

---

## Tarea 12: Detalle de Vendedor

**Archivos:**
- Crear: `apps/web/app/(buyer)/vendor/[id]/page.tsx`
- Crear: `apps/web/components/vendor/VendorProfile.tsx`
- Crear: `apps/web/components/vendor/VendorProducts.tsx`
- Crear: `apps/web/components/vendor/VendorReviews.tsx`

- [ ] **Paso 1: Crear apps/web/app/(buyer)/vendor/[id]/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { VendorProfile } from '@/components/vendor/VendorProfile'
import { VendorProducts } from '@/components/vendor/VendorProducts'
import { VendorReviews } from '@/components/vendor/VendorReviews'
import { MOCK_VENDORS, getVendorProducts, getVendorReviews } from '@/lib/mockData'
import { useStore } from '@/store/useStore'
import type { Vendor, Product, Review } from '@gps-street-sellers/core/types'

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vendorId = params.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const favoriteIds = useStore((s) => s.favoriteIds)
  const addFavorite = useStore((s) => s.addFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)

  const isFavorite = favoriteIds.includes(vendorId)

  useEffect(() => {
    const v = MOCK_VENDORS.find((v) => v.id === vendorId)
    if (!v) {
      router.push('/map')
      return
    }
    setVendor(v)
    setProducts(getVendorProducts(vendorId))
    setReviews(getVendorReviews(vendorId))
  }, [vendorId, router])

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(vendorId)
    } else {
      addFavorite(vendorId)
    }
  }

  if (!vendor) return null

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ←
        </Button>
        <h1 className="text-lg font-bold">{vendor.name}</h1>
        <button
          onClick={toggleFavorite}
          className="ml-auto text-2xl"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </header>

      <div className="p-4 space-y-6">
        <VendorProfile vendor={vendor} />
        <VendorProducts products={products} />
        <VendorReviews reviews={reviews} />

        {/* Botón notificarme */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-sm mb-3">
            Recibe una notificación cuando este vendedor esté cerca de ti
          </p>
          <Button variant="secondary" className="w-full">
            🔔 Notificarme cuando esté cerca
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Crear apps/web/components/vendor/VendorProfile.tsx**

```typescript
'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Vendor } from '@gps-street-sellers/core/types'
import { getCategoryInfo } from '@gps-street-sellers/core/constants'

interface VendorProfileProps {
  vendor: Vendor
}

export function VendorProfile({ vendor }: VendorProfileProps) {
  const category = getCategoryInfo(vendor.category)

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold">{vendor.name}</h2>
            {vendor.isActive && (
              <Badge variant="secondary">🟢 Activo</Badge>
            )}
          </div>

          <Badge variant="outline">{category.label}</Badge>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-yellow-500 text-xl">★</span>
            <span className="text-xl font-bold">{vendor.ratingAvg.toFixed(1)}</span>
            <span className="text-gray-500">({Math.floor(Math.random() * 50 + 10)} reseñas)</span>
          </div>

          <p className="text-gray-600 mt-4">{vendor.description}</p>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Paso 3: Crear apps/web/components/vendor/VendorProducts.tsx**

```typescript
'use client'

import { Card } from '@/components/ui/Card'
import type { Product } from '@gps-street-sellers/core/types'

interface VendorProductsProps {
  products: Product[]
}

export function VendorProducts({ products }: VendorProductsProps) {
  if (products.length === 0) {
    return (
      <Card variant="outlined" className="p-4 text-center text-gray-500">
        Este vendedor aún no tiene productos
      </Card>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">Productos</h3>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <Card key={product.id} variant="outlined" className="p-3">
            <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">
              📦
            </div>
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-sm text-gray-500">{product.description}</p>
            <p className="text-primary font-bold mt-1">
              ${product.price.toLocaleString('es-CO')}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Paso 4: Crear apps/web/components/vendor/VendorReviews.tsx**

```typescript
'use client'

import { Card } from '@/components/ui/Card'
import type { Review } from '@gps-street-sellers/core/types'

interface VendorReviewsProps {
  reviews: Review[]
}

export function VendorReviews({ reviews }: VendorReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold mb-3">Reseñas</h3>
        <Card variant="outlined" className="p-4 text-center text-gray-500">
          Aún no hay reseñas para este vendedor
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">Reseñas ({reviews.length})</h3>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} variant="outlined" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                👤
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
            <p className="text-gray-700">{review.comment}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Paso 5: Commit**

```bash
git add apps/web/app/\(buyer\)/vendor/\[id\]/page.tsx apps/web/components/vendor/VendorProfile.tsx apps/web/components/vendor/VendorProducts.tsx apps/web/components/vendor/VendorReviews.tsx
git commit -m "feat: add vendor detail page with profile, products, and reviews"
```

---

## Tarea 13: Dashboard del Vendedor

**Archivos:**
- Crear: `apps/web/app/(seller)/dashboard/page.tsx`
- Crear: `apps/web/components/seller/SellerDashboard.tsx`
- Crear: `apps/web/components/seller/ActiveToggle.tsx`

- [ ] **Paso 1: Crear apps/web/components/seller/ActiveToggle.tsx**

```typescript
'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'

export function ActiveToggle() {
  const isActive = useStore((s) => s.isSellerActive)
  const setSellerActive = useStore((s) => s.setSellerActive)

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
      <div>
        <h3 className="font-semibold text-lg">Estado de visibilidad</h3>
        <p className="text-gray-500 text-sm">
          {isActive
            ? 'Los compradores pueden verte en el mapa'
            : 'Los compradores no pueden verte'}
        </p>
      </div>

      <button
        onClick={() => setSellerActive(!isActive)}
        className={clsx(
          'relative w-14 h-8 rounded-full transition-colors',
          isActive ? 'bg-secondary' : 'bg-gray-300'
        )}
      >
        <div
          className={clsx(
            'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform',
            isActive ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}
```

- [ ] **Paso 2: Crear apps/web/components/seller/SellerDashboard.tsx**

```typescript
'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MOCK_VENDORS, getVendorReviews } from '@/lib/mockData'
import { getCategoryInfo } from '@gps-street-sellers/core/constants'

interface SellerDashboardProps {
  vendorId: string
}

export function SellerDashboard({ vendorId }: SellerDashboardProps) {
  const vendor = MOCK_VENDORS.find((v) => v.id === vendorId)
  if (!vendor) return null

  const reviews = getVendorReviews(vendorId)
  const category = getCategoryInfo(vendor.category)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">24</p>
          <p className="text-sm text-gray-500">Vistos hoy</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-secondary">{reviews.length}</p>
          <p className="text-sm text-gray-500">Reseñas</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{vendor.ratingAvg.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Rating</p>
        </Card>
      </div>

      {/* Info del vendedor */}
      <Card variant="elevated" className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ background: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold">{vendor.name}</h2>
            <Badge variant="primary">{category.label}</Badge>
          </div>
        </div>
        <p className="text-gray-600 mt-4">{vendor.description}</p>
      </Card>

      {/* Reseñas recientes */}
      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-3">Reseñas recientes</h3>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin reseñas aún</p>
        ) : (
          <div className="space-y-2">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="flex items-center gap-2">
                <span className="text-yellow-500">
                  {'★'.repeat(review.rating)}
                </span>
                <span className="text-sm text-gray-600">{review.comment}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Paso 3: Crear apps/web/app/(seller)/dashboard/page.tsx**

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ActiveToggle } from '@/components/seller/ActiveToggle'
import { SellerDashboard } from '@/components/seller/SellerDashboard'
import { useStore } from '@/store/useStore'

export default function SellerDashboardPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const setVendors = useStore((s) => s.setVendors)
  const { MOCK_VENDORS } = require('@/lib/mockData')

  useEffect(() => {
    if (user?.role !== 'seller') {
      router.push('/role-select')
    }
    setVendors(MOCK_VENDORS)
  }, [user, router, setVendors])

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mi Dashboard</h1>
          <p className="text-sm text-gray-500">
            {user?.fullName || 'Vendedor'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/profile/edit')}>
          ✏️
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {/* Toggle activo/inactivo */}
        <ActiveToggle />

        {/* Dashboard stats */}
        <SellerDashboard vendorId="v2" />

        {/* Editar perfil */}
        <Link href="/profile/edit">
          <Card variant="outlined" className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <span className="font-semibold">Editar perfil y productos</span>
            </div>
            <span>→</span>
          </Card>
        </Link>
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <button className="flex flex-col items-center text-primary">
          <span className="text-2xl">📊</span>
          <span className="text-xs">Dashboard</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">📦</span>
          <span className="text-xs">Productos</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </button>
      </nav>
    </div>
  )
}
```

- [ ] **Paso 4: Commit**

```bash
git add apps/web/app/\(seller\)/dashboard/page.tsx apps/web/components/seller/ActiveToggle.tsx apps/web/components/seller/SellerDashboard.tsx
git commit -m "feat: add seller dashboard with active toggle and stats"
```

---

## Tarea 14: Editar Perfil del Vendedor

**Archivos:**
- Crear: `apps/web/app/(seller)/profile/edit/page.tsx`

- [ ] **Paso 1: Crear apps/web/app/(seller)/profile/edit/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MOCK_VENDORS } from '@/lib/mockData'
import { CATEGORIES } from '@gps-street-sellers/core/constants'
import type { VendorCategory } from '@gps-street-sellers/core/types'

export default function EditProfilePage() {
  const router = useRouter()
  const vendor = MOCK_VENDORS.find((v) => v.id === 'v2') // Mock vendor

  const [name, setName] = useState(vendor?.name || '')
  const [description, setDescription] = useState(vendor?.description || '')
  const [category, setCategory] = useState<VendorCategory>(vendor?.category as VendorCategory || 'comida')

  const handleSave = () => {
    // Mock save - en producción esto iría a Supabase
    alert('Perfil guardado (mock)')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ←
        </Button>
        <h1 className="text-lg font-bold">Editar Perfil</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Foto */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center text-4xl">
              📸
            </div>
            <div>
              <Button variant="outline" size="sm">
                Cambiar foto
              </Button>
              <p className="text-xs text-gray-500 mt-1">PNG o JPG, máx 2MB</p>
            </div>
          </div>
        </Card>

        {/* Datos */}
        <Card variant="outlined" className="p-4 space-y-4">
          <Input
            label="Nombre del negocio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Don Juan's Empanadas"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={category === cat.id ? 'primary' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategory(cat.id as VendorCategory)}
                >
                  {cat.icon} {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu negocio..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
        </Card>

        {/* Guardar */}
        <Button onClick={handleSave} size="lg" className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/app/\(seller\)/profile/edit/page.tsx
git commit -m "feat: add seller profile edit page"
```

---

## Tarea 15: Configuración / Settings

**Archivos:**
- Crear: `apps/web/app/settings/page.tsx`

- [ ] **Paso 1: Crear apps/web/app/settings/page.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'

export default function SettingsPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)

  const handleLogout = () => {
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Configuración</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Perfil */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user?.fullName || 'Usuario'}</h3>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <Badge variant="primary">{user?.role === 'buyer' ? 'Comprador' : 'Vendedor'}</Badge>
            </div>
          </div>
        </Card>

        {/* Notificaciones */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-3">🔔 Notificaciones</h3>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Notificaciones push</span>
            <button className="w-12 h-7 rounded-full bg-secondary relative">
              <div className="absolute top-0.5 right-1 w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Notificaciones de proximidad</span>
            <button className="w-12 h-7 rounded-full bg-secondary relative">
              <div className="absolute top-0.5 right-1 w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </Card>

        {/* Privacidad */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-3">🔒 Privacidad</h3>
          <p className="text-gray-600 text-sm mb-3">
            Cómo usamos tu información
          </p>
          <Button variant="ghost" className="w-full">
            Ver política de privacidad
          </Button>
        </Card>

        {/* Misc */}
        <Card variant="outlined" className="p-4">
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between py-2 text-gray-700">
              <span>🌐 Idioma</span>
              <span>Español →</span>
            </button>
            <button className="w-full flex items-center justify-between py-2 text-gray-700">
              <span>📱 Versión</span>
              <span className="text-gray-500">1.0.0</span>
            </button>
          </div>
        </Card>

        {/* Cerrar sesión */}
        <Button
          variant="outline"
          className="w-full text-accent border-accent hover:bg-accent hover:text-white"
          onClick={handleLogout}
        >
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add apps/web/app/settings/page.tsx
git commit -m "feat: add settings page with notifications and logout"
```

---

## Tarea 16: README y Variables de Entorno

**Archivos:**
- Crear: `README.md`
- Crear: `.env.example`

- [ ] **Paso 1: Crear README.md**

```markdown
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
```

- [ ] **Paso 2: Crear .env.example**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Paso 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add README and environment example"
```

---

## Resumen de Tareas

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | Configuración proyecto | package.json, tailwind, tsconfig | ✅ |
| 2 | Tipos y constantes | types, categories, geo utils | ✅ |
| 3 | UI base | Button, Input, Card, Badge | ✅ |
| 4 | Zustand store | useStore.ts | ✅ |
| 5 | Mock data | mockData.ts | ✅ |
| 6 | Layout principal | layout, globals.css | ✅ |
| 7 | Splash page | page.tsx redirect | ✅ |
| 8 | Onboarding | 3 slides | ✅ |
| 9 | Login/Register | auth pages | ✅ |
| 10 | Selección de rol | role-select | ✅ |
| 11 | Mapa principal | MapView, VendorPin, VendorCard, FilterBar | ✅ |
| 12 | Detalle vendedor | vendor detail page, components | ✅ |
| 13 | Dashboard seller | ActiveToggle, SellerDashboard | ✅ |
| 14 | Editar perfil | profile/edit | ✅ |
| 15 | Settings | settings page | ✅ |
| 16 | README + env | documentation | ✅ |

---

**Plan completo y guardado en** `docs/superpowers/plans/2026-06-09-gps-street-sellers-implementation-plan.md`

**Dos opciones de ejecución:**

**1. Subagent-Driven (recomendado)** - Dispacho un subagent por tarea, reviso entre tareas, iteración rápida

**2. Inline Execution** - Ejecuto las tareas en esta sesión usando executing-plans, ejecución por lotes con checkpoints

**¿Cuál prefieres?**