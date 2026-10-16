import type { Product } from '@/types/product'

/**
 * Mock product data for demonstration
 * Images are placeholder paths - will be replaced with actual Pexels licensed images
 */
export const products: Product[] = [
  {
    id: '1',
    slug: 'modern-fabric-sofa',
    name: 'Modern Fabric Sofa',
    category: 'living-room',
    price: 89900, // $899.00
    images: ['/images/products/sofa-1.jpg'],
    shortDescription: 'Comfortable 3-seater sofa with clean lines and neutral tones',
    description: 'A modern sofa designed for comfort and style. Perfect for contemporary living spaces.',
    material: 'Fabric',
    colors: ['Beige', 'Gray', 'Navy'],
    rating: 4.5,
    reviewCount: 128,
    createdAt: '2026-09-15',
    featuredRank: 1,
  },
  {
    id: '2',
    slug: 'wooden-coffee-table',
    name: 'Wooden Coffee Table',
    category: 'living-room',
    price: 34900,
    images: ['/images/products/table-1.jpg'],
    shortDescription: 'Solid wood coffee table with minimalist design',
    material: 'Wood',
    colors: ['Natural Oak', 'Walnut'],
    rating: 4.7,
    reviewCount: 89,
    createdAt: '2026-08-20',
    featuredRank: 2,
  },
  {
    id: '3',
    slug: 'ceramic-table-lamp',
    name: 'Ceramic Table Lamp',
    category: 'lighting',
    price: 12900,
    images: ['/images/products/lamp-1.jpg'],
    shortDescription: 'Elegant ceramic base with linen shade',
    material: 'Ceramic',
    colors: ['White', 'Terracotta'],
    rating: 4.3,
    reviewCount: 45,
    createdAt: '2026-09-01',
    featuredRank: 3,
  },
  {
    id: '4',
    slug: 'cotton-bed-sheets-set',
    name: 'Cotton Bed Sheets Set',
    category: 'bedroom',
    price: 7900,
    images: ['/images/products/sheets-1.jpg'],
    shortDescription: '100% organic cotton, queen size bedding set',
    material: 'Cotton',
    colors: ['White', 'Ivory', 'Light Gray'],
    rating: 4.6,
    reviewCount: 234,
    createdAt: '2026-07-10',
  },
  {
    id: '5',
    slug: 'wall-mounted-shelf',
    name: 'Wall Mounted Shelf',
    category: 'home-decor',
    price: 5900,
    images: ['/images/products/shelf-1.jpg'],
    shortDescription: 'Floating wooden shelf, perfect for books and decor',
    material: 'Wood',
    colors: ['Natural', 'Black', 'White'],
    rating: 4.4,
    reviewCount: 67,
    createdAt: '2026-08-05',
  },
  {
    id: '6',
    slug: 'dining-chair-set',
    name: 'Dining Chair Set (4 pieces)',
    category: 'kitchen-dining',
    price: 54900,
    images: ['/images/products/chairs-1.jpg'],
    shortDescription: 'Comfortable upholstered dining chairs with wooden legs',
    material: 'Fabric',
    colors: ['Charcoal', 'Cream', 'Sage Green'],
    rating: 4.5,
    reviewCount: 92,
    createdAt: '2026-09-20',
  },
  {
    id: '7',
    slug: 'ceramic-vase',
    name: 'Handcrafted Ceramic Vase',
    category: 'home-decor',
    price: 4900,
    images: ['/images/products/vase-1.jpg'],
    shortDescription: 'Artisan ceramic vase with organic shape',
    material: 'Ceramic',
    colors: ['White', 'Terracotta', 'Black'],
    rating: 4.8,
    reviewCount: 156,
    createdAt: '2026-10-01',
    featuredRank: 4,
  },
  {
    id: '8',
    slug: 'bath-towel-set',
    name: 'Luxury Bath Towel Set',
    category: 'bath',
    price: 6900,
    images: ['/images/products/towels-1.jpg'],
    shortDescription: 'Premium cotton towels, ultra-absorbent and soft',
    material: 'Cotton',
    colors: ['White', 'Gray', 'Navy'],
    rating: 4.7,
    reviewCount: 178,
    createdAt: '2026-08-15',
  },
]

/**
 * Get all unique materials from products
 */
export function getAllMaterials(): string[] {
  const materials = new Set<string>()
  products.forEach(p => {
    if (p.material) materials.add(p.material)
  })
  return Array.from(materials).sort()
}

/**
 * Get all unique colors from products
 */
export function getAllColors(): string[] {
  const colors = new Set<string>()
  products.forEach(p => {
    if (p.colors) p.colors.forEach(c => colors.add(c))
  })
  return Array.from(colors).sort()
}
