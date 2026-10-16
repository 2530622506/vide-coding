export interface Product {
  id: string
  slug: string
  name: string
  category: string
  price: number // USD in cents
  images: string[]
  shortDescription: string
  description?: string
  material?: string
  colors?: string[]
  rating?: number
  reviewCount?: number
  createdAt: string
  featuredRank?: number
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  color?: string
  size?: string
  price?: number // Optional price override
  inStock?: boolean
}

export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
}

export type Category = {
  id: string
  name: string
  slug: string
}

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc'

export interface FilterState {
  search?: string
  categories?: string[]
  priceRange?: [number, number]
  colors?: string[]
  materials?: string[]
  sort?: SortOption
}
