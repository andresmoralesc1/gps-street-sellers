import type { VendorCategory } from '../types'

// Usamos lucide-react icons via el componente IconRenderer
export interface CategoryInfo {
  id: VendorCategory
  label: string
  color: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'frutas', label: 'Frutas', color: '#10B981' },
  { id: 'comida', label: 'Comida caliente', color: '#F59E0B' },
  { id: 'bebidas', label: 'Bebidas', color: '#3B82F6' },
  { id: 'artesanias', label: 'Artesanías', color: '#8B5CF6' },
  { id: 'ropa', label: 'Ropa', color: '#EC4899' },
  { id: 'otros', label: 'Otros', color: '#6B7280' },
]

export const getCategoryInfo = (id: VendorCategory): CategoryInfo => {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[5]
}