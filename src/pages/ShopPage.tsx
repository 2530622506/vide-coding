import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { products, getAllColors, getAllMaterials } from '@/data/products'
import { categories } from '@/data/categories'
import { ProductCard } from '@/features/catalog/ProductCard'
import { filterProducts, parseFiltersFromURL, filtersToURLParams } from '@/features/catalog/filterUtils'
import type { SortOption } from '@/types/product'
import { Button } from '@/components/ui/Button'

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  // Parse current filters from URL
  const currentFilters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])

  // Filter and sort products
  const filteredProducts = useMemo(
    () => filterProducts(products, currentFilters),
    [currentFilters]
  )

  // Update filters in URL
  const updateFilters = (updates: Partial<typeof currentFilters>) => {
    const newFilters = { ...currentFilters, ...updates }
    setSearchParams(filtersToURLParams(newFilters))
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters =
    !!currentFilters.search ||
    (currentFilters.categories?.length ?? 0) > 0 ||
    (currentFilters.colors?.length ?? 0) > 0 ||
    (currentFilters.materials?.length ?? 0) > 0 ||
    !!currentFilters.priceRange

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-neutral-900 mb-4">
            Shop All Products
          </h1>
          <p className="text-neutral-600">
            Discover our curated collection of home essentials
          </p>
        </motion.div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-1">
            <FilterPanel
              currentFilters={currentFilters}
              updateFilters={updateFilters}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mobile Filter Toggle */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters {hasActiveFilters && '(Active)'}
              </Button>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="lg:hidden mb-6 p-4 bg-white rounded-lg border border-neutral-200">
                <FilterPanel
                  currentFilters={currentFilters}
                  updateFilters={updateFilters}
                  clearFilters={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            )}

            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="search"
                  placeholder="Search products..."
                  value={currentFilters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value || undefined })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Sort */}
              <select
                value={currentFilters.sort || 'featured'}
                onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {/* Results Count */}
            <p className="text-sm text-neutral-600 mb-6">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </p>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg text-neutral-600 mb-4">No products found</p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>Clear all filters</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Filter Panel Component
function FilterPanel({
  currentFilters,
  updateFilters,
  clearFilters,
  hasActiveFilters,
}: {
  currentFilters: ReturnType<typeof parseFiltersFromURL>
  updateFilters: (updates: Partial<typeof currentFilters>) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}) {
  const allColors = getAllColors()
  const allMaterials = getAllMaterials()

  const toggleArrayFilter = (key: 'categories' | 'colors' | 'materials', value: string) => {
    const current = currentFilters[key] || []
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilters({ [key]: updated.length > 0 ? updated : undefined })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-medium text-neutral-900 mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.categories?.includes(category.slug) || false}
                onChange={() => toggleArrayFilter('categories', category.slug)}
                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-neutral-700">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="font-medium text-neutral-900 mb-3">Color</h3>
        <div className="space-y-2">
          {allColors.map((color) => (
            <label key={color} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.colors?.includes(color) || false}
                onChange={() => toggleArrayFilter('colors', color)}
                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-neutral-700">{color}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div>
        <h3 className="font-medium text-neutral-900 mb-3">Material</h3>
        <div className="space-y-2">
          {allMaterials.map((material) => (
            <label key={material} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.materials?.includes(material) || false}
                onChange={() => toggleArrayFilter('materials', material)}
                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-neutral-700">{material}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
