import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
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
      <motion.div
        className="min-h-screen bg-neutral-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center px-4">
          <motion.svg
            className="w-24 h-24 mx-auto text-neutral-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </motion.svg>
          <motion.h1
            className="text-2xl font-semibold text-neutral-900 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Your cart is empty
          </motion.h1>
          <motion.p
            className="text-neutral-600 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Add some products to get started
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link to="/shop">
              <Button>Continue Shopping</Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.h1
          className="text-3xl md:text-4xl font-serif font-semibold text-neutral-900 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Shopping Cart
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId)
                if (!product) return null

                return (
                  <motion.div
                    key={`${item.productId}-${item.variantId || 'default'}`}
                    className="bg-white rounded-xl p-4 md:p-6 flex gap-4 shadow-sm hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    {/* Product Image */}
                    <Link
                      to={`/products/${product.slug}`}
                      className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-neutral-100 rounded-lg overflow-hidden"
                    >
                      <motion.img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width={128}
                        height={128}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
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
                        <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden">
                          <motion.button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantId
                              )
                            }
                            className="px-3 py-2 text-neutral-700 hover:bg-neutral-100 transition-colors"
                            aria-label="Decrease quantity"
                            whileHover={{ backgroundColor: '#f5f5f4' }}
                            whileTap={{ scale: 0.9 }}
                          >
                            −
                          </motion.button>
                          <motion.span
                            className="px-4 py-2 text-sm font-medium"
                            key={item.quantity}
                            initial={{ scale: 1.2, color: '#bfa094' }}
                            animate={{ scale: 1, color: '#000' }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.quantity}
                          </motion.span>
                          <motion.button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantId
                              )
                            }
                            className="px-3 py-2 text-neutral-700 hover:bg-neutral-100 transition-colors"
                            aria-label="Increase quantity"
                            whileHover={{ backgroundColor: '#f5f5f4' }}
                            whileTap={{ scale: 0.9 }}
                          >
                            +
                          </motion.button>
                        </div>

                        <motion.button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-sm text-red-600 hover:text-red-700 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Remove
                        </motion.button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <motion.p
                        className="font-semibold text-neutral-900"
                        key={item.quantity}
                        initial={{ scale: 1.1, color: '#bfa094' }}
                        animate={{ scale: 1, color: '#1c1917' }}
                        transition={{ duration: 0.3 }}
                      >
                        {formatPrice(product.price * item.quantity)}
                      </motion.p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-xl p-6 sticky top-24 shadow-md">
              <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <motion.span
                    className="font-medium text-neutral-900"
                    key={subtotal}
                    initial={{ scale: 1.1, color: '#bfa094' }}
                    animate={{ scale: 1, color: '#1c1917' }}
                    transition={{ duration: 0.3 }}
                  >
                    {formatPrice(subtotal)}
                  </motion.span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  <span className="text-neutral-600">Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-neutral-900">Total</span>
                  <motion.span
                    className="text-lg font-semibold text-neutral-900"
                    key={subtotal}
                    initial={{ scale: 1.2, color: '#bfa094' }}
                    animate={{ scale: 1, color: '#1c1917' }}
                    transition={{ duration: 0.4 }}
                  >
                    {formatPrice(subtotal)}
                  </motion.span>
                </div>
              </div>

              {/* Notice */}
              <motion.div
                className="bg-primary-50 rounded-lg p-4 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <p className="text-sm text-neutral-700">
                  This is a demonstration cart. Checkout functionality is not available.
                </p>
              </motion.div>

              <Link to="/shop">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
