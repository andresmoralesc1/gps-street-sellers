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

  // Notificaciones
  pushNotificationsEnabled: boolean
  setPushNotifications: (enabled: boolean) => void
  proximityNotificationsEnabled: boolean
  setProximityNotifications: (enabled: boolean) => void

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

  // Notificaciones
  pushNotificationsEnabled: true,
  setPushNotifications: (enabled) => set({ pushNotificationsEnabled: enabled }),
  proximityNotificationsEnabled: true,
  setProximityNotifications: (enabled) => set({ proximityNotificationsEnabled: enabled }),

  // UI
  selectedVendorId: null,
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),
}))
