import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { products } from '@/data/products'
import { useCartStore } from '@/features/cart/cartStore'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/Button'

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)

  const product = products.find((p) => p.slug === slug)
  const [selectedColor, setSelectedColor] = useState<string | undefined>()
  const [showAddedFeedback, setShowAddedFeedback] = useState(false)

  if (!product) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <motion.h1
            className="text-2xl font-semibold text-neutral-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Product Not Found
          </motion.h1>
          <motion.p
            className="text-neutral-600 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            The product you're looking for doesn't exist.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  const handleAddToCart = () => {
    addItem(product.id)
    setShowAddedFeedback(true)
    setTimeout(() => setShowAddedFeedback(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <motion.nav
          className="text-sm text-neutral-600 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <a href="/" className="hover:text-neutral-900 transition-colors">Home</a>
          <span className="mx-2">/</span>
          <a href="/shop" className="hover:text-neutral-900 transition-colors">Shop</a>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">{product.name}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="aspect-square bg-neutral-100 rounded-xl overflow-hidden shadow-lg">
              <motion.img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                width={600}
                height={600}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-neutral-900 mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating && (
              <motion.div
                className="flex items-center mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <motion.svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400'
                          : 'text-neutral-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </div>
                <span className="ml-2 text-sm text-neutral-600">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </motion.div>
            )}

            {/* Price */}
            <motion.p
              className="text-3xl font-semibold text-neutral-900 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {formatPrice(product.price)}
            </motion.p>

            {/* Description */}
            <motion.p
              className="text-neutral-700 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {product.description || product.shortDescription}
            </motion.p>

            {/* Details */}
            <motion.div
              className="space-y-4 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {product.material && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-neutral-900 w-24">Material:</span>
                  <span className="text-sm text-neutral-700">{product.material}</span>
                </div>
              )}
              {product.colors && product.colors.length > 0 && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-neutral-900 w-24">Colors:</span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color, index) => (
                      <motion.button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1 text-sm border rounded-lg transition-all ${
                          selectedColor === color
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-md'
                            : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                        }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {color}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Add to Cart */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full md:w-auto shadow-lg hover:shadow-xl transition-all"
                >
                  Add to Cart
                </Button>
              </motion.div>

              <AnimatePresence>
                {showAddedFeedback && (
                  <motion.p
                    className="text-sm text-green-600 flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </motion.svg>
                    Added to cart!
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Demo Notice */}
            <motion.div
              className="mt-8 p-4 bg-neutral-50 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <p className="text-sm text-neutral-600">
                This is a demonstration product. Images are for concept purposes only.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
