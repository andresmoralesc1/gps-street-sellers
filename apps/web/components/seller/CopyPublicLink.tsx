'use client'

import { useState } from 'react'
import { Copy, Check, Link2, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useToast } from './Toast'

/**
 * N6 — Copy public vendor link.
 * Shows the vendor's public URL and lets the seller copy or share via Web Share API.
 */
interface CopyPublicLinkProps {
  vendorSlug: string
}

export function CopyPublicLink({ vendorSlug }: CopyPublicLinkProps) {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/vendedor/${vendorSlug}`
    : `/vendedor/${vendorSlug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      showToast('Link copiado ✓', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  const handleShare = async () => {
    if (!('share' in navigator)) {
      handleCopy()
      return
    }
    try {
      await navigator.share({
        title: 'Mi tienda en GPS Street Sellers',
        text: 'Mira mis productos aquí:',
        url: publicUrl,
      })
    } catch (err) {
      // User cancelled — silent
    }
  }

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Link2 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 text-sm">Tu link público</h3>
          <p className="text-gray-500 text-xs mt-0.5 truncate" title={publicUrl}>
            {publicUrl}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Compartir"
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 size={16} className="text-gray-600" />
          </button>
          <button
            type="button"
            aria-label="Copiar link"
            onClick={handleCopy}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {copied
              ? <Check size={16} className="text-green-600" />
              : <Copy size={16} className="text-gray-600" />}
          </button>
        </div>
      </div>
    </Card>
  )
}