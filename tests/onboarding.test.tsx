import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiClient } from '../src/api/client'
import { SessionStore } from '../src/auth/session'
import { SessionContext } from '../src/auth/context'
import { App } from '../src/App'
import { json } from './fixtures'
const secret = 'a'.repeat(43)
const input = {
  email: 'partner@example.invalid',
  password: 'Synthetic-password-123',
  token: secret,
  createAccount: false,
}
afterEach(() => vi.unstubAllGlobals())
it('route scrolling never installs a Promise as an effect cleanup', () => {
  const scroll = vi
    .spyOn(window, 'scrollTo')
    .mockImplementation(() => Promise.resolve() as unknown as void)
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  const page = render(
    <StrictMode>
      <SessionContext value={store}>
        <MemoryRouter initialEntries={['/presentation']}>
          <App />
        </MemoryRouter>
      </SessionContext>
    </StrictMode>,
  )
  expect(() => page.unmount()).not.toThrow()
  scroll.mockRestore()
})
it('verifies the invitation before atomic account activation and requires terms consent', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      json({
        brandName: 'TSC synthetic',
        recipientEmail: input.email,
        expiresAt: '2026-11-05T10:00:00',
        termsVersion: 'merchant-v1-2026-11',
        existingAccount: false,
      }),
    )
    .mockResolvedValueOnce(json({ invitationId: 12, brandId: 3, membershipId: 8 }))
  vi.stubGlobal('fetch', fetcher)
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/accept-invitation']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  fireEvent.change(screen.getByLabelText('Invitation secret'), { target: { value: secret } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify invitation' }))
  expect(await screen.findByRole('heading', { name: 'TSC synthetic' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Create password'), { target: { value: input.password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: input.password } })
  const consent = screen.getByRole('checkbox')
  expect(consent).not.toBeChecked()
  expect(consent).toBeRequired()
  fireEvent.click(consent)
  fireEvent.click(screen.getByRole('button', { name: 'Accept terms and activate account' }))
  expect(
    await screen.findByRole('heading', { name: 'Your merchant account is ready.' }),
  ).toBeInTheDocument()
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    'https://api.example.invalid/api/v1/merchant-registration/verify',
    'https://api.example.invalid/api/v1/merchant-registration/complete',
  ])
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    token: secret,
    email: input.email,
    password: input.password,
    termsAccepted: true,
    termsVersion: 'merchant-v1-2026-11',
  })
  expect(store.snapshot()).toBeNull()
})
it('loads the private URL fragment and removes it without persisting the invitation', () => {
  window.history.replaceState(null, '', '/accept-invitation#token=' + secret)
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/accept-invitation']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  expect(screen.getByLabelText('Invitation secret')).toHaveValue(secret)
  expect(window.location.hash).toBe('')
  expect(window.localStorage.getItem('token')).toBeNull()
  window.history.replaceState(null, '', '/')
})
it('does not reveal an activation form for an expired or revoked invitation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 400)))
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/accept-invitation']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  fireEvent.change(screen.getByLabelText('Invitation secret'), { target: { value: secret } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify invitation' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('expired, revoked, or already used')
  expect(screen.queryByLabelText('Create password')).not.toBeInTheDocument()
})
it('presentation materials use no API and label role scenarios as illustrative', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/presentation']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  expect(screen.getByText(/ILLUSTRATIVE ONLY/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Fictional brand B' }))
  expect(screen.getByRole('heading', { name: /Gul Studio/ })).toBeInTheDocument()
  expect(screen.getByText(/Illustrative catalogue row/)).toBeInTheDocument()
  expect(fetcher).not.toHaveBeenCalled()
})
