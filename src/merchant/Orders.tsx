import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type {
  AssignedBrand,
  FulfillmentStatus,
  MerchantOrderDetail,
  MerchantOrderSummary,
} from '../api/types'
import { useAuth } from '../auth/context'
import { Badge, ErrorNotice, Loading } from '../components'
import { dateTime, formatCurrency } from '../lib/format'
import { useResource } from '../lib/resource'

const statuses: FulfillmentStatus[] = ['PLACED', 'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED']
const actions: Record<FulfillmentStatus, string> = {
  PLACED: 'Placed',
  ACCEPTED: 'Accept order',
  PACKED: 'Mark as packed',
  SHIPPED: 'Mark as shipped',
  DELIVERED: 'Mark as delivered',
}
const scope =
  'Brand items subtotal covers this brand’s order lines only. Payment collection, refunds, restocking and courier booking are unavailable.'
function summaryForBrand(order: MerchantOrderSummary, brand: number) {
  if (
    order.brandId !== brand ||
    !Number.isSafeInteger(order.orderId) ||
    order.orderId <= 0 ||
    !Number.isSafeInteger(order.version) ||
    order.version < 0 ||
    !Number.isSafeInteger(order.lineCount) ||
    order.lineCount < 1 ||
    order.currency !== 'PKR' ||
    !Number.isFinite(order.itemsSubtotal) ||
    order.itemsSubtotal < 0 ||
    !statuses.includes(order.fulfillmentStatus) ||
    !Array.isArray(order.availableTransitions) ||
    !order.availableTransitions.every(
      (s) => statuses.indexOf(s) === statuses.indexOf(order.fulfillmentStatus) + 1,
    )
  )
    throw new ApiError(
      403,
      'Unexpected order response. Access stopped; refresh your authorized workspace.',
    )
  return order
}
function detailForBrand(detail: MerchantOrderDetail, brand: number, id: number) {
  summaryForBrand(detail.order, brand)
  if (
    detail.order.orderId !== id ||
    detail.items.length !== detail.order.lineCount ||
    detail.items.some(
      (item) =>
        item.brandId !== brand ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0 ||
        !Number.isFinite(item.lineSubtotal) ||
        item.lineSubtotal < 0,
    )
  )
    throw new ApiError(
      403,
      'Unexpected order response. Access stopped; refresh your authorized workspace.',
    )
  return detail
}

export function OrderList({ brand }: { brand: AssignedBrand }) {
  const { store } = useAuth()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<FulfillmentStatus | ''>('')
  const load = useCallback(async () => {
    const result = await store.api.orders(brand.id, page, status || undefined)
    result.content.forEach((order) => summaryForBrand(order, brand.id))
    return result
  }, [store, brand.id, page, status])
  const resource = useResource(`orders:${brand.id}:${page}:${status}`, load)
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">FULFILLMENT</span>
          <h2>Orders</h2>
        </div>
        <button className="button secondary" disabled={resource.loading} onClick={resource.reload}>
          Refresh orders
        </button>
      </div>
      <p className="scope-note">{scope}</p>
      <div className="order-filter">
        <label htmlFor="order-status">Fulfillment status</label>
        <select
          id="order-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as FulfillmentStatus | '')
            setPage(0)
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      {resource.loading ? (
        <Loading label="Loading brand orders…" />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        resource.data && (
          <>
            <p className="muted">
              {resource.data.totalElements} {status ? 'matching ' : ''}orders for {brand.name}
            </p>
            {resource.data.content.length === 0 ? (
              <div className="empty-state">
                <h3>No orders to show</h3>
                <p>
                  {status
                    ? 'Try another fulfillment status.'
                    : 'Orders containing this brand’s items will appear here.'}
                </p>
              </div>
            ) : (
              <div
                className="panel table-scroll"
                role="region"
                aria-label="Brand order list"
                tabIndex={0}
              >
                <table>
                  <caption className="sr-only">Orders for {brand.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Created</th>
                      <th scope="col">Fulfillment</th>
                      <th scope="col">Brand items subtotal</th>
                      <th scope="col">Order lines</th>
                      <th scope="col">Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.content.map((order) => (
                      <tr key={order.orderId}>
                        <td>
                          <Link to={`/brands/${brand.id}/orders/${order.orderId}`}>
                            Order #{order.orderId}
                          </Link>
                        </td>
                        <td>{dateTime(order.createdAt)}</td>
                        <td>
                          <Badge value={order.fulfillmentStatus} />
                        </td>
                        <td>{formatCurrency(order.itemsSubtotal, order.currency)}</td>
                        <td>{order.lineCount}</td>
                        <td>
                          {order.availableTransitions.length ? (
                            <Link to={`/brands/${brand.id}/orders/${order.orderId}`}>
                              {actions[order.availableTransitions[0]]}
                            </Link>
                          ) : order.fulfillmentStatus === 'DELIVERED' ? (
                            'Complete'
                          ) : (
                            'No action available'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav className="pagination" aria-label="Order pages">
              <span>
                Page {page + 1} of {Math.max(1, resource.data.totalPages)}
              </span>
              <div className="actions">
                <button
                  className="button secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous orders
                </button>
                <button
                  className="button secondary"
                  disabled={page + 1 >= resource.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next orders
                </button>
              </div>
            </nav>
          </>
        )
      )}
    </>
  )
}

export function OrderDetailRoute({ brand }: { brand: AssignedBrand }) {
  const { orderId } = useParams()
  const id = Number(orderId)
  if (!orderId || !/^\d+$/.test(orderId) || !Number.isSafeInteger(id) || id <= 0)
    return <ErrorNotice error={new ApiError(404, 'Order not found.')} />
  return <OrderDetail key={`${brand.id}:${id}`} brand={brand} id={id} />
}
function OrderDetail({ brand, id }: { brand: AssignedBrand; id: number }) {
  const { store } = useAuth()
  const load = useCallback(
    async () => detailForBrand(await store.api.order(brand.id, id), brand.id, id),
    [store, brand.id, id],
  )
  const resource = useResource(`order:${brand.id}:${id}`, load)
  const [action, setAction] = useState<FulfillmentStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const actionButton = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<unknown>()
  const [notice, setNotice] = useState('')
  async function execute() {
    const detail = resource.data
    if (
      submitting.current ||
      !detail ||
      !action ||
      !detail.order.availableTransitions.includes(action)
    )
      return
    submitting.current = true
    setBusy(true)
    setError(undefined)
    setNotice('')
    try {
      detailForBrand(
        await store.api.fulfillOrder(brand.id, id, action, detail.order.version),
        brand.id,
        id,
      )
      setNotice('Fulfillment updated. Review the latest brand order state.')
      resource.reload()
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        setNotice(
          'This order changed or the action is no longer available. Loading its latest state; review before trying again.',
        )
        resource.reload()
      } else if (failure instanceof ApiError && failure.status === 403) {
        store.logout('Order access could not be verified. Sign in again.')
      } else setError(failure)
    } finally {
      submitting.current = false
      setBusy(false)
      setAction(null)
    }
  }
  return (
    <>
      <Link className="back-link" to={`/brands/${brand.id}/orders`}>
        ← Orders
      </Link>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {resource.loading ? (
        <Loading label="Loading brand order…" />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        resource.data && (
          <>
            <section className="detail-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">BRAND FULFILLMENT</span>
                  <h2>Order #{id}</h2>
                  <p className="muted">{dateTime(resource.data.order.createdAt)}</p>
                </div>
                <Badge value={resource.data.order.fulfillmentStatus} />
              </div>
              <p className="scope-note">{scope}</p>
              <div
                className="panel table-scroll"
                role="region"
                aria-label="Brand order items"
                tabIndex={0}
              >
                <table>
                  <caption className="sr-only">Brand-owned items for order #{id}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Unit price</th>
                      <th scope="col">Line subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.items.map((item, index) => (
                      <tr key={`${item.productId}:${index}`}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.lineSubtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="order-subtotal">
                <span>Brand items subtotal</span>
                <strong>{formatCurrency(resource.data.order.itemsSubtotal)}</strong>
              </div>
              {error !== undefined && <ErrorNotice error={error} />}
              <div className="actions">
                {resource.data.order.availableTransitions.map((next) => (
                  <button
                    key={next}
                    ref={actionButton}
                    className="button primary"
                    disabled={busy || action !== null}
                    onClick={() => {
                      setError(undefined)
                      setAction(next)
                    }}
                  >
                    {actions[next]}
                  </button>
                ))}
                <button
                  className="button secondary"
                  disabled={busy || action !== null}
                  onClick={resource.reload}
                >
                  Refresh order
                </button>
              </div>
              {resource.data.order.fulfillmentStatus === 'DELIVERED' && (
                <p className="notice">
                  Delivered is a merchant fulfillment attestation. Payment settlement and carrier
                  confirmation are not recorded here.
                </p>
              )}
            </section>
            <div className="order-detail-grid">
              <section className="detail-card">
                <h3>Delivery details</h3>
                <address>
                  <strong>{resource.data.deliveryAddress.recipientName}</strong>
                  <br />
                  {resource.data.deliveryAddress.phoneNumber}
                  <br />
                  {resource.data.deliveryAddress.addressLine1}
                  <br />
                  {resource.data.deliveryAddress.addressLine2 && (
                    <>
                      {resource.data.deliveryAddress.addressLine2}
                      <br />
                    </>
                  )}
                  {[
                    resource.data.deliveryAddress.city,
                    resource.data.deliveryAddress.province,
                    resource.data.deliveryAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </address>
                {resource.data.deliveryAddress.deliveryInstructions && (
                  <>
                    <h4>Delivery instructions</h4>
                    <p className="product-description">
                      {resource.data.deliveryAddress.deliveryInstructions}
                    </p>
                  </>
                )}
              </section>
              <section className="detail-card">
                <h3>Fulfillment timeline</h3>
                {resource.data.timeline.length ? (
                  <ol className="order-timeline">
                    {resource.data.timeline.map((event) => (
                      <li key={event.version}>
                        <Badge value={event.toStatus} />
                        <p>
                          {event.fromStatus.replaceAll('_', ' ')} →{' '}
                          {event.toStatus.replaceAll('_', ' ')}
                        </p>
                        <small>{dateTime(event.occurredAt)}</small>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">No fulfillment transitions recorded for this brand yet.</p>
                )}
              </section>
            </div>
            {action && (
              <FulfillmentConfirmation
                action={action}
                busy={busy}
                confirm={() => void execute()}
                cancel={() => setAction(null)}
                returnFocus={actionButton}
              />
            )}
          </>
        )
      )}
    </>
  )
}
function FulfillmentConfirmation({
  action,
  busy,
  confirm,
  cancel,
  returnFocus,
}: {
  action: FulfillmentStatus
  busy: boolean
  confirm: () => void
  cancel: () => void
  returnFocus: RefObject<HTMLButtonElement | null>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = returnFocus.current
    element?.showModal()
    return () => {
      element?.close()
      trigger?.focus()
    }
  }, [returnFocus])
  return (
    <dialog
      ref={dialog}
      className="order-confirmation"
      aria-labelledby="fulfillment-confirm"
      aria-describedby="fulfillment-scope"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) cancel()
      }}
    >
      <h3 id="fulfillment-confirm">Confirm: {actions[action]}</h3>
      <p id="fulfillment-scope">
        This updates fulfillment for this brand’s order lines. It does not book a courier, confirm a
        carrier event or record payment collection.
      </p>
      <p>Other brands’ fulfillment and customer financial records stay unchanged.</p>
      <div className="actions">
        <button className="button secondary" autoFocus disabled={busy} onClick={cancel}>
          Keep current status
        </button>
        <button className="button primary" disabled={busy} onClick={confirm}>
          {busy ? 'Updating fulfillment…' : 'Confirm fulfillment update'}
        </button>
      </div>
    </dialog>
  )
}
