'use client'

import { X, Minus, Plus, ShoppingBag, Trash2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'

interface CartDrawerProps {
  vendorPhone?: string | null
  vendorName?: string
  onCheckout: () => void
  isCheckingOut: boolean
  checkoutError?: string
}

function formatCOP(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
}

function buildWhatsAppText(cartItems: { product: { name: string; price: number }; quantity: number }[], vendorName: string, total: number): string {
  const lines = cartItems.map(
    (item) => `${item.quantity}x ${item.product.name} - ${formatCOP(item.product.price * item.quantity)}`
  )
  return `¡Hola! Quiero hacer un pedido:\n━━━━━━━━━━━━━━\n${lines.join('\n')}\n━━━━━━━━━━━━━━\n*Total: ${formatCOP(total)}*\n━━━━━━━━━━━━━━\nVendedor: ${vendorName}`
}

export function CartDrawer({ vendorPhone, vendorName = 'Vendedor', onCheckout, isCheckingOut, checkoutError }: CartDrawerProps) {
  const cart = useStore((s) => s.cart)
  const cartOpen = useStore((s) => s.cartOpen)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const removeFromCart = useStore((s) => s.removeFromCart)
  const updateCartQuantity = useStore((s) => s.updateCartQuantity)
  const getCartTotal = useStore((s) => s.getCartTotal)
  const clearCart = useStore((s) => s.clearCart)

  const total = getCartTotal()
  const hasWhatsApp = vendorPhone && vendorPhone.length > 0

  const handleWhatsApp = () => {
    if (!hasWhatsApp || cart.length === 0) return
    const text = buildWhatsAppText(cart, vendorName, total)
    const waUrl = `https://wa.me/${vendorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
    clearCart()
    setCartOpen(false)
  }

  if (!cartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag size={24} className="text-primary" />
            <h2 className="text-lg font-bold">Tu pedido</h2>
          </div>
          <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-sm text-gray-500">{formatCOP(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-full ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-xl font-bold text-primary">{formatCOP(total)}</span>
            </div>

            {hasWhatsApp ? (
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                size="lg"
                onClick={handleWhatsApp}
                isLoading={isCheckingOut}
              >
                <MessageCircle size={20} className="text-green-600" />
                Pedir por WhatsApp
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  Este vendedor aún no tiene WhatsApp configurado
                </div>
                {checkoutError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {checkoutError}
                  </div>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  onClick={onCheckout}
                  isLoading={isCheckingOut}
                >
                  Guardar pedido en la app
                </Button>
              </div>
            )}

            <button
              onClick={clearCart}
              className="w-full text-sm text-gray-500 hover:text-red-500"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  )
}
