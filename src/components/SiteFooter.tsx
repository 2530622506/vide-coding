export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-serif font-semibold text-neutral-900 mb-4">Haven</h3>
            <p className="text-sm text-neutral-600">
              Curated home & lifestyle essentials for modern living.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li><a href="/shop" className="hover:text-neutral-900 transition-colors">All Products</a></li>
              <li><a href="/shop?category=living-room" className="hover:text-neutral-900 transition-colors">Living Room</a></li>
              <li><a href="/shop?category=bedroom" className="hover:text-neutral-900 transition-colors">Bedroom</a></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-4">Information</h4>
            <p className="text-sm text-neutral-600">
              This is a demonstration shopping application.<br />
              All products and prices are for display purposes only.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200 text-center text-sm text-neutral-500">
          <p>&copy; 2026 Haven. Demo project.</p>
        </div>
      </div>
    </footer>
  )
}
