import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Mail, ArrowRight } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <Image
                src="/logo.png"
                alt="BarrioTech"
                width={36}
                height={36}
                className="object-contain"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-white text-base">Barrio</span>
                <span className="text-xs text-primary font-semibold -mt-0.5">Tech</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              Conectando vendedores informales con compradores en Colombia. El sabor de tu barrio, ahora en tu celular.
            </p>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Explorar</h4>
            <ul className="space-y-1">
              <li><Link href="/map" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Mapa de vendedores</Link></li>
              <li><Link href="/register" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Ser vendedor</Link></li>
              <li><Link href="/login" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* Compañía */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Compañía</h4>
            <ul className="space-y-1">
              <li><Link href="/nosotros" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Sobre nosotros</Link></li>
              <li><Link href="/contacto" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Contacto</Link></li>
              <li><Link href="/preguntas-frecuentes" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Preguntas frecuentes</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-1">
              <li><Link href="/privacidad" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Política de privacidad</Link></li>
              <li><Link href="/terminos" className="text-sm hover:text-primary transition-colors inline-block py-2 min-h-[36px]">Términos y condiciones</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © 2026 BarrioTech. Todos los derechos reservados.
          </p>
          <a
            href="mailto:hola@barriotech.com"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary transition-colors py-2 min-h-[36px]"
          >
            <Mail size={12} />
            hola@barriotech.com
          </a>
        </div>
      </div>
    </footer>
  )
}
