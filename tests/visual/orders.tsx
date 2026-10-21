/** Test-only preview. All reads and mutations are synthetic; no live API/database. */
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../src/App'
import { ApiClient } from '../../src/api/client'
import type { FulfillmentStatus } from '../../src/api/types'
import { SessionContext } from '../../src/auth/context'
import { SessionStore } from '../../src/auth/session'
import { json, login } from '../fixtures'
import { orderBrands, orderDetail } from '../order-fixtures'
import '../../src/styles.css'
import './visual.css'

const details = [orderDetail(), orderDetail(3, 702), orderDetail(3, 703)]
details[1].order.fulfillmentStatus = 'PACKED'
details[1].order.version = 2
details[1].order.availableTransitions = ['SHIPPED']
details[1].timeline = [
  { fromStatus: 'PLACED', toStatus: 'ACCEPTED', version: 1, occurredAt: '2026-10-21T10:15:00' },
  { fromStatus: 'ACCEPTED', toStatus: 'PACKED', version: 2, occurredAt: '2026-10-21T11:00:00' },
]
details[2].order.fulfillmentStatus = 'DELIVERED'
details[2].order.version = 4
details[2].order.availableTransitions = []
window.fetch = async (raw, init = {}) => {
  const url = new URL(String(raw))
  const path = url.pathname.replace('/api/v1', '')
  if (path === '/auth/login') return json(login)
  if (path === '/merchant/brands') return json(orderBrands)
  const match = path.match(/^\/merchant\/brands\/(\d+)\/orders(?:\/(\d+))?(?:\/fulfillment)?$/)
  if (!match) return json({}, 404)
  if (Number(match[1]) !== 3)
    return json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
  if (!match[2]) {
    const content = details
      .map((d) => d.order)
      .filter(
        (o) =>
          !url.searchParams.get('status') || o.fulfillmentStatus === url.searchParams.get('status'),
      )
    return json({
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
    })
  }
  const detail = details.find((d) => d.order.orderId === Number(match[2]))
  if (!detail) return json({}, 404)
  if (init.method === 'POST') {
    const body = JSON.parse(String(init.body))
    if (
      body.expectedVersion !== detail.order.version ||
      !detail.order.availableTransitions.includes(body.status)
    )
      return json({}, 409)
    const fromStatus = detail.order.fulfillmentStatus
    detail.order.fulfillmentStatus = body.status
    detail.order.version++
    const states: FulfillmentStatus[] = ['PLACED', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED']
    detail.order.availableTransitions = states.slice(
      states.indexOf(body.status) + 1,
      states.indexOf(body.status) + 2,
    )
    detail.timeline.push({
      fromStatus,
      toStatus: body.status,
      version: detail.order.version,
      occurredAt: '2026-10-21T12:00:00',
    })
  }
  return json(detail)
}
const store = new SessionStore(new ApiClient('https://visual-test.example.invalid/api/v1'))
await store.login(login.account.email, 'visual-fixture-only', 'merchant')
const route = new URLSearchParams(location.search).get('detail')
  ? '/brands/3/orders/702'
  : '/brands/3/orders'
createRoot(document.getElementById('root')!).render(
  <SessionContext value={store}>
    <div role="status" className="visual-test-banner">
      Synthetic order preview · mocked API · no live database
    </div>
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  </SessionContext>,
)
