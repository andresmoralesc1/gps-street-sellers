/**
 * Mapeo de emojis a Lucide Icons
 * Reemplaza emojis con iconos SVG profesionales
 */
import {
  MapPin,
  ShoppingCart,
  Heart,
  Settings,
  BarChart3,
  Package,
  ChevronLeft,
  Star,
  X,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Globe,
  Smartphone,
  Check,
  Plus,
  Edit3,
  Users,
  Clock,
  Filter,
  LucideIcon,
} from 'lucide-react'

// Iconos de navegación
export const Icons: Record<string, LucideIcon> = {
  // Navegación
  map: MapPin,
  cart: ShoppingCart,
  heart: Heart,
  settings: Settings,
  dashboard: BarChart3,
  products: Package,

  // Acciones
  back: ChevronLeft,
  close: X,
  edit: Edit3,
  plus: Plus,
  star: Star,

  // Estados
  eye: Eye,
  eyeOff: EyeOff,
  notification: Bell,
  shield: Shield,

  // UI
  globe: Globe,
  smartphone: Smartphone,
  check: Check,
  filter: Filter,
  users: Users,
  clock: Clock,
}

// Helper para renderizar icono por nombre
export function getIcon(iconName: string): LucideIcon {
  return Icons[iconName] || Package
}
