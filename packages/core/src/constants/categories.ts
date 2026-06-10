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