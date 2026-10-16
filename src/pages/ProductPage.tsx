import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-4">Product Not Found</h1>
          <p className="text-neutral-600 mb-6">The product you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
        </div>
      </div>
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
        <nav className="text-sm text-neutral-600 mb-8">
          <a href="/" className="hover:text-neutral-900">Home</a>
          <span className="mx-2">/</span>
          <a href="/shop" className="hover:text-neutral-900">Shop</a>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                width={600}
                height={600}
              />
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-neutral-900 mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400'
                          : 'text-neutral-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="ml-2 text-sm text-neutral-600">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <p className="text-3xl font-semibold text-neutral-900 mb-6">
              {formatPrice(product.price)}
            </p>

            {/* Description */}
            <p className="text-neutral-700 mb-8 leading-relaxed">
              {product.description || product.shortDescription}
            </p>

            {/* Details */}
            <div className="space-y-4 mb-8">
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
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1 text-sm border rounded ${
                          selectedColor === color
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-neutral-300 text-neutral-700 hover:border-neutral-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button
                size="lg"
                onClick={handleAddToCart}
                className="w-full md:w-auto"
              >
                Add to Cart
              </Button>

              {showAddedFeedback && (
                <p className="text-sm text-green-600 animate-fade-in">
                  ✓ Added to cart!
                </p>
              )}
            </div>

            {/* Demo Notice */}
            <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-600">
                This is a demonstration product. Images are for concept purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
