import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { SessionContext } from '../src/auth/context'
import { SessionStore } from '../src/auth/session'
import { ApiClient } from '../src/api/client'
import { identity, json, login } from './fixtures'
let store: SessionStore
afterEach(() => {
  store?.logout()
  vi.unstubAllGlobals()
})
it('saves an isolated draft with optimistic version and requires saving before publishing', async () => {
  let version = 7
  const state = {
    version,
    draft: {
      banners: [],
      sections: [
        { key: 'HERO', enabled: true },
        { key: 'COLLECTIONS', enabled: true },
        { key: 'BRANDS', enabled: true },
        { key: 'PRODUCTS', enabled: true },
      ],
      brandIds: [],
      collectionIds: [],
    },
    published: null,
  }
  const fetcher = vi.fn(async (raw: string, init: RequestInit = {}) => {
    const path = new URL(raw).pathname
    if (path.endsWith('/auth/login')) return json(login)
    if (path.endsWith('/identity')) return json(identity)
    if (path.endsWith('/brands')) return json([])
    if (path.endsWith('/categories')) return json({ content: [], totalPages: 1 })
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body as string)
      expect(body.expectedVersion).toBe(7)
      Object.assign(state, { draft: body.document, version: ++version })
    }
    return json(state)
  })
  vi.stubGlobal('fetch', fetcher)
  store = new SessionStore(new ApiClient('https://test.example.invalid/api/v1'))
  await store.login(login.account.email, 'test', 'admin')
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/content/banners']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  await screen.findByRole('button', { name: '+ Add banner' })
  fireEvent.click(screen.getByRole('button', { name: '+ Add banner' }))
  expect(screen.getByRole('button', { name: 'Publish saved draft' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Autumn arrivals' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await waitFor(() => expect(screen.getByText('Revision 8')).toBeTruthy())
  expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)
  expect(fetcher.mock.calls.some(([path]) => path.endsWith('/publish'))).toBe(false)
})
it('uploads FormData without forcing a JSON content type', async () => {
  const fetcher = vi.fn(async () => json({ url: 'https://images.example.test/test.png' }))
  vi.stubGlobal('fetch', fetcher)
  const body = new FormData()
  body.set('file', new Blob(['test'], { type: 'image/png' }), 'test.png')
  await new ApiClient('https://test.example.invalid/api/v1').request(
    '/super-admin/content/images',
    'test',
    { method: 'POST', body },
  )
  const options = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(new Headers(options[1].headers).has('Content-Type')).toBe(false)
  expect(new Headers(options[1].headers).get('Authorization')).toBe('Bearer test')
})
