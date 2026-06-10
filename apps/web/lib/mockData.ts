import type { Vendor, Product, Review, VendorLocation } from '@gps-street-sellers/core/types'

// Vendedores mock con ubicaciones en Bogotá
export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1',
    userId: 'u1',
    name: 'Don frutas Master',
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
    description: 'Empanadas, arepas y algo más. ¡Pruébalas!',
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