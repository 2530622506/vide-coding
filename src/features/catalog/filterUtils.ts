import type { Product, FilterState, SortOption } from '@/types/product'

/**
 * Filter and sort products based on current filter state
 */
export function filterProducts(products: Product[], filters: FilterState): Product[] {
  let filtered = [...products]

  // Search by name or description
  if (filters.search) {
    const query = filters.search.toLowerCase()
    filtered = filtered.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.shortDescription.toLowerCase().includes(query)
    )
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(p => filters.categories!.includes(p.category))
  }

  // Filter by price range
  if (filters.priceRange) {
    const [min, max] = filters.priceRange
    filtered = filtered.filter(p => p.price >= min && p.price <= max)
  }

  // Filter by colors
  if (filters.colors && filters.colors.length > 0) {
    filtered = filtered.filter(
      p => p.colors && p.colors.some(c => filters.colors!.includes(c))
    )
  }

  // Filter by materials
  if (filters.materials && filters.materials.length > 0) {
    filtered = filtered.filter(p => p.material && filters.materials!.includes(p.material))
  }

  // Sort
  return sortProducts(filtered, filters.sort || 'featured')
}

/**
 * Sort products by selected option
 */
export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products]

  switch (sort) {
    case 'featured':
      return sorted.sort((a, b) => {
        // Products with featuredRank come first
        if (a.featuredRank && !b.featuredRank) return -1
        if (!a.featuredRank && b.featuredRank) return 1
        if (a.featuredRank && b.featuredRank) {
          return a.featuredRank - b.featuredRank
        }
        return 0
      })

    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price)

    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price)

    default:
      return sorted
  }
}

/**
 * Parse filter state from URL search params
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const filters: FilterState = {}

  const search = searchParams.get('search')
  if (search) filters.search = search

  const categories = searchParams.get('category')
  if (categories) filters.categories = categories.split(',')

  const colors = searchParams.get('colors')
  if (colors) filters.colors = colors.split(',')

  const materials = searchParams.get('materials')
  if (materials) filters.materials = materials.split(',')

  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  if (minPrice || maxPrice) {
    filters.priceRange = [
      minPrice ? parseInt(minPrice) : 0,
      maxPrice ? parseInt(maxPrice) : Infinity,
    ]
  }

  const sort = searchParams.get('sort') as SortOption
  if (sort) filters.sort = sort

  return filters
}

/**
 * Convert filter state to URL search params
 */
export function filtersToURLParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.categories?.length) params.set('category', filters.categories.join(','))
  if (filters.colors?.length) params.set('colors', filters.colors.join(','))
  if (filters.materials?.length) params.set('materials', filters.materials.join(','))
  if (filters.priceRange) {
    const [min, max] = filters.priceRange
    if (min > 0) params.set('minPrice', min.toString())
    if (max < Infinity) params.set('maxPrice', max.toString())
  }
  if (filters.sort) params.set('sort', filters.sort)

  return params
}
