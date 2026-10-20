import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { ApiClient } from '../src/api/client'
import type { Product } from '../src/api/types'
import { SessionContext } from '../src/auth/context'
import { SessionStore } from '../src/auth/session'
import { stockLabel, validPrice, validQuantity } from '../src/merchant/validation'
import { identity, json, login } from './fixtures'

const brands = [
  { id: 3, name: 'Atelier A', slug: 'atelier-a', logoReference: null },
  { id: 4, name: 'Studio B', slug: 'studio-b', logoReference: null },
]
export const product: Product = {
  id: 10,
  brandId: 3,
  brandName: 'Atelier A',
  name: 'Linen shirt',
  slug: 'linen-shirt',
  description: 'Pure linen',
  categoryId: 2,
  categoryName: 'Clothing',
  price: 2500,
  currency: 'PKR',
  availability: 'AVAILABLE',
  publicationStatus: 'DRAFT',
  stockQuantity: 4,
  createdAt: '2026-10-19T10:00:00',
  updatedAt: '2026-10-19T10:00:00',
}
const stores: SessionStore[] = []
afterEach(() => {
  stores.forEach((s) => s.logout())
  stores.length = 0
  vi.unstubAllGlobals()
})
function backend() {
  const state = {
    products: [{ ...product }],
    brands: [...brands],
    failure: 0,
    stock: 4,
    categories: [{ id: 2, name: 'Clothing', status: 'ACTIVE' }],
    pageCount: 1,
    readStatus: 200,
  }
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (raw: string, init: RequestInit = {}) => {
      const url = new URL(raw)
      const path = url.pathname.replace('/api/v1', '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path: path + url.search, method, body })
      if (path === '/auth/login') return json(login)
      if (path === '/super-admin/identity') return json(identity)
      if (path === '/merchant/brands') return json(state.brands)
      if (path === '/categories') return json({ content: state.categories, page: 0, totalPages: 1 })
      if (state.readStatus !== 200 && method === 'GET')
        return json({ message: 'DO-NOT-ECHO' }, state.readStatus)
      if (method !== 'GET' && state.failure) return json({ message: 'DO-NOT-ECHO' }, state.failure)
      const match = path.match(/^\/merchant\/brands\/(\d+)\/products(?:\/(\d+))?(?:\/(\w+))?$/)
      if (!match) throw new Error(`Unexpected mock route ${path}`)
      const brand = Number(match[1])
      const id = Number(match[2])
      const action = match[3]
      if (action === 'stock') {
        if (method === 'PUT') {
          state.stock = body.stockQuantity
          const p = state.products.find((p) => p.id === id)
          if (p) p.stockQuantity = state.stock
        }
        return json({ productId: id, stockQuantity: state.stock })
      }
      if (method === 'POST') {
        const created = { ...product, ...body, id: 11 }
        state.products.push(created)
        return json(created, 201)
      }
      if (method === 'PUT') {
        state.products[0] = { ...state.products[0], ...body }
        return json(state.products[0])
      }
      if (method === 'PATCH') {
        state.products[0].publicationStatus =
          action === 'publish'
            ? 'PUBLISHED'
            : action === 'unpublish'
              ? 'UNPUBLISHED'
              : 'DEACTIVATED'
        return json(state.products[0])
      }
      if (id)
        return json(
          state.products.find((p) => p.id === id),
          200,
        )
      const page = Number(url.searchParams.get('page'))
      return json({
        content: state.products.filter((p) => p.brandId === brand),
        page,
        size: 50,
        totalElements: state.products.length,
        totalPages: state.pageCount,
      })
    }),
  )
  return { state, calls }
}
async function open(path: string, mode: 'merchant' | 'admin' = 'merchant') {
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  stores.push(store)
  await store.login('synthetic@example.invalid', 'test-only', mode)
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  return store
}
describe('merchant catalogue and inventory', () => {
  it.each([
    [2750.5, 'Rs 2,750.50', '2750.50'],
    [2750.0, 'Rs 2,750.00', '2750.00'],
    [0.5, 'Rs 0.50', '0.50'],
    [999999.99, 'Rs 999,999.99', '999999.99'],
  ] as const)('preserves %s in list, detail and editing', async (amount, formatted, input) => {
    const { state, calls } = backend()
    state.products[0].price = amount
    await open('/brands/3/products')
    await screen.findByText(formatted, { exact: true })
    fireEvent.click(screen.getByRole('link', { name: 'Linen shirt' }))
    await screen.findByText(formatted, { exact: true })
    fireEvent.click(screen.getByRole('button', { name: 'Edit product' }))
    await screen.findByRole('option', { name: 'Clothing' })
    expect(screen.getByLabelText('Price (PKR)')).toHaveValue(input)
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }))
    await screen.findByText(formatted, { exact: true })
    expect(calls.find((c) => c.method === 'PUT')?.body?.price).toBe(amount)
  })
  it.each([
    [2750.5, 'Rs 2,750.50'],
    [2750.0, 'Rs 2,750.00'],
    [0.5, 'Rs 0.50'],
    [999999.99, 'Rs 999,999.99'],
  ] as const)('preserves %s through product creation', async (amount, formatted) => {
    const { calls } = backend()
    await open('/brands/3/products/new')
    await screen.findByRole('option', { name: 'Clothing' })
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Precision fixture' },
    })
    fireEvent.change(screen.getByLabelText('Product slug'), {
      target: { value: 'precision-fixture' },
    })
    fireEvent.change(screen.getByLabelText('Price (PKR)'), { target: { value: amount.toFixed(2) } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }))
    await screen.findByRole('heading', { name: 'Precision fixture' })
    await screen.findByText(formatted, { exact: true })
    expect(
      calls.find((c) => c.method === 'POST' && c.path.endsWith('/products'))?.body?.price,
    ).toBe(amount)
  })
  it('switches only between assigned brands and clears old products', async () => {
    const { calls } = backend()
    await open('/brands/3')
    await screen.findByRole('link', { name: 'Linen shirt' })
    fireEvent.change(screen.getByLabelText('Assigned brand'), { target: { value: '4' } })
    await screen.findByRole('heading', { name: 'Studio B' })
    await screen.findByText('Your catalogue starts here')
    expect(screen.queryByRole('link', { name: 'Linen shirt' })).not.toBeInTheDocument()
    expect(calls.some((c) => c.path.startsWith('/merchant/brands/4/products'))).toBe(true)
  })
  it('blocks a manually entered unassigned brand without fetching its products', async () => {
    const { calls } = backend()
    await open('/brands/999/products')
    await screen.findByText('Brand access unavailable')
    expect(calls.some((c) => c.path.includes('/999/'))).toBe(false)
  })
  it('does not send merchant requests from an admin-only session', async () => {
    const { calls } = backend()
    await open('/brands/3', 'admin')
    await screen.findByText('Merchant workspace required')
    expect(calls.some((c) => c.path.startsWith('/merchant/'))).toBe(false)
  })
  it('lists prices, statuses, scoped summaries and filters on the current page', async () => {
    backend()
    await open('/brands/3/products')
    await screen.findByRole('link', { name: 'Linen shirt' })
    expect(screen.getByText('4 units')).toBeInTheDocument()
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Search this page'), { target: { value: 'absent' } })
    expect(screen.getByText('No matching products on this page')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search this page'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Publication status'), {
      target: { value: 'PUBLISHED' },
    })
    expect(screen.queryByRole('link', { name: 'Linen shirt' })).not.toBeInTheDocument()
  })
  it('paginates through the real brand-scoped list', async () => {
    const { state, calls } = backend()
    state.pageCount = 2
    await open('/brands/3/products')
    await screen.findByRole('link', { name: 'Linen shirt' })
    fireEvent.click(screen.getByText('Next page'))
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('page=1&size=50'))).toBe(true))
  })
  it('creates a draft with the route brand, category, pricing and availability', async () => {
    const { calls } = backend()
    await open('/brands/3/products/new')
    await screen.findByRole('option', { name: 'Clothing' })
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Silk scarf' } })
    fireEvent.change(screen.getByLabelText('Product slug'), { target: { value: 'silk-scarf' } })
    fireEvent.change(screen.getByLabelText('Price (PKR)'), { target: { value: '999.50' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } })
    fireEvent.click(screen.getByText('Create product'))
    await screen.findByRole('heading', { name: 'Silk scarf' })
    expect(
      calls.find((c) => c.method === 'POST' && c.path.endsWith('/products'))?.body,
    ).toMatchObject({ brandId: 3, categoryId: 2, price: 999.5, availability: 'AVAILABLE' })
  })
  it('edits product fields without changing brand or stock', async () => {
    const { calls } = backend()
    await open('/brands/3/products/10')
    fireEvent.click(await screen.findByText('Edit product'))
    await screen.findByRole('option', { name: 'Clothing' })
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Updated shirt' } })
    fireEvent.click(screen.getByText('Save product'))
    await screen.findByRole('heading', { name: 'Updated shirt' })
    const request = calls.find((c) => c.method === 'PUT')
    expect(request?.path).toBe('/merchant/brands/3/products/10')
    expect(request?.body).not.toHaveProperty('stockQuantity')
  })
  it('blocks invalid forms and missing active categories', async () => {
    const { state, calls } = backend()
    state.categories = []
    await open('/brands/3/products/new')
    await screen.findByText(/No active categories/)
    expect(screen.getByText('Create product')).toBeDisabled()
    expect(calls.filter((c) => c.method === 'POST' && c.path.endsWith('/products'))).toHaveLength(0)
  })
  it('validates product fields before allowing creation and preserves a conflicting draft', async () => {
    const { state, calls } = backend()
    await open('/brands/3/products/new')
    await screen.findByRole('option', { name: 'Clothing' })
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Silk scarf' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Product slug'), { target: { value: 'INVALID SLUG' } })
    fireEvent.change(screen.getByLabelText('Price (PKR)'), { target: { value: '-5' } })
    expect(screen.getByText('Create product')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Product slug'), { target: { value: 'silk-scarf' } })
    fireEvent.change(screen.getByLabelText('Price (PKR)'), { target: { value: '5.001' } })
    expect(screen.getByText('Create product')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Price (PKR)'), { target: { value: '5.00' } })
    state.failure = 409
    fireEvent.click(screen.getByText('Create product'))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Product name')).toHaveValue('Silk scarf')
    expect(screen.queryByText('DO-NOT-ECHO')).not.toBeInTheDocument()
    expect(
      calls.filter((c) => c.path === '/merchant/brands/3/products' && c.method === 'POST'),
    ).toHaveLength(1)
  })
  it('restricts the category exception to reads and fixes payload brand to route brand', async () => {
    const { calls } = backend()
    const store = await open('/brands/3/products')
    await screen.findByRole('link', { name: 'Linen shirt' })
    await store.api.categories()
    await expect(
      store.request('/categories?page=0&size=100', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 403 })
    await store.api.saveProduct(3, { ...product, brandId: 4 })
    expect(
      calls.find((c) => c.path === '/merchant/brands/3/products' && c.method === 'POST')?.body
        ?.brandId,
    ).toBe(3)
    expect(calls.some((c) => c.path === '/categories?page=0&size=100' && c.method === 'POST')).toBe(
      false,
    )
  })
  it('updates stock using separate GET and PUT stock endpoints', async () => {
    const { state, calls } = backend()
    await open('/brands/3/products/10')
    const input = await screen.findByLabelText('Stock quantity')
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.click(screen.getByText('Save stock'))
    await screen.findByText(/Stock saved/)
    await screen.findByText(/12 units/)
    expect(state.stock).toBe(12)
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ stockQuantity: 12 })
  })
  it('detects changed stock before writing and requires a refresh', async () => {
    const { state, calls } = backend()
    state.stock = 8
    await open('/brands/3/products/10')
    fireEvent.change(await screen.findByLabelText('Stock quantity'), { target: { value: '12' } })
    fireEvent.click(screen.getByText('Save stock'))
    await screen.findByText(/Stock changed since this page loaded/)
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })
  it('requires confirmation for deactivation and locks the resulting record', async () => {
    const { calls } = backend()
    await open('/brands/3/products/10')
    fireEvent.click(await screen.findByText('Deactivate'))
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false)
    expect(screen.getByText(/Deactivation is permanent/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deactivate' }))
    await screen.findByText(/This product is permanently deactivated/)
    expect(screen.getByText('Edit product')).toBeDisabled()
    expect(screen.getByText('Save stock')).toBeDisabled()
  })
  it('supports publication and unpublication through confirmation', async () => {
    const { calls } = backend()
    await open('/brands/3/products/10')
    fireEvent.click(await screen.findByText('Publish'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }))
    await screen.findByText('PUBLISHED')
    fireEvent.click(screen.getByText('Unpublish'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm unpublish' }))
    await screen.findByText('UNPUBLISHED')
    expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.path)).toEqual([
      '/merchant/brands/3/products/10/publish',
      '/merchant/brands/3/products/10/unpublish',
    ])
  })
  it.each([400, 409, 500])(
    'handles stock HTTP %s without leaking backend diagnostics',
    async (status) => {
      const { state } = backend()
      state.failure = status
      await open('/brands/3/products/10')
      fireEvent.click(await screen.findByText('Save stock'))
      await screen.findByRole('alert')
      expect(screen.queryByText('DO-NOT-ECHO')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Stock quantity')).toHaveValue(4)
    },
  )
  it.each([401, 403])(
    'ends the session on denied/revoked/inactive access HTTP %s',
    async (status) => {
      const { state } = backend()
      state.readStatus = status
      const store = await open('/brands/3/products')
      await screen.findByRole('heading', { name: 'Enter your workspace' })
      expect(store.snapshot()).toBeNull()
    },
  )
  it('rejects a backend product belonging to another brand without rendering it', async () => {
    const { state } = backend()
    state.products[0].brandId = 4
    await open('/brands/3/products/10')
    await screen.findByRole('alert')
    expect(screen.queryByRole('heading', { name: 'Linen shirt' })).not.toBeInTheDocument()
  })
  it('clears merchant content after logout', async () => {
    backend()
    const store = await open('/brands/3/products')
    await screen.findByRole('link', { name: 'Linen shirt' })
    act(() => store.logout())
    await screen.findByRole('heading', { name: 'Enter your workspace' })
    expect(screen.queryByText('Linen shirt')).not.toBeInTheDocument()
  })
})
describe('backend numeric constraints', () => {
  it.each(['-1', '1.5', '', '2147483648', '1e2', 'NaN'])(
    'rejects invalid integer quantity %s',
    (value) => expect(validQuantity(value)).toBe(false),
  )
  it.each(['0', '5', '2147483647'])('accepts quantity %s', (value) =>
    expect(validQuantity(value)).toBe(true),
  )
  it.each(['-1', '1.001', '10000000000', '1e3', ''])('rejects price %s', (value) =>
    expect(validPrice(value)).toBe(false),
  )
  it.each(['0', '0.00', '9999999999.99'])('accepts price %s', (value) =>
    expect(validPrice(value)).toBe(true),
  )
  it('distinguishes stock states without changing availability', () => {
    expect(stockLabel(0)).toBe('Out of stock')
    expect(stockLabel(5)).toBe('Low stock')
    expect(stockLabel(6)).toBe('In stock')
  })
})
