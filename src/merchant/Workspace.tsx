import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { AssignedBrand, Product, ProductInput } from '../api/types'
import { useAuth } from '../auth/context'
import { Badge, ErrorNotice, Loading } from '../components'
import { useResource } from '../lib/resource'
import { dateTime, formatCurrency } from '../lib/format'
import { stockLabel, validPrice, validQuantity } from './validation'

export function MerchantWorkspace() {
  const { session } = useAuth()
  if (session?.mode !== 'merchant')
    return (
      <section className="page">
        <h1>Merchant workspace required</h1>
        <p>Sign in with your assigned-brand workspace to manage a catalogue.</p>
        <Link to="/brands">Assigned brands</Link>
      </section>
    )
  return <AuthorizedWorkspace />
}
function AuthorizedWorkspace() {
  const { store } = useAuth()
  const { brandId } = useParams()
  const navigate = useNavigate()
  const brands = useResource('merchant-access', store.api.assignedBrands)
  if (brands.loading) return <Loading label="Verifying brand access…" />
  if (brands.error) return <ErrorNotice error={brands.error} retry={brands.reload} />
  const brand = brands.data?.find((item) => String(item.id) === brandId)
  if (!brand)
    return (
      <section className="page">
        <h1>Brand access unavailable</h1>
        <p>
          This brand is not an active assignment. Ask your operator to review membership and brand
          status.
        </p>
        <Link to="/brands">Return to assigned brands</Link>
      </section>
    )
  return (
    <section className="page">
      <Link className="back-link" to="/brands">
        ← Assigned brands
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MERCHANT WORKSPACE · BRAND #{brand.id}</span>
          <h1>{brand.name}</h1>
          <p className="muted">A considered catalogue. A clear view of inventory.</p>
        </div>
        {brands.data && brands.data.length > 1 && (
          <div>
            <label htmlFor="brand-selector">Assigned brand</label>
            <select
              id="brand-selector"
              value={brand.id}
              onChange={(e) => navigate(`/brands/${e.target.value}`)}
            >
              {brands.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <nav className="merchant-tabs" aria-label="Brand navigation">
        <NavLink end to={`/brands/${brand.id}`}>
          Overview
        </NavLink>
        <NavLink to={`/brands/${brand.id}/products`}>Products</NavLink>
        <NavLink to={`/brands/${brand.id}/inventory`}>Inventory</NavLink>
      </nav>
      <div key={brand.id}>
        <Routes>
          <Route index element={<Catalogue brand={brand} view="overview" />} />
          <Route path="products" element={<Catalogue brand={brand} view="products" />} />
          <Route path="inventory" element={<Catalogue brand={brand} view="inventory" />} />
          <Route path="products/new" element={<ProductEditor brand={brand} />} />
          <Route path="products/:productId" element={<ProductDetail brand={brand} />} />
          <Route path="*" element={<p>Page unavailable. Choose Products or Inventory.</p>} />
        </Routes>
      </div>
    </section>
  )
}

function ensureBrand(product: Product, brand: AssignedBrand) {
  if (product.brandId !== brand.id)
    throw new ApiError(403, 'The backend returned a product outside this brand. Access stopped.')
  return product
}

function Catalogue({
  brand,
  view,
}: {
  brand: AssignedBrand
  view: 'overview' | 'products' | 'inventory'
}) {
  const { store } = useAuth()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [stock, setStock] = useState('ALL')
  const load = useCallback(async () => {
    const result = await store.api.products(brand.id, page)
    result.content.forEach((product) => ensureBrand(product, brand))
    return result
  }, [store, brand, page])
  const resource = useResource(`catalogue:${brand.id}:${page}`, load)
  const products = resource.data?.content ?? []
  const filtered = products.filter(
    (p) =>
      `${p.name} ${p.slug} ${p.categoryName}`.toLowerCase().includes(search.trim().toLowerCase()) &&
      (status === 'ALL' || status === p.publicationStatus) &&
      (stock === 'ALL' ||
        (stock === 'OUT' ? p.stockQuantity === 0 : p.stockQuantity > 0 && p.stockQuantity <= 5)),
  )
  return (
    <>
      <div className="section-heading">
        <h2>
          {view === 'overview' ? 'Brand overview' : view === 'products' ? 'Products' : 'Inventory'}
        </h2>
        <div className="actions">
          <button
            className="button secondary"
            disabled={resource.loading}
            onClick={resource.reload}
          >
            Refresh products
          </button>
          <Link className="button primary" to={`/brands/${brand.id}/products/new`}>
            Add product
          </Link>
        </div>
      </div>
      {resource.loading ? (
        <Loading label="Loading brand products…" />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <div className="metric-grid">
            <article className="metric">
              <span>Brand products</span>
              <strong>{resource.data?.totalElements ?? 0}</strong>
              <small>All pages · includes drafts</small>
            </article>
            <article className="metric">
              <span>Stock units on this page</span>
              <strong>{products.reduce((sum, p) => sum + p.stockQuantity, 0)}</strong>
              <small>Current page only</small>
            </article>
            <article className="metric">
              <span>Low / out of stock</span>
              <strong>{products.filter((p) => p.stockQuantity <= 5).length}</strong>
              <small>Current page · low means 1–5 units</small>
            </article>
          </div>
          <div className="filters merchant-filters">
            <div>
              <label htmlFor="product-search">Search this page</label>
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product, slug or category"
              />
            </div>
            <div>
              <label htmlFor="product-status">Publication status</label>
              <select
                id="product-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {['ALL', 'DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'DEACTIVATED'].map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All statuses' : s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stock-filter">Stock filter</label>
              <select id="stock-filter" value={stock} onChange={(e) => setStock(e.target.value)}>
                <option value="ALL">All stock</option>
                <option value="LOW">Low stock</option>
                <option value="OUT">Out of stock</option>
              </select>
            </div>
          </div>
          <p className="muted">
            Search, filters and inventory summaries apply to the current page. Availability and
            publication are separate from stock.
          </p>
          {filtered.length ? (
            <div className="panel table-scroll">
              <table>
                <caption className="sr-only">
                  {brand.name} {view === 'inventory' ? 'inventory' : 'products'}
                </caption>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link className="brand-link" to={`/brands/${brand.id}/products/${p.id}`}>
                          {p.name}
                        </Link>
                        <small>{p.slug}</small>
                      </td>
                      <td>{p.categoryName}</td>
                      <td>{formatCurrency(p.price, p.currency)}</td>
                      <td>
                        <Badge value={p.publicationStatus} />
                        <small>{p.availability}</small>
                      </td>
                      <td>
                        <strong>{p.stockQuantity} units</strong>
                        <small>{stockLabel(p.stockQuantity)}</small>
                        {view === 'inventory' && (
                          <Link to={`/brands/${brand.id}/products/${p.id}#stock`}>
                            Update stock
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel empty-state">
              <h3>
                {products.length
                  ? 'No matching products on this page'
                  : 'Your catalogue starts here'}
              </h3>
              <p>
                {products.length
                  ? 'Adjust the filters or choose another page.'
                  : 'Add your first product, then set its stock and publication status.'}
              </p>
            </div>
          )}
          <div className="pagination">
            <span>
              Page {page + 1} of {Math.max(1, resource.data?.totalPages ?? 0)}
            </span>
            <div className="actions">
              <button
                className="button secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous page
              </button>
              <button
                className="button secondary"
                disabled={!resource.data || page + 1 >= resource.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next page
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ProductDetail({ brand }: { brand: AssignedBrand }) {
  const { productId } = useParams()
  return <Detail key={`${brand.id}:${productId}`} brand={brand} productId={productId} />
}
function Detail({ brand, productId }: { brand: AssignedBrand; productId: string | undefined }) {
  const { store } = useAuth()
  const [editing, setEditing] = useState(false)
  const [action, setAction] = useState<'publish' | 'unpublish' | 'deactivate' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    const id = Number(productId)
    if (!productId || !/^\d+$/.test(productId) || !Number.isSafeInteger(id) || id <= 0)
      throw new ApiError(404, 'Product unavailable.')
    return ensureBrand(await store.api.product(brand.id, id), brand)
  }, [store, brand, productId])
  const resource = useResource(`product:${brand.id}:${productId}`, load)
  async function execute() {
    if (!resource.data || !action || busy) return
    setBusy(true)
    setError(undefined)
    setNotice('')
    try {
      await store.api.productStatus(brand.id, resource.data.id, action)
      setNotice('Product status updated.')
      setAction(null)
      resource.reload()
    } catch (failure) {
      setError(failure)
      setAction(null)
      resource.reload()
    } finally {
      setBusy(false)
    }
  }
  if (resource.loading) return <Loading label="Loading product…" />
  if (resource.error) return <ErrorNotice error={resource.error} retry={resource.reload} />
  const product = resource.data
  if (!product) return null
  if (editing)
    return (
      <ProductEditor
        brand={brand}
        product={product}
        done={() => {
          setEditing(false)
          resource.reload()
        }}
      />
    )
  return (
    <>
      <Link to={`/brands/${brand.id}/products`}>← Products</Link>
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {error !== undefined && <ErrorNotice error={error} />}
      <div className="section-heading">
        <h2>{product.name}</h2>
        <Badge value={product.publicationStatus} />
      </div>
      <section className="panel detail-card">
        <dl className="product-facts">
          <div>
            <dt>Price</dt>
            <dd>{formatCurrency(product.price, product.currency)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{product.categoryName}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{product.availability}</dd>
          </div>
          <div>
            <dt>Slug</dt>
            <dd>{product.slug}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{dateTime(product.updatedAt)}</dd>
          </div>
        </dl>
        <p className="product-description">{product.description || 'No description provided.'}</p>
        <div className="actions">
          <button
            className="button primary"
            disabled={busy || !!action || product.publicationStatus === 'DEACTIVATED'}
            onClick={() => setEditing(true)}
          >
            Edit product
          </button>
          {(['publish', 'unpublish', 'deactivate'] as const).map((a) => (
            <button
              key={a}
              className="button secondary"
              disabled={
                busy ||
                !!action ||
                product.publicationStatus === 'DEACTIVATED' ||
                (a === 'publish' && product.publicationStatus === 'PUBLISHED') ||
                (a === 'unpublish' && product.publicationStatus !== 'PUBLISHED')
              }
              onClick={() => {
                setAction(a)
                setError(undefined)
                setNotice('')
              }}
            >
              {a === 'publish' ? 'Publish' : a === 'unpublish' ? 'Unpublish' : 'Deactivate'}
            </button>
          ))}
        </div>
        {product.publicationStatus === 'DEACTIVATED' && (
          <p>
            This product is permanently deactivated. Editing, stock updates and republishing are
            unavailable.
          </p>
        )}
      </section>
      {action && (
        <section className="confirmation" aria-labelledby="product-confirm">
          <h3 id="product-confirm">Confirm {action}</h3>
          <p>
            {action === 'deactivate'
              ? 'Deactivation is permanent through the current API. This product cannot be edited or reactivated.'
              : action === 'unpublish'
                ? 'This product will be removed from the customer catalogue.'
                : 'This product will become visible under the customer catalogue rules.'}
          </p>
          <div className="actions">
            <button className="button primary" disabled={busy} onClick={() => void execute()}>
              Confirm {action}
            </button>
            <button className="button secondary" disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
      <StockEditor
        key={`${product.id}:${product.updatedAt}:${product.stockQuantity}`}
        brand={brand}
        product={product}
        disabled={busy || !!action}
        updated={resource.reload}
        saved={() => {
          setNotice('Stock saved.')
          resource.reload()
        }}
      />
    </>
  )
}

function StockEditor({
  brand,
  product,
  disabled,
  updated,
  saved,
}: {
  brand: AssignedBrand
  product: Product
  disabled: boolean
  updated: () => void
  saved: () => void
}) {
  const { store } = useAuth()
  const [quantity, setQuantity] = useState(String(product.stockQuantity))
  const [error, setError] = useState<unknown>()
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !validQuantity(quantity)) return
    setBusy(true)
    setError(undefined)
    try {
      const current = await store.api.stock(brand.id, product.id)
      if (current.productId !== product.id)
        throw new ApiError(403, 'Unexpected product stock response. Refresh before continuing.')
      if (current.stockQuantity !== product.stockQuantity) {
        setQuantity(String(current.stockQuantity))
        throw new ApiError(
          409,
          'Stock changed since this page loaded. Refresh the product, review the latest quantity and enter your intended total again.',
        )
      }
      await store.api.saveStock(brand.id, product.id, Number(quantity))
      saved()
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section id="stock" className="panel detail-card">
      <h3>Inventory</h3>
      <p>
        {product.stockQuantity} units · {stockLabel(product.stockQuantity)}
      </p>
      <p className="muted">
        Enter the new total, not an adjustment. Refresh before editing stock shared with another
        operator.
      </p>
      {error !== undefined && <ErrorNotice error={error} />}
      <form onSubmit={(e) => void save(e)}>
        <fieldset disabled={disabled || busy || product.publicationStatus === 'DEACTIVATED'}>
          <label htmlFor="stock-quantity">Stock quantity</label>
          <input
            id="stock-quantity"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <div className="actions">
            <button className="button primary" disabled={!validQuantity(quantity)}>
              Save stock
            </button>
            <button type="button" className="button secondary" onClick={updated}>
              Refresh product
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}

function ProductEditor({
  brand,
  product,
  done,
}: {
  brand: AssignedBrand
  product?: Product
  done?: () => void
}) {
  const { store } = useAuth()
  const navigate = useNavigate()
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const categories = useResource('categories', store.api.categories)
  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [category, setCategory] = useState(String(product?.categoryId ?? ''))
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : '')
  const [availability, setAvailability] = useState<ProductInput['availability']>(
    product?.availability ?? 'AVAILABLE',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const active = categories.data?.filter((c) => c.status === 'ACTIVE') ?? []
  const valid =
    name.trim().length > 0 &&
    name.trim().length <= 150 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length <= 160 &&
    description.length <= 4000 &&
    validPrice(price) &&
    active.some((c) => String(c.id) === category)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const result = ensureBrand(
        await store.api.saveProduct(
          brand.id,
          {
            name: name.trim(),
            slug,
            description: description.trim() || null,
            categoryId: Number(category),
            brandId: brand.id,
            price: Number(price),
            availability,
          },
          product?.id,
        ),
        brand,
      )
      if (!mounted.current) return
      if (done) done()
      else navigate(`/brands/${brand.id}/products/${result.id}`)
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel detail-card">
      <h2>{product ? 'Edit product' : 'Add product'}</h2>
      <p className="muted">{brand.name} · New products start as drafts with zero stock.</p>
      {error !== undefined && <ErrorNotice error={error} />}
      {categories.loading ? (
        <Loading label="Loading active categories…" />
      ) : categories.error ? (
        <ErrorNotice error={categories.error} retry={categories.reload} />
      ) : !active.length ? (
        <p className="notice">
          No active categories are available. Ask an authorized operator to configure categories
          before adding or updating products.
        </p>
      ) : null}
      <form onSubmit={(e) => void submit(e)}>
        <fieldset
          disabled={
            busy ||
            categories.loading ||
            !!categories.error ||
            !active.length ||
            product?.publicationStatus === 'DEACTIVATED'
          }
        >
          <div className="product-form-grid">
            <div>
              <label htmlFor="product-name">Product name</label>
              <input
                id="product-name"
                required
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="product-slug">Product slug</label>
              <input
                id="product-slug"
                required
                maxLength={160}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-describedby="slug-help"
              />
              <small id="slug-help">
                Lowercase letters and numbers, separated by single hyphens.
              </small>
            </div>
            <div>
              <label htmlFor="product-price">Price (PKR)</label>
              <input
                id="product-price"
                inputMode="decimal"
                required
                pattern="[0-9]{1,10}(\.[0-9]{1,2})?"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-describedby="price-help"
              />
              <small id="price-help">
                Zero or greater, up to 10 integer digits and 2 decimal places.
              </small>
            </div>
            <div>
              <label htmlFor="product-category">Category</label>
              <select
                id="product-category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Choose an active category</option>
                {active.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="product-availability">Availability</label>
              <select
                id="product-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ProductInput['availability'])}
              >
                <option value="AVAILABLE">Available</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>
          </div>
          <label htmlFor="product-description">Description (optional)</label>
          <textarea
            id="product-description"
            rows={5}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="actions">
            <button className="button primary" disabled={!valid}>
              {busy ? 'Saving…' : product ? 'Save product' : 'Create product'}
            </button>
            {done ? (
              <button type="button" className="button secondary" disabled={busy} onClick={done}>
                Cancel editing
              </button>
            ) : (
              <Link to={`/brands/${brand.id}/products`}>Cancel</Link>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
