'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, MapPin, User, LogIn, LogOut, ChevronDown } from 'lucide-react'
import { Button } from './ui/Button'
import { NotificationBell } from './notifications/NotificationBell'
import { useStore } from '@/store/useStore'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, _hasHydrated } = useStore()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = () => setUserMenuOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/'
  }

  const isLoggedIn = _hasHydrated && !!user

  const navLinks = [
    { href: '/map', label: 'Explorar' },
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ]

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-card'
          : 'bg-white shadow-soft'
      }`}
      style={{ borderRadius: '0 0 16px 16px' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="BarrioTech"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-gray-900 text-base tracking-tight">Barrio</span>
              <span className="text-xs text-primary font-bold -mt-0.5">Tech</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary rounded-xl hover:bg-primary/5 transition-all"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationBell />
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen) }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={15} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user.fullName || user.email}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {user.role === 'seller' && (
                      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        Dashboard
                      </Link>
                    )}
                    <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      Mis pedidos
                    </Link>
                    <Link href="/favorites" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      Favoritos
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      Configuración
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost" className="text-gray-600 gap-1.5">
                    <LogIn size={15} />
                    Ingresar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
                    <User size={15} />
                    Registrarme
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <NotificationBell />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                menuOpen
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary'
              }`}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4">
            <div className="bg-gray-50 rounded-2xl p-3 space-y-1 border border-gray-100">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:text-primary hover:bg-white rounded-xl transition-all"
                >
                  <MapPin size={16} className="text-primary/70" />
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full justify-center gap-1.5">
                  <LogIn size={14} /> Ingresar
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="w-full justify-center gap-1.5">
                  <User size={14} /> Registrarme
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
