import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { SessionContext } from '../src/auth/context'
import { SessionStore } from '../src/auth/session'
import { ApiClient } from '../src/api/client'
import type { BrandApplication, Invitation, Onboarding } from '../src/api/types'
import {
  application,
  approved,
  brands,
  identity,
  invitation,
  json,
  login,
  onboarding,
} from './fixtures'

const stores: SessionStore[] = []
afterEach(() => {
  stores.forEach((store) => store.logout())
  stores.length = 0
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
function backend() {
  const state: {
    apps: BrandApplication[]
    invitations: Invitation[]
    onboarding: Onboarding
    loginStatus: number
    identityStatus: number
    failure: number
    listStatus: number
  } = {
    apps: [{ ...application }],
    invitations: [],
    onboarding: { ...onboarding },
    loginStatus: 200,
    identityStatus: 200,
    failure: 0,
    listStatus: 200,
  }
  const fetcher = vi.fn(async (raw: string, init: RequestInit = {}) => {
    const url = new URL(raw)
    const path = url.pathname.replace('/api/v1', '')
    if (path === '/auth/login') return json(login, state.loginStatus)
    if (path === '/super-admin/identity') return json(identity, state.identityStatus)
    if (path === '/merchant/brands') return json(brands)
    if (path === '/admin/brand-applications') return json(state.apps, state.listStatus)
    if (init.method && init.method !== 'GET' && state.failure)
      return json({ message: 'NEVER-ECHO-SECRET' }, state.failure)
    if (path.endsWith('/review')) {
      const body = JSON.parse(init.body as string)
      const updated = {
        ...state.apps[0],
        status: body.decision,
        reviewNote: body.reviewNote,
        brandId: body.decision === 'APPROVED' ? 3 : null,
      }
      state.apps = [updated]
      return json(updated)
    }
    if (path.endsWith('/onboarding')) return json(state.onboarding)
    if (path.endsWith('/activate')) {
      state.onboarding = { ...state.onboarding, brandStatus: 'ACTIVE' }
      return json(state.onboarding)
    }
    if (path.endsWith('/invitations') && init.method === 'POST') {
      state.invitations = [{ ...invitation }]
      return json({ ...invitation, rawToken: 'NEVER-RENDER-RAW-INVITATION' }, 201)
    }
    if (path.endsWith('/invitations')) {
      const page = Number(url.searchParams.get('page'))
      return json({
        content: state.invitations.slice(page * 20, (page + 1) * 20),
        page,
        size: 20,
        totalElements: state.invitations.length,
      })
    }
    if (path.endsWith('/revoke')) {
      state.invitations = [{ ...invitation, status: 'REVOKED' }]
      return json(state.invitations[0])
    }
    if (path.endsWith('/reissue')) {
      state.invitations = [
        { ...invitation, id: 13, replacesInvitationId: 12 },
        { ...invitation, status: 'REVOKED' },
      ]
      return json(state.invitations[0], 201)
    }
    throw new Error(`Unexpected test route: ${path}`)
  })
  vi.stubGlobal('fetch', fetcher)
  const store = new SessionStore(new ApiClient('http://localhost:8080/api/v1'))
  stores.push(store)
  return { state, store, fetcher }
}
async function mount(
  path = '/applications',
  options: {
    mode?: 'admin' | 'merchant'
    guest?: boolean
    approved?: boolean
    eligible?: boolean
    invitationStatus?: 'PENDING' | 'EXPIRED' | 'ACCEPTED'
  } = {},
) {
  const setup = backend()
  if (options.approved) setup.state.apps = [{ ...approved }]
  if (options.eligible) setup.state.onboarding.activationEligible = true
  if (options.invitationStatus)
    setup.state.invitations = [{ ...invitation, status: options.invitationStatus }]
  if (!options.guest)
    await setup.store.login(login.account.email, 'test-password', options.mode ?? 'admin')
  render(
    <SessionContext value={setup.store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  return setup
}
function fillLogin() {
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: login.account.email },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }))
}
async function openDetail(options: Parameters<typeof mount>[1] = {}) {
  const setup = await mount('/applications/7', options)
  await screen.findByRole('heading', { name: 'Test Atelier' })
  return setup
}

describe('login and protected navigation', () => {
  it('protects direct administration URLs before login and makes no privileged requests', async () => {
    const { fetcher } = await mount('/applications/7', { guest: true })
    expect(await screen.findByRole('heading', { name: 'Enter your workspace' })).toBeInTheDocument()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('logs in only after backend identity verification, then displays the authenticated account', async () => {
    const { fetcher } = await mount('/login', { guest: true })
    fillLogin()
    await screen.findByRole('heading', { name: 'Welcome to the control center.' })
    expect(screen.getByText(login.account.email)).toBeInTheDocument()
    expect(fetcher.mock.calls.map((call) => call[0]).slice(0, 2)).toEqual([
      'http://localhost:8080/api/v1/auth/login',
      'http://localhost:8080/api/v1/super-admin/identity',
    ])
    expect(screen.queryByText('test-access-token')).not.toBeInTheDocument()
  })
  it('shows login failure and clears the password field', async () => {
    const { state } = await mount('/login', { guest: true })
    state.loginStatus = 401
    fillLogin()
    expect(await screen.findByRole('alert')).toHaveTextContent('credentials')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument()
  })
  it('rejects login when identity verification denies access', async () => {
    const { state } = await mount('/login', { guest: true })
    state.identityStatus = 403
    fillLogin()
    expect(await screen.findByRole('alert')).toHaveTextContent('authorized account')
    expect(screen.queryByText('Brand applications', { selector: 'a' })).not.toBeInTheDocument()
  })
  it.each([401, 403])(
    'returns to sign-in and removes privileged data on HTTP %s',
    async (status) => {
      const { state } = await mount('/applications')
      await screen.findByRole('link', { name: 'Test Atelier' })
      state.listStatus = status
      fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }))
      expect(
        await screen.findByRole('heading', { name: 'Enter your workspace' }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Test Atelier')).not.toBeInTheDocument()
    },
  )
  it('signs out and removes protected content', async () => {
    await mount()
    await screen.findByRole('link', { name: 'Test Atelier' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByRole('heading', { name: 'Enter your workspace' })
    expect(screen.queryByText('Test Atelier')).not.toBeInTheDocument()
  })
  it('expires the UI session without retaining protected pages', async () => {
    const setup = backend()
    vi.useFakeTimers()
    await setup.store.login(login.account.email, 'test-password', 'admin')
    render(
      <SessionContext value={setup.store}>
        <MemoryRouter initialEntries={['/applications']}>
          <App />
        </MemoryRouter>
      </SessionContext>,
    )
    await act(async () => {
      vi.advanceTimersByTime(900_000)
    })
    expect(screen.getByRole('heading', { name: 'Enter your workspace' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('expired')
  })
  it('keeps merchant navigation isolated and never loads administration data on a direct URL', async () => {
    const { fetcher } = await mount('/applications/7', { mode: 'merchant' })
    expect(
      await screen.findByRole('heading', { name: 'Administration access required' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).queryByText('Brand applications')).not.toBeInTheDocument()
    expect(within(nav).getByText('Assigned brands')).toBeInTheDocument()
    expect(fetcher.mock.calls.some((call) => call[0].includes('/admin/'))).toBe(false)
    fireEvent.click(within(nav).getByRole('link', { name: /Assigned brands/ }))
    expect(await screen.findByRole('heading', { name: 'Test Atelier' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage catalogue' })).toBeInTheDocument()
  })
})

describe('application review', () => {
  it('moves keyboard focus to main content after route navigation', async () => {
    await mount()
    fireEvent.click(await screen.findByRole('link', { name: 'Test Atelier' }))
    await screen.findByRole('heading', { name: 'Test Atelier' })
    expect(screen.getByRole('main')).toHaveFocus()
  })
  it('filters the actual list and shows an empty state', async () => {
    await mount()
    await screen.findByRole('link', { name: 'Test Atelier' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no match' } })
    expect(screen.getByRole('heading', { name: 'No applications to display' })).toBeInTheDocument()
  })
  it('loads detail from the list API without inventing a GET detail endpoint', async () => {
    const { fetcher } = await openDetail()
    expect(screen.getByText('Synthetic test application')).toBeInTheDocument()
    expect(fetcher.mock.calls.some((call) => /\/admin\/brand-applications\/7$/.test(call[0]))).toBe(
      false,
    )
  })
  it.each(['APPROVED', 'REJECTED', 'NEEDS_INFORMATION'] as const)(
    'submits the actual %s review contract after confirmation',
    async (decision) => {
      const { fetcher, state } = await openDetail()
      fireEvent.change(screen.getByLabelText('Decision'), { target: { value: decision } })
      fireEvent.change(screen.getByLabelText(/Review note/), {
        target: { value: 'Operator review note' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Review application' }))
      expect(fetcher.mock.calls.filter((call) => call[0].endsWith('/review'))).toHaveLength(0)
      fireEvent.click(screen.getByRole('button', { name: 'Confirm review' }))
      await waitFor(() => expect(state.apps[0].status).toBe(decision))
      const reviewCall = fetcher.mock.calls.find((call) => call[0].endsWith('/review'))!
      expect(reviewCall[1]).toMatchObject({
        method: 'PATCH',
        body: JSON.stringify({ decision, reviewNote: 'Operator review note' }),
      })
      await screen.findByText(/backend completed the action/)
    },
  )
  it('allows cancelling a destructive confirmation without sending a mutation', async () => {
    const { fetcher } = await openDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Review application' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fetcher.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false)
  })
  it('does not offer a second review on a final decision', async () => {
    await openDetail({ approved: true })
    expect(screen.queryByRole('button', { name: 'Review application' })).not.toBeInTheDocument()
  })
  it('rejects malformed application IDs without requesting invented endpoints', async () => {
    await mount('/applications/not-an-id')
    expect(await screen.findByRole('alert')).toHaveTextContent('Application not found')
  })
})

describe('invitations and controlled activation', () => {
  it('creates an invitation without recipient/token input or raw-token display', async () => {
    const { fetcher } = await openDetail({ approved: true })
    fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(screen.getByText(/recipient is fixed/)).toHaveTextContent(application.contactEmail)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm invitation' }))
    await screen.findByText(/backend confirmed invitation delivery/)
    const call = fetcher.mock.calls.find(
      (call) => call[0].endsWith('/invitations') && call[1]?.method === 'POST',
    )!
    expect(call[1]?.body).toBeUndefined()
    expect(screen.queryByText(/NEVER-RENDER-RAW-INVITATION/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/recipient|token/i)).not.toBeInTheDocument()
  })
  it.each([400, 409, 503])(
    'shows safe HTTP %s invitation failure with no delivery-success claim',
    async (status) => {
      const { state } = await openDetail({ approved: true })
      state.failure = status
      fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirm invitation' }))
      const error = await screen.findByRole('alert')
      expect(error).not.toHaveTextContent('NEVER-ECHO-SECRET')
      if (status === 503) expect(error).toHaveTextContent('No invitation delivery is confirmed')
      if (status === 409) expect(error).toHaveTextContent('conflicts')
      expect(screen.queryByText(/backend confirmed invitation delivery/)).not.toBeInTheDocument()
    },
  )
  it('revokes a pending invitation after confirmation', async () => {
    const { fetcher, state } = await openDetail({ approved: true, invitationStatus: 'PENDING' })
    fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm revocation' }))
    await waitFor(() => expect(state.invitations[0].status).toBe('REVOKED'))
    expect(
      fetcher.mock.calls.some(
        (call) => call[0].endsWith('/brand-invitations/12/revoke') && call[1]?.method === 'POST',
      ),
    ).toBe(true)
  })
  it('reissues an expired invitation using the actual ID route', async () => {
    const { fetcher } = await openDetail({ approved: true, invitationStatus: 'EXPIRED' })
    expect(screen.getByRole('button', { name: 'Revoke invitation 12' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reissue invitation 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reissue' }))
    await screen.findByText(/backend confirmed invitation delivery/)
    expect(
      fetcher.mock.calls.some(
        (call) => call[0].endsWith('/brand-invitations/12/reissue') && call[1]?.method === 'POST',
      ),
    ).toBe(true)
  })
  it('prevents reissuing or revoking accepted invitations', async () => {
    await openDetail({ approved: true, invitationStatus: 'ACCEPTED' })
    expect(screen.getByRole('button', { name: 'Revoke invitation 12' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reissue invitation 12' })).toBeDisabled()
  })
  it('prevents invitation creation before approval and activation before backend eligibility', async () => {
    await openDetail()
    expect(screen.getByRole('button', { name: 'Create invitation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Activate brand' })).toBeDisabled()
  })
  it('activates only after backend eligibility and explicit confirmation, then disables repeated activation', async () => {
    const { fetcher } = await openDetail({ approved: true, eligible: true })
    fireEvent.click(screen.getByRole('button', { name: 'Activate brand' }))
    expect(fetcher.mock.calls.some((call) => call[0].endsWith('/activate'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }))
    await screen.findByText('ACTIVE', { selector: '.badge' })
    expect(screen.getByRole('button', { name: 'Activate brand' })).toBeDisabled()
    expect(
      fetcher.mock.calls.some(
        (call) => call[0].endsWith('/brand-applications/7/activate') && call[1]?.method === 'POST',
      ),
    ).toBe(true)
  })
  it('handles activation eligibility changing on the server with HTTP 409', async () => {
    const { state } = await openDetail({ approved: true, eligible: true })
    state.failure = 409
    state.onboarding.activationEligible = false
    fireEvent.click(screen.getByRole('button', { name: 'Activate brand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm activation' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('conflicts')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Activate brand' })).toBeDisabled(),
    )
  })
})
