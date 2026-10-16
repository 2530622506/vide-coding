import { Link } from 'react-router-dom'
import { useCartStore } from '@/features/cart/cartStore'

export function SiteHeader() {
  const itemCount = useCartStore((state) => state.getItemCount())

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-serif font-semibold text-neutral-900 hover:text-primary-600 transition-colors">
            Haven
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors">
              Home
            </Link>
            <Link to="/shop" className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors">
              Shop
            </Link>
          </nav>

          {/* Cart */}
          <Link
            to="/cart"
            className="relative flex items-center space-x-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
