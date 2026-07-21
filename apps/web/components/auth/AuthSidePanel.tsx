'use client'

import { MapPin, Store, Star, Bell } from 'lucide-react'
import { useStats } from '@/hooks/useStats'

/**
 * Decorative gradient panel shown on the right (desktop) of the auth
 * card. Three selling points + a live "X vendors active" stat pulled
 * from /api/stats.
 *
 * Hidden entirely on mobile (parent uses `hidden lg:flex`). The stats
 * row is also hidden if the API is unreachable — we never show "0"
 * because that reads as "the product is dead" instead of "we don't
 * know yet".
 */
export function AuthSidePanel() {
  const stats = useStats()

  return (
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-orange-600 p-10 text-white relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-10 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl" />

      <div className="relative">
        <h2 className="text-3xl font-bold leading-tight mb-3">
          El sabor de tu barrio,<br />ahora en tu celular.
        </h2>
        <p className="text-white/85 text-base leading-relaxed">
          Descubre vendedores informales cerca de ti — comida, frutas, artesanías y más, en tiempo real.
        </p>
      </div>

      <ul className="relative space-y-4 my-8">
        <li className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <MapPin size={20} />
          </div>
          <div>
            <p className="font-semibold">Mapa en vivo</p>
            <p className="text-sm text-white/80">Vendedores activos en tu barrio al instante</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Store size={20} />
          </div>
          <div>
            <p className="font-semibold">Vendedores verificados</p>
            <p className="text-sm text-white/80">Reseñas reales de compradores como tú</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div>
            <p className="font-semibold">Avisos inteligentes</p>
            <p className="text-sm text-white/80">Te avisamos cuando tus favoritos estén cerca</p>
          </div>
        </li>
      </ul>

      {stats && stats.activeVendors > 0 && (
        <div className="relative flex items-center gap-2 text-sm text-white/90">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className="fill-yellow-300 text-yellow-300" />
            ))}
          </div>
          <span>
            {stats.activeVendors} vendedor{stats.activeVendors === 1 ? '' : 'es'} activo{stats.activeVendors === 1 ? '' : 's'}
            {stats.activeCities > 0 && ` · ${stats.activeCities} ciud${stats.activeCities === 1 ? 'ad' : 'ades'}`}
          </span>
        </div>
      )}
    </div>
  )
}
