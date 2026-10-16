import { Link } from 'react-router-dom'
import { useCartStore } from '@/features/cart/cartStore'
import { products } from '@/data/products'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/Button'

export function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore()

  // Calculate totals
  const subtotal = items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.productId)
    return total + (product?.price || 0) * item.quantity
  }, 0)

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center px-4">
          <svg
            className="w-24 h-24 mx-auto text-neutral-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Your cart is empty</h1>
          <p className="text-neutral-600 mb-6">Add some products to get started</p>
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold text-neutral-900 mb-8">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId)
              if (!product) return null

              return (
                <div
                  key={`${item.productId}-${item.variantId || 'default'}`}
                  className="bg-white rounded-lg p-4 md:p-6 flex gap-4"
                >
                  {/* Product Image */}
                  <Link
                    to={`/products/${product.slug}`}
                    className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-neutral-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      loading="lazy"
                      width={128}
                      height={128}
                    />
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${product.slug}`}
                      className="font-medium text-neutral-900 hover:text-primary-600 transition-colors"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-neutral-600 mt-1">
                      {formatPrice(product.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center border border-neutral-300 rounded-lg">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                              item.variantId
                            )
                          }
                          className="px-3 py-2 text-neutral-700 hover:bg-neutral-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-4 py-2 text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                              item.variantId
                            )
                          }
                          className="px-3 py-2 text-neutral-700 hover:bg-neutral-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-sm text-red-600 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-semibold text-neutral-900">
                      {formatPrice(product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium text-neutral-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="text-neutral-600">Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-neutral-900">Total</span>
                  <span className="text-lg font-semibold text-neutral-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-primary-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-neutral-700">
                  This is a demonstration cart. Checkout functionality is not available.
                </p>
              </div>

              <Link to="/shop">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
