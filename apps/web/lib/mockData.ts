import type { Vendor, Product, Review, VendorLocation } from '@/lib/core/types'

// ponytail: Pexels images (free to use, no API needed)
const PEXELS = {
  mango: 'https://images.pexels.com/photos/918648/pexels-photo-918648.jpeg?auto=compress&w=400',
  naranja: 'https://images.pexels.com/photos/2292919/pexels-photo-2292919.jpeg?auto=compress&w=400',
  papaya: 'https://images.pexels.com/photos/594576/pexels-photo-594576.jpeg?auto=compress&w=400',
  empanada: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&w=400',
  arepa: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&w=400',
  jugonaranja: 'https://images.pexels.com/photos/1132558/pexels-photo-1132558.jpeg?auto=compress&w=400',
  jugofresa: 'https://images.pexels.com/photos/4671005/pexels-photo-4671005.jpeg?auto=compress&w=400',
  artesania: 'https://images.pexels.com/photos/1070898/pexels-photo-1070898.jpeg?auto=compress&w=400',
  camiseta: 'https://images.pexels.com/photos/2973763/pexels-photo-2973763.jpeg?auto=compress&w=400',
  jeans: 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&w=400',
}

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1',
    userId: 'u1',
    name: 'Doña María Frutas',
    category: 'frutas',
    description: 'Frutas frescas del día, directo del mercado de Paloquemao.',
    photoUrl: 'https://images.pexels.com/photos/1132558/pexels-photo-1132558.jpeg?auto=compress&w=400',
    isActive: true,
    ratingAvg: 4.8,
    reviewCount: 23,
    createdAt: '2024-01-15T10:00:00Z',
    latitude: 4.6110,
    longitude: -74.0830,
  },
  {
    id: 'v2',
    userId: 'u2',
    name: 'El Sabor de la Abuela',
    category: 'comida',
    description: 'Empanadas, arepas y algo más. Recetas de familia.',
    photoUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=400',
    isActive: true,
    ratingAvg: 4.9,
    reviewCount: 45,
    createdAt: '2024-02-20T14:30:00Z',
    latitude: 4.6085,
    longitude: -74.0795,
  },
  {
    id: 'v3',
    userId: 'u3',
    name: 'Jugos y Frescos',
    category: 'bebidas',
    description: 'Jugos naturales, aguapanela con queso y más.',
    photoUrl: 'https://images.pexels.com/photos/2109098/pexels-photo-2109098.jpeg?auto=compress&w=400',
    isActive: true,
    ratingAvg: 4.5,
    reviewCount: 12,
    createdAt: '2024-03-05T09:15:00Z',
    latitude: 4.6105,
    longitude: -74.0850,
  },
  {
    id: 'v4',
    userId: 'u4',
    name: 'Artesanías Zulu',
    category: 'artesanias',
    description: 'Artefactos tejidos a mano, recuerdos únicos.',
    photoUrl: 'https://images.pexels.com/photos/1070898/pexels-photo-1070898.jpeg?auto=compress&w=400',
    isActive: false,
    ratingAvg: 4.7,
    reviewCount: 8,
    createdAt: '2024-01-10T11:45:00Z',
    latitude: 4.6070,
    longitude: -74.0800,
  },
  {
    id: 'v5',
    userId: 'u5',
    name: 'Ropa Vintage Colombia',
    category: 'ropa',
    description: 'Camisetas y jeans únicos, estilo vintage.',
    photoUrl: 'https://images.pexels.com/photos/2973763/pexels-photo-2973763.jpeg?auto=compress&w=400',
    isActive: true,
    ratingAvg: 4.6,
    reviewCount: 19,
    createdAt: '2024-04-01T16:00:00Z',
    latitude: 4.6090,
    longitude: -74.0760,
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
  { id: 'p1', vendorId: 'v1', name: 'Mango', description: 'Mango maduro de exportación', photoUrl: PEXELS.mango, price: 2000 },
  { id: 'p2', vendorId: 'v1', name: 'Papaya', description: 'Papaya fresca', photoUrl: PEXELS.papaya, price: 3000 },
  { id: 'p3', vendorId: 'v1', name: 'Jugo de naranja', description: 'Exprimido al momento', photoUrl: PEXELS.jugonaranja, price: 4000 },
  { id: 'p4', vendorId: 'v2', name: 'Empanada', description: 'De pollo con papa', photoUrl: PEXELS.empanada, price: 2500 },
  { id: 'p5', vendorId: 'v2', name: 'Arepa', description: 'Con queso blanco', photoUrl: PEXELS.arepa, price: 1500 },
  { id: 'p6', vendorId: 'v2', name: 'Arepa con todo', description: 'Chicharrón, queso y molida', photoUrl: PEXELS.arepa, price: 4000 },
  { id: 'p7', vendorId: 'v3', name: 'Jugo de fresa', description: 'Natural con leche', photoUrl: PEXELS.jugofresa, price: 3500 },
  { id: 'p8', vendorId: 'v3', name: 'Aguapanela', description: 'Con queso y hielo', photoUrl: PEXELS.jugonaranja, price: 2000 },
  { id: 'p9', vendorId: 'v4', name: 'Bolso tejido', description: 'Tejido a mano en Iracá', photoUrl: PEXELS.artesania, price: 25000 },
  { id: 'p10', vendorId: 'v5', name: 'Camiseta vintage', description: 'Diseño exclusivo Bogotá', photoUrl: PEXELS.camiseta, price: 35000 },
  { id: 'p11', vendorId: 'v5', name: 'Jeans 90s', description: 'Levis originales', photoUrl: PEXELS.jeans, price: 45000 },
]

export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', vendorId: 'v1', customerId: 'c1', rating: 5, comment: 'Las mejores frutas de Chapinero', createdAt: '2024-05-01' },
  { id: 'r2', vendorId: 'v1', customerId: 'c2', rating: 5, comment: 'Super frescos y buenos precios', createdAt: '2024-05-02' },
  { id: 'r3', vendorId: 'v2', customerId: 'c3', rating: 5, comment: 'Las empanadas más ricas de Bogotá', createdAt: '2024-05-03' },
  { id: 'r4', vendorId: 'v2', customerId: 'c4', rating: 5, comment: 'Me encanta la arepa con todo', createdAt: '2024-05-04' },
  { id: 'r5', vendorId: 'v3', customerId: 'c5', rating: 4, comment: 'El jugo de fresa es increíble', createdAt: '2024-05-05' },
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