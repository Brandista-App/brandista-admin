import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { ApiClient } from '../src/api/client'
import type { FulfillmentStatus } from '../src/api/types'
import { SessionContext } from '../src/auth/context'
import { SessionStore } from '../src/auth/session'
import { identity, json, login } from './fixtures'
import { orderBrands, orderDetail } from './order-fixtures'

const stores: SessionStore[] = []
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
    },
  })
})
afterEach(() => {
  stores.forEach((s) => s.logout())
  stores.length = 0
  vi.unstubAllGlobals()
})
function backend() {
  const state = {
    detail: orderDetail(),
    failure: 0,
    readStatus: 200,
    pages: 2,
    empty: false,
    foreign: false,
    brands: [...orderBrands],
    mutate: undefined as undefined | (() => Promise<Response>),
    read: undefined as undefined | (() => Promise<Response>),
  }
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (raw: string, init: RequestInit = {}) => {
      const url = new URL(raw)
      const path = url.pathname.replace('/api/v1', '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ path: path + url.search, method, body })
      if (path === '/auth/login') return json(login)
      if (path === '/super-admin/identity') return json(identity)
      if (path === '/merchant/brands') return json(state.brands)
      const match = path.match(/^\/merchant\/brands\/(\d+)\/orders(?:\/(\d+))?(?:\/fulfillment)?$/)
      if (!match) return json({}, 404)
      const brand = Number(match[1])
      const id = Number(match[2])
      if (method === 'POST') {
        if (state.mutate) return state.mutate()
        if (state.failure) return json({ message: 'SECRET-DO-NOT-ECHO' }, state.failure)
        const previous = state.detail.order.fulfillmentStatus
        state.detail.order.fulfillmentStatus = body.status
        state.detail.order.version++
        const statuses: FulfillmentStatus[] = [
          'PLACED',
          'ACCEPTED',
          'PACKED',
          'SHIPPED',
          'DELIVERED',
        ]
        state.detail.order.availableTransitions = statuses.slice(
          statuses.indexOf(body.status) + 1,
          statuses.indexOf(body.status) + 2,
        )
        state.detail.timeline.push({
          fromStatus: previous,
          toStatus: body.status,
          version: state.detail.order.version,
          occurredAt: '2026-10-21T11:00:00',
        })
        return json(state.detail)
      }
      if (state.readStatus !== 200) return json({ message: 'SECRET-DO-NOT-ECHO' }, state.readStatus)
      if (id) {
        if (state.read) return state.read()
        return json(
          state.foreign ? orderDetail(4, id) : brand === 3 ? state.detail : orderDetail(brand, id),
        )
      }
      const page = Number(url.searchParams.get('page'))
      const summary = {
        ...state.detail.order,
        brandId: state.foreign ? 4 : brand,
        orderId: 701 + page,
      }
      const filtered = url.searchParams.get('status')
      const content =
        state.empty || (filtered && filtered !== summary.fulfillmentStatus) ? [] : [summary]
      return json({
        content,
        page,
        size: 20,
        totalPages: content.length ? state.pages : 0,
        totalElements: content.length ? 21 : 0,
      })
    }),
  )
  return { state, calls }
}
async function open(path = '/brands/3/orders', mode: 'merchant' | 'admin' = 'merchant') {
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
async function confirm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Accept order' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm fulfillment update' }))
}
describe('merchant orders', () => {
  it('discards a late old-brand detail after brand switching', async () => {
    const { state } = backend()
    let resolve!: (response: Response) => void
    state.read = () =>
      new Promise<Response>((done) => {
        resolve = done
      })
    await open('/brands/3/orders/701')
    await waitFor(() => expect(resolve).toBeTypeOf('function'))
    fireEvent.change(screen.getByLabelText('Assigned brand'), { target: { value: '4' } })
    await screen.findByRole('link', { name: 'Order #701' })
    await act(async () => {
      resolve(json(orderDetail()))
    })
    expect(screen.queryByText('Brand A linen shirt')).not.toBeInTheDocument()
    expect(screen.queryByText('Synthetic Recipient')).not.toBeInTheDocument()
  })
  it('does not request malformed order identifiers', async () => {
    const { calls } = backend()
    await open('/brands/3/orders/not-an-id')
    await screen.findByRole('alert')
    expect(calls.some((c) => c.path.includes('/orders/'))).toBe(false)
  })
  it('rejects a backend response offering an unsupported skipped transition', async () => {
    const { state } = backend()
    state.detail.order.availableTransitions = ['SHIPPED']
    await open('/brands/3/orders/701')
    await screen.findByRole('alert')
    expect(screen.queryByText('Synthetic Recipient')).not.toBeInTheDocument()
  })
  it('lists actual contract fields, supported counts and paginates', async () => {
    const { calls } = backend()
    await open()
    await screen.findByRole('link', { name: 'Order #701' })
    expect(screen.getByText('Rs 2,750.50')).toBeInTheDocument()
    expect(screen.getByText('21 orders for Atelier A')).toBeInTheDocument()
    expect(screen.queryByText('Synthetic Recipient')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next orders' }))
    await screen.findByRole('link', { name: 'Order #702' })
    expect(calls.some((c) => c.path === '/merchant/brands/3/orders?page=1&size=20')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Previous orders' }))
    await screen.findByRole('link', { name: 'Order #701' })
  })
  it('filters server-side and resets page without keeping stale rows', async () => {
    const { calls } = backend()
    await open()
    await screen.findByText('Order #701')
    fireEvent.click(screen.getByRole('button', { name: 'Next orders' }))
    await screen.findByText('Order #702')
    fireEvent.change(screen.getByLabelText('Fulfillment status'), { target: { value: 'PACKED' } })
    await screen.findByText('No orders to show')
    expect(screen.queryByText('Order #702')).not.toBeInTheDocument()
    expect(calls.at(-1)?.path).toBe('/merchant/brands/3/orders?page=0&size=20&status=PACKED')
  })
  it('shows a useful empty state and no invented financial metrics', async () => {
    const { state } = backend()
    state.empty = true
    await open()
    await screen.findByText('No orders to show')
    expect(screen.getByText('0 orders for Atelier A')).toBeInTheDocument()
    expect(screen.queryByText(/payout/i)).not.toBeInTheDocument()
  })
  it.each([
    [2750.5, 'Rs 2,750.50'],
    [2750, 'Rs 2,750.00'],
    [0.5, 'Rs 0.50'],
    [999999.99, 'Rs 999,999.99'],
  ] as const)('formats %s across detail prices and subtotal', async (amount, formatted) => {
    const { state } = backend()
    state.detail.order.itemsSubtotal = amount
    state.detail.items[0].unitPrice = amount
    state.detail.items[0].lineSubtotal = amount
    await open('/brands/3/orders/701')
    await screen.findByText('Brand A linen shirt')
    expect(screen.getAllByText(formatted)).toHaveLength(3)
    expect(screen.getByText('Synthetic Recipient')).toBeInTheDocument()
    expect(screen.getByText('Synthetic delivery note')).toBeInTheDocument()
    expect(screen.queryByText('Brand B scarf')).not.toBeInTheDocument()
  })
  it('requires confirmation and cancellation sends no mutation', async () => {
    const { calls } = backend()
    await open('/brands/3/orders/701')
    fireEvent.click(await screen.findByRole('button', { name: 'Accept order' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/does not book a courier/)).toBeInTheDocument()
    expect(
      calls.filter((c) => c.method === 'POST' && c.path.endsWith('/fulfillment')),
    ).toHaveLength(0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep current status' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept order' })).toHaveFocus()
  })
  it('submits only the selected brand, returned transition and current version', async () => {
    const { state, calls } = backend()
    state.detail.order.version = 7
    await open('/brands/3/orders/701')
    await confirm()
    await screen.findByText(/Fulfillment updated/)
    await screen.findByRole('button', { name: 'Mark as packed' })
    const mutation = calls.find((c) => c.path.endsWith('/fulfillment'))
    expect(mutation).toEqual({
      path: '/merchant/brands/3/orders/701/fulfillment',
      method: 'POST',
      body: { status: 'ACCEPTED', expectedVersion: 7 },
    })
    expect(screen.getByText('PLACED → ACCEPTED')).toBeInTheDocument()
  })
  it.each(['ACCEPTED', 'PACKED', 'SHIPPED'] as const)(
    'renders only the returned action after %s',
    async (status) => {
      const { state } = backend()
      const states: FulfillmentStatus[] = ['PLACED', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED']
      state.detail.order.fulfillmentStatus = status
      state.detail.order.availableTransitions = [states[states.indexOf(status) + 1]]
      await open('/brands/3/orders/701')
      await screen.findByText('Brand A linen shirt')
      expect(screen.queryByRole('button', { name: 'Accept order' })).not.toBeInTheDocument()
      expect(
        screen.getAllByRole('button').filter((b) => b.classList.contains('primary')),
      ).toHaveLength(1)
    },
  )
  it('has no transition for delivered and explains settlement boundary', async () => {
    const { state } = backend()
    state.detail.order.fulfillmentStatus = 'DELIVERED'
    state.detail.order.availableTransitions = []
    await open('/brands/3/orders/701')
    await screen.findByText('Brand A linen shirt')
    expect(screen.getByText(/Delivered is a merchant fulfillment attestation/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mark as/ })).not.toBeInTheDocument()
  })
  it('blocks duplicate submits while the first request is unresolved', async () => {
    const { state, calls } = backend()
    let resolve!: (response: Response) => void
    state.mutate = () =>
      new Promise<Response>((done) => {
        resolve = done
      })
    await open('/brands/3/orders/701')
    await confirm()
    const button = screen.getByRole('button', { name: 'Updating fulfillment…' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(calls.filter((c) => c.path.endsWith('/fulfillment'))).toHaveLength(1)
    await act(async () => {
      resolve(json(state.detail))
    })
    await screen.findByText(/Fulfillment updated/)
  })
  it('refreshes on 409 and requires a new confirmation with the latest version', async () => {
    const { state, calls } = backend()
    state.failure = 409
    await open('/brands/3/orders/701')
    await screen.findByText('Brand A linen shirt')
    state.detail.order.fulfillmentStatus = 'ACCEPTED'
    state.detail.order.version = 9
    state.detail.order.availableTransitions = ['PACKED']
    await confirm()
    await screen.findByText(/This order changed/)
    await screen.findByRole('button', { name: 'Mark as packed' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.filter((c) => c.path.endsWith('/fulfillment'))).toHaveLength(1)
    state.failure = 0
    fireEvent.click(screen.getByRole('button', { name: 'Mark as packed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm fulfillment update' }))
    await screen.findByText(/Fulfillment updated/)
    expect(calls.filter((c) => c.path.endsWith('/fulfillment')).at(-1)?.body).toEqual({
      status: 'PACKED',
      expectedVersion: 9,
    })
  })
  it.each([400, 500])('shows sanitized mutation error %s', async (code) => {
    const { state } = backend()
    state.failure = code
    await open('/brands/3/orders/701')
    await confirm()
    await screen.findByRole('alert')
    expect(screen.queryByText('SECRET-DO-NOT-ECHO')).not.toBeInTheDocument()
  })
  it.each([401, 403])('clears disabled or revoked sessions on mutation %s', async (code) => {
    const { state } = backend()
    state.failure = code
    const store = await open('/brands/3/orders/701')
    await confirm()
    await screen.findByRole('heading', { name: 'Enter your workspace' })
    expect(store.snapshot()).toBeNull()
    expect(screen.queryByText('Synthetic Recipient')).not.toBeInTheDocument()
  })
  it.each([401, 403])('clears disabled, revoked or inactive read access on %s', async (code) => {
    const { state } = backend()
    state.readStatus = code
    const store = await open('/brands/3/orders/701')
    await screen.findByRole('heading', { name: 'Enter your workspace' })
    expect(store.snapshot()).toBeNull()
  })
  it.each([404, 500])('provides retry for failed reads %s', async (code) => {
    const { state } = backend()
    state.readStatus = code
    await open('/brands/3/orders/701')
    await screen.findByRole('alert')
    state.readStatus = 200
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('Brand A linen shirt')
  })
  it('rejects foreign-brand summaries before rendering', async () => {
    const { state } = backend()
    state.foreign = true
    await open()
    await screen.findByRole('alert')
    expect(screen.queryByText('Order #701')).not.toBeInTheDocument()
  })
  it('rejects a foreign-brand line in an otherwise matching detail', async () => {
    const { state } = backend()
    state.detail.items[0].brandId = 4
    state.detail.items[0].productName = 'FOREIGN-SECRET'
    await open('/brands/3/orders/701')
    await screen.findByRole('alert')
    expect(screen.queryByText('FOREIGN-SECRET')).not.toBeInTheDocument()
    expect(screen.queryByText('Synthetic Recipient')).not.toBeInTheDocument()
  })
  it('does not request an unassigned brand or malformed order ID', async () => {
    const { calls } = backend()
    await open('/brands/999/orders/701')
    await screen.findByText('Brand access unavailable')
    expect(calls.some((c) => c.path.includes('/brands/999/'))).toBe(false)
  })
  it('switching brands clears details and confirmation immediately', async () => {
    const { calls } = backend()
    await open('/brands/3/orders/701')
    fireEvent.click(await screen.findByRole('button', { name: 'Accept order' }))
    fireEvent.change(screen.getByLabelText('Assigned brand'), { target: { value: '4' } })
    expect(screen.queryByText('Brand A linen shirt')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await screen.findByRole('link', { name: 'Order #701' })
    expect(calls.some((c) => c.path.startsWith('/merchant/brands/4/orders?'))).toBe(true)
    expect(calls.some((c) => c.path.endsWith('/fulfillment'))).toBe(false)
  })
  it('customer without assignments cannot create a merchant session', async () => {
    const { state } = backend()
    state.brands = []
    const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
    stores.push(store)
    await expect(
      store.login('customer@example.invalid', 'test-only', 'merchant'),
    ).rejects.toMatchObject({ status: 403 })
    expect(store.snapshot()).toBeNull()
  })
  it('super-admin mode cannot open merchant management without merchant sign-in', async () => {
    const { calls } = backend()
    await open('/brands/3/orders', 'admin')
    await screen.findByText('Merchant workspace required')
    expect(calls.some((c) => c.path.includes('/orders'))).toBe(false)
  })
})
