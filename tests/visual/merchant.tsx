/** Test-only visual fixture. No real accounts, tokens or API requests. */
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../src/App'
import { ApiClient } from '../../src/api/client'
import type { Product } from '../../src/api/types'
import { SessionContext } from '../../src/auth/context'
import { SessionStore } from '../../src/auth/session'
import { json, login } from '../fixtures'
import '../../src/styles.css'
import './visual.css'

const brands = [
  { id: 3, name: 'The Linen Atelier', slug: 'linen-atelier', logoReference: null },
  { id: 4, name: 'Studio Form', slug: 'studio-form', logoReference: null },
]
let products: Product[] = [
  {
    id: 10,
    name: 'Everyday linen shirt',
    slug: 'everyday-linen-shirt',
    description: 'A relaxed silhouette in natural linen. Designed for effortless everyday wear.',
    brandId: 3,
    brandName: brands[0].name,
    categoryId: 2,
    categoryName: 'Clothing',
    price: 4500,
    currency: 'PKR',
    availability: 'AVAILABLE',
    publicationStatus: 'PUBLISHED',
    stockQuantity: 28,
    createdAt: '2026-10-19T10:00:00',
    updatedAt: '2026-10-19T10:00:00',
  },
  {
    id: 11,
    name: 'Signature woven scarf',
    slug: 'signature-woven-scarf',
    description: 'A soft, considered finishing touch.',
    brandId: 3,
    brandName: brands[0].name,
    categoryId: 2,
    categoryName: 'Clothing',
    price: 2200,
    currency: 'PKR',
    availability: 'AVAILABLE',
    publicationStatus: 'DRAFT',
    stockQuantity: 3,
    createdAt: '2026-10-19T10:00:00',
    updatedAt: '2026-10-19T10:00:00',
  },
  {
    id: 12,
    name: 'Weekend canvas tote',
    slug: 'weekend-canvas-tote',
    description: '',
    brandId: 3,
    brandName: brands[0].name,
    categoryId: 2,
    categoryName: 'Clothing',
    price: 1800,
    currency: 'PKR',
    availability: 'UNAVAILABLE',
    publicationStatus: 'UNPUBLISHED',
    stockQuantity: 0,
    createdAt: '2026-10-19T10:00:00',
    updatedAt: '2026-10-19T10:00:00',
  },
]
window.fetch = async (input, init = {}) => {
  const url = new URL(String(input))
  const path = url.pathname.replace('/api/v1', '')
  if (path === '/auth/login') return json(login)
  if (path === '/merchant/brands') return json(brands)
  if (path === '/categories')
    return json({
      content: [{ id: 2, name: 'Clothing', status: 'ACTIVE' }],
      page: 0,
      totalPages: 1,
    })
  const match = path.match(/^\/merchant\/brands\/(\d+)\/products(?:\/(\d+))?(?:\/(\w+))?$/)
  if (!match) return json({}, 404)
  const brand = Number(match[1])
  const id = Number(match[2])
  const action = match[3]
  const body = init.body ? JSON.parse(String(init.body)) : undefined
  if (init.method === 'POST') {
    const p = { ...products[0], ...body, id: 20, publicationStatus: 'DRAFT', stockQuantity: 0 }
    products.push(p)
    return json(p, 201)
  }
  let p = products.find((p) => p.id === id && p.brandId === brand)
  if (action === 'stock' && p) {
    if (init.method === 'PUT') p.stockQuantity = body.stockQuantity
    return json({ productId: id, stockQuantity: p.stockQuantity })
  }
  if (init.method === 'PUT' && p) {
    p = { ...p, ...body }
    products = products.map((item) => (item.id === id ? p! : item))
    return json(p)
  }
  if (init.method === 'PATCH' && p) {
    p.publicationStatus =
      action === 'publish' ? 'PUBLISHED' : action === 'unpublish' ? 'UNPUBLISHED' : 'DEACTIVATED'
    return json(p)
  }
  if (id) return p ? json(p) : json({}, 404)
  const list = products.filter((p) => p.brandId === brand)
  return json({
    content: list,
    page: 0,
    size: 50,
    totalElements: list.length,
    totalPages: list.length ? 1 : 0,
  })
}
const store = new SessionStore(new ApiClient('https://visual-test.example.invalid/api/v1'))
await store.login(login.account.email, 'visual-fixture-only', 'merchant')
createRoot(document.getElementById('root')!).render(
  <SessionContext value={store}>
    <div role="status" className="visual-test-banner">
      Synthetic merchant preview · mocked API · no live database
    </div>
    <MemoryRouter initialEntries={['/brands/3/products']}>
      <App />
    </MemoryRouter>
  </SessionContext>,
)
