import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { errorMessage } from '../api/client'
import { useResource } from '../lib/resource'
import {
  contentPath,
  move,
  type ContentState,
  type ContentDocument,
  type History,
  type Banner,
} from './model'
import './content.css'

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  banners: 'Banners & Posters',
  sections: 'Homepage Sections',
  brands: 'Featured Brands',
  history: 'Publishing History',
}
export function ControlCenter() {
  const { store } = useAuth()
  const { tab = 'dashboard' } = useParams()
  const load = useCallback(() => store.request<ContentState>(contentPath), [store])
  const resource = useResource('content', load)
  if (resource.error)
    return (
      <section className="page">
        <h1>App Control Center</h1>
        <p role="alert">{errorMessage(resource.error)}</p>
        <button onClick={resource.reload}>Try again</button>
      </section>
    )
  if (!resource.data)
    return (
      <section className="page" role="status">
        Loading content…
      </section>
    )
  return (
    <Editor
      key={resource.data.version}
      initial={resource.data}
      tab={tab}
      reload={resource.reload}
    />
  )
}
function Editor({
  initial,
  tab,
  reload,
}: {
  initial: ContentState
  tab: string
  reload: () => void
}) {
  const { store } = useAuth()
  const [doc, setDoc] = useState(initial.draft)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<ContentDocument | null>(null)
  const [audience, setAudience] = useState('WEBSITE')
  const [at, setAt] = useState('')
  const [history, setHistory] = useState<History[]>([])
  const [page, setPage] = useState(0)
  const loadOptions = useCallback(async () => {
    const [brands, categories] = await Promise.all([
      store.request<{ id: number; name: string }[]>('/brands'),
      store.api.categories(),
    ])
    return { brands, categories }
  }, [store])
  const options = useResource('content-options', loadOptions)
  const dirty = JSON.stringify(doc) !== JSON.stringify(initial.draft)
  async function act(work: () => Promise<unknown>, refresh = false) {
    setBusy(true)
    setMessage('')
    try {
      await work()
      if (refresh) reload()
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  function patch(id: string, change: Partial<Banner>) {
    setDoc({ ...doc, banners: doc.banners.map((b) => (b.id === id ? { ...b, ...change } : b)) })
  }
  const orderButtons = (index: number, length: number, change: (direction: number) => void) => (
    <span className="cc-order">
      <button aria-label="Move up" disabled={index === 0} onClick={() => change(-1)}>
        ↑
      </button>
      <button aria-label="Move down" disabled={index === length - 1} onClick={() => change(1)}>
        ↓
      </button>
    </span>
  )
  return (
    <section className="page cc">
      <span className="eyebrow">APP CONTROL CENTER · PHASE 1</span>
      <h1>{labels[tab] ?? 'Dashboard'}</h1>
      <p className="muted">
        Shape what customers discover. Draft changes become visible when you publish a release.
      </p>
      <div className="cc-status">
        <strong>Revision {initial.version}</strong>
        <span>{initial.published ? 'Published release available' : 'No release published'}</span>
        <span>{dirty ? 'Unsaved changes' : 'Draft saved'}</span>
      </div>
      {message && (
        <p role="alert" className="notice error">
          {message}
        </p>
      )}
      <fieldset disabled={busy} className="cc-fieldset">
        <div className="cc-actions">
          <button
            className="button"
            disabled={!dirty}
            onClick={() =>
              void act(
                () =>
                  store.request(contentPath, {
                    method: 'PUT',
                    body: JSON.stringify({ expectedVersion: initial.version, document: doc }),
                  }),
                true,
              )
            }
          >
            Save draft
          </button>
          <button
            className="button"
            disabled={dirty}
            onClick={() =>
              void act(
                () =>
                  store.request(contentPath + '/publish', {
                    method: 'POST',
                    body: JSON.stringify({ expectedVersion: initial.version }),
                  }),
                true,
              )
            }
          >
            Publish saved draft
          </button>
        </div>
        {tab === 'dashboard' && (
          <div className="cc-metrics">
            <article>
              <strong>{doc.banners.length}</strong>
              <span>Banners in draft</span>
            </article>
            <article>
              <strong>{doc.sections.filter((s) => s.enabled).length}</strong>
              <span>Enabled sections</span>
            </article>
            <article>
              <strong>{doc.brandIds.length}</strong>
              <span>Featured brands</span>
            </article>
          </div>
        )}
        {tab === 'banners' && (
          <>
            <button
              onClick={() =>
                setDoc({
                  ...doc,
                  banners: [
                    ...doc.banners,
                    {
                      id: crypto.randomUUID(),
                      title: '',
                      description: '',
                      imageUrl: '',
                      destination: '',
                      placement: 'HERO',
                      target: 'BOTH',
                      enabled: false,
                      startsAt: null,
                      endsAt: null,
                    },
                  ],
                })
              }
              disabled={doc.banners.length >= 30}
            >
              + Add banner
            </button>
            {!doc.banners.length && (
              <p>No banners yet. Add your first promotion and upload a PNG or JPEG.</p>
            )}
            {doc.banners.map((b, i) => (
              <article className="cc-card" key={b.id}>
                <div className="cc-row">
                  <h2>{b.title || 'New banner'}</h2>
                  {orderButtons(i, doc.banners.length, (d) =>
                    setDoc({ ...doc, banners: move(doc.banners, i, d) }),
                  )}
                  <button
                    onClick={() =>
                      setDoc({ ...doc, banners: doc.banners.filter((x) => x.id !== b.id) })
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="cc-grid">
                  <div>
                    <label>
                      Title
                      <input
                        value={b.title}
                        maxLength={150}
                        onChange={(e) => patch(b.id, { title: e.target.value })}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={b.description ?? ''}
                        maxLength={1000}
                        onChange={(e) => patch(b.id, { description: e.target.value })}
                      />
                    </label>
                    <label>
                      Destination
                      <select
                        value={b.destination ?? ''}
                        onChange={(e) => patch(b.id, { destination: e.target.value })}
                      >
                        <option value="">No link</option>
                        <option value="/products">All products</option>
                        <option value="/brands">All brands</option>
                        {options.data?.brands.map((x) => (
                          <option key={x.id} value={'/products?brandId=' + x.id}>
                            {x.name}
                          </option>
                        ))}
                        {options.data?.categories.map((x) => (
                          <option key={x.id} value={'/products?categoryId=' + x.id}>
                            {x.name} collection
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Placement
                      <select
                        value={b.placement}
                        onChange={(e) =>
                          patch(b.id, { placement: e.target.value as Banner['placement'] })
                        }
                      >
                        <option value="HERO">Homepage hero</option>
                        <option value="PROMOTION">Promotional banner</option>
                        <option value="COLLECTION">Featured collection</option>
                      </select>
                    </label>
                    <label>
                      Visibility
                      <select
                        value={b.target}
                        onChange={(e) =>
                          patch(b.id, { target: e.target.value as Banner['target'] })
                        }
                      >
                        <option value="BOTH">Both</option>
                        <option value="WEBSITE">Website</option>
                        <option value="MOBILE">Mobile</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={b.enabled}
                        onChange={(e) => patch(b.id, { enabled: e.target.checked })}
                      />
                      Include in next release
                    </label>
                    <p className="muted">
                      To unpublish this banner, clear the checkbox, save, then publish.
                    </p>
                    {(['startsAt', 'endsAt'] as const).map((key) => (
                      <label key={key}>
                        {key === 'startsAt' ? 'Start' : 'End'} (UTC)
                        <input
                          type="datetime-local"
                          value={b[key]?.slice(0, 16) ?? ''}
                          onChange={(e) =>
                            patch(b.id, {
                              [key]: e.target.value
                                ? new Date(e.target.value + 'Z').toISOString()
                                : null,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div>
                    {b.imageUrl && <img className="cc-image" src={b.imageUrl} alt={b.title} />}
                    <label>
                      Upload image · PNG/JPEG, up to 5 MiB
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setMessage('Image must be 5 MiB or smaller.')
                            return
                          }
                          const body = new FormData()
                          body.set('file', file)
                          void act(async () => {
                            const image = await store.request<{ url: string }>(
                              contentPath + '/images',
                              { method: 'POST', body },
                            )
                            patch(b.id, { imageUrl: image.url })
                          })
                        }}
                      />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
        {tab === 'sections' && (
          <>
            <p>Collections use existing active catalogue categories.</p>
            {doc.sections.map((s, i) => (
              <div className="cc-card cc-row" key={s.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) =>
                      setDoc({
                        ...doc,
                        sections: doc.sections.map((x) =>
                          x.key === s.key ? { ...x, enabled: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  {s.key}
                </label>
                {orderButtons(i, doc.sections.length, (d) =>
                  setDoc({ ...doc, sections: move(doc.sections, i, d) }),
                )}
              </div>
            ))}
            <h2>Featured collections</h2>
            {doc.collectionIds.map((id, i) => (
              <div className="cc-row cc-card" key={id}>
                {options.data?.categories.find((c) => c.id === id)?.name ?? id}
                {orderButtons(i, doc.collectionIds.length, (d) =>
                  setDoc({ ...doc, collectionIds: move(doc.collectionIds, i, d) }),
                )}
              </div>
            ))}
            {options.data?.categories.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={doc.collectionIds.includes(c.id)}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      collectionIds: e.target.checked
                        ? [...doc.collectionIds, c.id]
                        : doc.collectionIds.filter((id) => id !== c.id),
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </>
        )}
        {tab === 'brands' && (
          <>
            <p>Select brands in the order you want them to appear.</p>
            {options.data?.brands.map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  checked={doc.brandIds.includes(b.id)}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      brandIds: e.target.checked
                        ? [...doc.brandIds, b.id]
                        : doc.brandIds.filter((id) => id !== b.id),
                    })
                  }
                />
                {b.name}
              </label>
            ))}
            {doc.brandIds.map((id, i) => (
              <div className="cc-row cc-card" key={id}>
                {options.data?.brands.find((b) => b.id === id)?.name ?? id}
                {orderButtons(i, doc.brandIds.length, (d) =>
                  setDoc({ ...doc, brandIds: move(doc.brandIds, i, d) }),
                )}
              </div>
            ))}
          </>
        )}
        {!!options.error && (
          <p role="alert">
            Could not load brand and collection selections.{' '}
            <button onClick={options.reload}>Retry</button>
          </p>
        )}
        {tab === 'history' && (
          <>
            <button
              onClick={() =>
                void act(async () =>
                  setHistory(await store.request<History[]>(contentPath + '/history?page=' + page)),
                )
              }
            >
              Load history
            </button>
            <label>
              Page
              <input
                type="number"
                min={0}
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
              />
            </label>
            {history.map((h) => (
              <article className="cc-card cc-row" key={h.id}>
                <span>
                  <strong>
                    {h.action} · v{h.version}
                  </strong>
                  <br />
                  {new Date(h.occurredAt).toLocaleString()} · Account {h.actor}
                </span>
                {['PUBLISH', 'ROLLBACK'].includes(h.action) && (
                  <button
                    disabled={dirty}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Restore and publish revision ' +
                            h.version +
                            '? This replaces the current draft and release.',
                        )
                      )
                        void act(
                          () =>
                            store.request(contentPath + '/history/' + h.id + '/rollback', {
                              method: 'POST',
                              body: JSON.stringify({ expectedVersion: initial.version }),
                            }),
                          true,
                        )
                    }}
                  >
                    Restore release
                  </button>
                )}
              </article>
            ))}
          </>
        )}
        <div className="cc-card">
          <h2>Preview saved draft</h2>
          <label>
            Audience
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="WEBSITE">Website</option>
              <option value="MOBILE">Mobile</option>
            </select>
          </label>
          <label>
            Preview at (UTC, optional)
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
          <button
            disabled={dirty}
            onClick={() =>
              void act(async () =>
                setPreview(
                  await store.request<ContentDocument>(
                    contentPath +
                      '/preview?target=' +
                      audience +
                      (at ? '&at=' + encodeURIComponent(new Date(at + 'Z').toISOString()) : ''),
                  ),
                ),
              )
            }
          >
            Preview
          </button>
          {preview && (
            <div aria-label="Saved draft preview">
              {preview.sections
                .filter((s) => s.enabled)
                .map((s) => (
                  <article key={s.key}>
                    <h3>{s.key}</h3>
                    {(s.key === 'HERO' || s.key === 'COLLECTIONS') &&
                      preview.banners
                        .filter((b) => (b.placement === 'COLLECTION') === (s.key === 'COLLECTIONS'))
                        .map((b) => (
                          <div key={b.id}>
                            <img className="cc-image" src={b.imageUrl} alt="" />
                            <h4>{b.title}</h4>
                            <p>{b.description}</p>
                          </div>
                        ))}
                    {s.key === 'BRANDS' && (
                      <p>
                        {preview.brandIds
                          .map((id) => options.data?.brands.find((b) => b.id === id)?.name ?? id)
                          .join(' · ')}
                      </p>
                    )}
                    {s.key === 'COLLECTIONS' && (
                      <p>
                        {preview.collectionIds
                          .map(
                            (id) => options.data?.categories.find((c) => c.id === id)?.name ?? id,
                          )
                          .join(' · ')}
                      </p>
                    )}
                  </article>
                ))}
            </div>
          )}
        </div>
      </fieldset>
    </section>
  )
}
