'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-cream">

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Política de Privacidad</h1>
        <p className="text-gray-500 text-sm mb-8">Última actualización: Enero 2024</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Información que recopilamos</h2>
            <p className="text-gray-600 mb-3">Recopilamos la siguiente información cuando usas nuestra plataforma:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Datos de ubicación:</strong> Cuando usas el mapa, accedemos a tu ubicación en tiempo real para mostrarte vendedores cercanos. Puedes desactivar esto en cualquier momento desde los ajustes de tu dispositivo.</li>
              <li><strong>Datos de registro:</strong> Nombre, email y contraseña (encriptada) cuando te registras como comprador o vendedor.</li>
              <li><strong>Datos del vendedor:</strong> Nombre del negocio, descripción, categoría, foto de perfil y ubicación GPS.</li>
              <li><strong>Datos de uso:</strong> Interacciones con la app, páginas visitadas y preferencias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. Cómo usamos tu información</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Mostrarte vendedores cercanos a tu ubicación en el mapa.</li>
              <li>Conectarte con vendedores para realizar pedidos o consultas.</li>
              <li>Mejorar la experiencia del usuario y personalizar recomendaciones.</li>
              <li>Enviarte notificaciones cuando un vendedor favorito esté activo (solo si las habilitas).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. Compartir información</h2>
            <p className="text-gray-600 mb-3">No vendemos tus datos personales. Compartimos información únicamente en estos casos:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li><strong>Con vendedores:</strong> Tu nombre y ubicación cuando realizas un pedido.</li>
              <li><strong>Con proveedores de servicios:</strong> Servicios de hosting, mapas y análisis (bajo acuerdos de confidencialidad).</li>
              <li><strong>Por requerimiento legal:</strong> Cuando sea requerido por ley o autoridad competente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Tus derechos</h2>
            <p className="text-gray-600 mb-3">Tienes derecho a:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Acceder a tus datos personales.</li>
              <li>Corregir información inexacta.</li>
              <li>Solicitar la eliminación de tu cuenta y datos.</li>
              <li>Revocar el consentimiento para notificaciones en cualquier momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Seguridad</h2>
            <p className="text-gray-600">Usamos encriptación HTTPS, contraseñas hasheadas y buenas prácticas de desarrollo para proteger tu información. Sin embargo, ninguna transmisión por internet es 100% segura.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Contacto</h2>
            <p className="text-gray-600">Si tienes preguntas sobre esta política, contáctanos en <strong>privacidad@barriotech.com</strong></p>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link href="/"><Button variant="outline">Volver al inicio</Button></Link>
        </div>
      </div>
    </div>
  )
}
