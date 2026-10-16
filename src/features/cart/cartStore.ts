import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/product'

interface CartState {
  items: CartItem[]
  addItem: (productId: string, variantId?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  getItemCount: () => number
}

const CART_VERSION = 1

/**
 * Shopping cart store with localStorage persistence
 * Cart data is validated on load; corrupt/outdated data falls back to empty cart
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, variantId) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === productId && item.variantId === variantId
          )

          if (existingIndex >= 0) {
            const newItems = [...state.items]
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + 1,
            }
            return { items: newItems }
          }

          return {
            items: [...state.items, { productId, variantId, quantity: 1 }],
          }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }

        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === productId && item.variantId === variantId
          )

          if (existingIndex >= 0) {
            const newItems = [...state.items]
            newItems[existingIndex] = { ...newItems[existingIndex], quantity }
            return { items: newItems }
          }

          return state
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'shopping-cart',
      version: CART_VERSION,
      // Validate persisted data; fallback to empty cart if corrupt
      migrate: (persistedState: unknown, version: number) => {
        if (version !== CART_VERSION) {
          return { items: [] }
        }

        if (
          !persistedState ||
          typeof persistedState !== 'object' ||
          !('items' in persistedState) ||
          !Array.isArray((persistedState as { items: unknown }).items)
        ) {
          return { items: [] }
        }

        return persistedState as CartState
      },
    }
  )
)
