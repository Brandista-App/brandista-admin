import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiError, apiBase, errorMessage, operations } from '../src/api/client'
import { SessionStore } from '../src/auth/session'
import { brands, identity, json, login } from './fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('API boundary and backend contract', () => {
  it.each(['http://localhost:8080/api/v1', 'https://api.example.invalid/api/v1/'])(
    'accepts an approved API shape: %s',
    (url) => {
      expect(apiBase(url)).toBe(url.replace(/\/$/, ''))
    },
  )
  it.each([
    'http://api.example.invalid/api/v1',
    'https://secret@api.example.invalid/api/v1',
    'https://api.example.invalid/api/v1?token=secret',
    'https://api.example.invalid/wrong',
    'not a url',
  ])('rejects unsafe/misconfigured API URLs: %s', (url) => {
    expect(() => apiBase(url)).toThrow()
  })
  it('uses JSON, bearer header, no cookies, no cache and no redirects', async () => {
    const fetcher = vi.fn().mockResolvedValue(json(login))
    vi.stubGlobal('fetch', fetcher)
    const client = new ApiClient('https://api.example.invalid/api/v1')
    await client.request('/example', 'token', { method: 'POST', body: '{}' })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.example.invalid/api/v1/example')
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    })
    expect(init.headers.get('Authorization')).toBe('Bearer token')
    expect(init.headers.get('Content-Type')).toBe('application/json')
  })
  it.each([400, 401, 403, 404, 409, 429, 503, 500])(
    'handles HTTP %s without echoing backend payloads',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json({ message: 'raw-invitation-token-DO-NOT-ECHO' }, status)),
      )
      await expect(
        new ApiClient('http://localhost:8080/api/v1').identity('token'),
      ).rejects.toMatchObject({ status })
      try {
        await new ApiClient('http://localhost:8080/api/v1').identity('token')
      } catch (e) {
        expect(errorMessage(e)).not.toContain('DO-NOT-ECHO')
      }
    },
  )
  it('handles network errors and invalid JSON safely', async () => {
    const client = new ApiClient('http://localhost:8080/api/v1')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sensitive diagnostics')))
    await expect(client.identity('token')).rejects.toMatchObject({ status: 0 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unreadable')))
    await expect(client.identity('token')).rejects.toMatchObject({ status: 502 })
    expect(errorMessage(new Error('sensitive diagnostics'))).not.toContain('sensitive')
  })
  it('matches the login body and verifies identity through its actual route', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(login)).mockResolvedValueOnce(json(identity))
    vi.stubGlobal('fetch', fetcher)
    const client = new ApiClient('http://localhost:8080/api/v1')
    await client.login(' operator@example.invalid ', 'secret-test-password')
    await client.identity('token')
    expect(fetcher.mock.calls[0][0]).toMatch(/\/auth\/login$/)
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      email: 'operator@example.invalid',
      password: 'secret-test-password',
    })
    expect(fetcher.mock.calls[1][0]).toMatch(/\/super-admin\/identity$/)
  })
  it('matches every review/onboarding/invitation/merchant endpoint with no recipient override', async () => {
    const request = vi.fn().mockResolvedValue({})
    const api = operations(request)
    await api.applications()
    await api.review(7, 'APPROVED', ' Reviewed ')
    await api.invitations(7, 2)
    await api.createInvitation(7)
    await api.revokeInvitation(12)
    await api.reissueInvitation(12)
    await api.onboarding(7)
    await api.activate(7)
    await api.assignedBrands()
    expect(request.mock.calls).toEqual([
      ['/admin/brand-applications'],
      [
        '/admin/brand-applications/7/review',
        { method: 'PATCH', body: JSON.stringify({ decision: 'APPROVED', reviewNote: 'Reviewed' }) },
      ],
      ['/super-admin/brand-applications/7/invitations?page=2&size=20'],
      ['/super-admin/brand-applications/7/invitations', { method: 'POST' }],
      ['/super-admin/brand-invitations/12/revoke', { method: 'POST' }],
      ['/super-admin/brand-invitations/12/reissue', { method: 'POST' }],
      ['/super-admin/brand-applications/7/onboarding'],
      ['/super-admin/brand-applications/7/activate', { method: 'POST' }],
      ['/merchant/brands'],
    ])
  })
})

describe('in-memory session authorization and expiry', () => {
  function setup() {
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/auth/login')) return Promise.resolve(json(login))
      if (url.endsWith('/super-admin/identity')) return Promise.resolve(json(identity))
      if (url.endsWith('/merchant/brands')) return Promise.resolve(json(brands))
      return Promise.resolve(json([]))
    })
    vi.stubGlobal('fetch', fetcher)
    return { store: new SessionStore(new ApiClient('http://localhost:8080/api/v1')), fetcher }
  }
  it('accepts a CUSTOMER login only after verified SUPER_ADMIN identity; persists no tokens', async () => {
    const { store } = setup()
    const local = vi.spyOn(Storage.prototype, 'setItem')
    await store.login('operator@example.invalid', 'password', 'admin')
    expect(store.snapshot()).toMatchObject({ mode: 'admin', userId: 41 })
    expect(JSON.stringify(store.snapshot())).not.toContain('test-access-token')
    expect(local).not.toHaveBeenCalled()
    store.logout()
  })
  it('rejects failed login without publishing a session', async () => {
    const { store, fetcher } = setup()
    fetcher.mockResolvedValueOnce(json({}, 401))
    await expect(store.login('operator@example.invalid', 'wrong', 'admin')).rejects.toMatchObject({
      status: 401,
    })
    expect(store.snapshot()).toBeNull()
  })
  it.each([
    { ...identity, platformGrants: [] },
    { ...identity, userId: 999 },
  ])('rejects invalid identity proof %#', async (proof) => {
    const { store, fetcher } = setup()
    fetcher.mockResolvedValueOnce(json(login)).mockResolvedValueOnce(json(proof))
    await expect(
      store.login('operator@example.invalid', 'password', 'admin'),
    ).rejects.toMatchObject({ status: 403 })
    expect(store.snapshot()).toBeNull()
  })
  it('does not trust a SUPER_ADMIN role string when identity returns 403', async () => {
    const { store, fetcher } = setup()
    fetcher
      .mockResolvedValueOnce(json({ ...login, account: { ...login.account, role: 'SUPER_ADMIN' } }))
      .mockResolvedValueOnce(json({}, 403))
    await expect(
      store.login('operator@example.invalid', 'password', 'admin'),
    ).rejects.toMatchObject({ status: 403 })
    expect(store.snapshot()).toBeNull()
  })
  it('blocks authenticated requests without a session', async () => {
    const { store } = setup()
    await expect(store.api.applications()).rejects.toMatchObject({ status: 401 })
  })
  it.each([401, 403])('clears the session immediately on HTTP %s', async (status) => {
    const { store, fetcher } = setup()
    await store.login('operator@example.invalid', 'password', 'admin')
    fetcher.mockResolvedValueOnce(json({}, status))
    await expect(store.api.applications()).rejects.toMatchObject({ status })
    expect(store.snapshot()).toBeNull()
  })
  it.each([409, 503])(
    'keeps the session on a recoverable HTTP %s action failure',
    async (status) => {
      const { store, fetcher } = setup()
      await store.login('operator@example.invalid', 'password', 'admin')
      fetcher.mockResolvedValueOnce(json({}, status))
      await expect(store.api.createInvitation(7)).rejects.toMatchObject({ status })
      expect(store.snapshot()).not.toBeNull()
      store.logout()
    },
  )
  it('expires a session without requiring another backend request', async () => {
    vi.useFakeTimers()
    const { store } = setup()
    await store.login('operator@example.invalid', 'password', 'admin')
    vi.advanceTimersByTime(900_000)
    expect(store.snapshot()).toBeNull()
    expect(store.notice).toContain('expired')
  })
  it('discards a login that finishes after sign-out', async () => {
    const { store, fetcher } = setup()
    let resolve!: (value: Response) => void
    fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolve = done
        }),
    )
    const pending = store.login('operator@example.invalid', 'password', 'admin')
    store.logout()
    resolve(json(login))
    await expect(pending).rejects.toMatchObject({ status: 401 })
    expect(store.snapshot()).toBeNull()
  })
  it('does not let an old 401 sign out a newer session', async () => {
    const { store, fetcher } = setup()
    await store.login('operator@example.invalid', 'password', 'admin')
    let resolve!: (value: Response) => void
    fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolve = done
        }),
    )
    const pending = store.api.applications()
    store.logout()
    await store.login('operator@example.invalid', 'password', 'admin')
    resolve(json({}, 401))
    await expect(pending).rejects.toMatchObject({ status: 401 })
    expect(store.snapshot()).not.toBeNull()
    store.logout()
  })
  it('rejects expired or malformed session metadata', async () => {
    const { store, fetcher } = setup()
    fetcher.mockResolvedValueOnce(json({ ...login, expiresIn: 0 }))
    await expect(
      store.login('operator@example.invalid', 'password', 'admin'),
    ).rejects.toBeInstanceOf(ApiError)
    expect(store.snapshot()).toBeNull()
  })
  it('verifies merchant assignments instead of treating a role claim as access', async () => {
    const { store, fetcher } = setup()
    await store.login('operator@example.invalid', 'password', 'merchant')
    expect(store.snapshot()).toMatchObject({ mode: 'merchant', brands })
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/super-admin/identity'))).toBe(false)
    await expect(store.api.applications()).rejects.toMatchObject({ status: 403 })
    store.logout()
  })
  it('does not create a merchant session without assigned brands', async () => {
    const { store, fetcher } = setup()
    fetcher.mockResolvedValueOnce(json(login)).mockResolvedValueOnce(json([]))
    await expect(
      store.login('operator@example.invalid', 'password', 'merchant'),
    ).rejects.toMatchObject({ status: 403 })
    expect(store.snapshot()).toBeNull()
  })
})
