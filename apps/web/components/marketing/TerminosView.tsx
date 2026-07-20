'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function TerminosView() {
  return (
    <div className="marketing-page min-h-screen bg-background-cream">

      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Términos y Condiciones</h1>
        <p className="text-gray-500 text-sm mb-8">Última actualización: Enero 2024</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Aceptación de los términos</h2>
            <p className="text-gray-600">Al acceder y usar BarrioTech, aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguno, no uses la plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. Descripción del servicio</h2>
            <p className="text-gray-600">BarrioTech es una plataforma tecnológica que conecta vendedores informales con consumidores cercanos mediante geolocalización. No somos intermediarios en las transacciones ni asumimos responsabilidad por el cumplimiento de estas.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. Registro y cuentas</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Debes proporcionar información veraz y actualizada.</li>
              <li>Eres responsable de la seguridad de tu cuenta y contraseña.</li>
              <li>Debes tener al menos 18 años para registrarte como vendedor.</li>
              <li>Está prohibido crear cuentas falsas o usar la plataforma para engañar a otros usuarios.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Uso del GPS y ubicación</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Como vendedor, al activar tu ubicación confirmas que estás operando legítimamente en la zona reportada.</li>
              <li>BarrioTech no se hace responsable del uso indebido de la ubicación.</li>
              <li>Está prohibido reportar ubicaciones falsas o pretender estar en un lugar donde no se está.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Transacciones entre usuarios</h2>
            <p className="text-gray-600">Las transacciones (pedidos, pagos, entregas) son exclusivamente entre el comprador y el vendedor. BarrioTech no participa en el acuerdo, no procesa pagos a través de la plataforma y no garantiza la calidad, seguridad o legalidad de los productos o servicios ofrecidos.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Conducta prohibida</h2>
            <p className="text-gray-600 mb-2">Queda prohibido:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Ofrecer productos o servicios ilegales.</li>
              <li>Usar la plataforma para spam, fraude o ingeniería social.</li>
              <li>Publicar contenido ofensivo, engañoso o discriminatorio.</li>
              <li>Suplantar la identidad de terceros.</li>
              <li>Intentar manipular las reseñas o calificaciones.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">7. Suspensión y eliminación de cuentas</h2>
            <p className="text-gray-600">Podemos suspender o eliminar cuentas que violen estos términos, sin previo aviso y sin derecho a compensación.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">8. Modificaciones</h2>
            <p className="text-gray-600">Podemos modificar estos términos en cualquier momento. Los cambios se publicarán en esta página. El uso continuo de la plataforma implica aceptación de los nuevos términos.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">9. Ley aplicable</h2>
            <p className="text-gray-600">Estos términos se rigen por las leyes de Colombia. Cualquier disputa será resuelta en los tribunales competentes de Colombia.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">10. Contacto</h2>
            <p className="text-gray-600">Para preguntas sobre estos términos: <strong>legal@barriotech.com</strong></p>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link href="/"><Button variant="outline">Volver al inicio</Button></Link>
        </div>
      </div>
    </div>
  )
}
