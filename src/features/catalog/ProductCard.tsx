import { Link } from 'react-router-dom'
import type { Product } from '@/types/product'
import { formatPrice } from '@/lib/format'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      {/* Product Image */}
      <div className="aspect-square bg-neutral-100 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          width={400}
          height={400}
        />
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-medium text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
          {product.shortDescription}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-neutral-900">
            {formatPrice(product.price)}
          </p>

          {product.rating && (
            <div className="flex items-center text-sm text-neutral-600">
              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{product.rating}</span>
              {product.reviewCount && (
                <span className="ml-1">({product.reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
