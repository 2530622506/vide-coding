import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { ScrollToTop } from '@/components/ScrollToTop'
import { HomePage } from '@/pages/HomePage'
import { ShopPage } from '@/pages/ShopPage'
import { ProductPage } from '@/pages/ProductPage'
import { CartPage } from '@/pages/CartPage'

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-semibold text-neutral-900 mb-4">404</h1>
        <p className="text-neutral-600 mb-6">Page not found</p>
        <a href="/" className="text-primary-600 hover:text-primary-700">
          Go back home
        </a>
      </div>
    </div>
  )
}

export function App() {
  // 使用环境变量来设置 basename，生产环境使用仓库名
  const basename = import.meta.env.MODE === 'production' ? '/vide-coding' : '/'

  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/products/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}
