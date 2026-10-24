import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiClient } from '../src/api/client'
import { acceptBrandInvitation } from '../src/onboarding/accept'
import { SessionStore } from '../src/auth/session'
import { SessionContext } from '../src/auth/context'
import { App } from '../src/App'
import { json, login } from './fixtures'
const secret = 'a'.repeat(43)
const input = {
  email: 'partner@example.invalid',
  password: 'Synthetic-password-123',
  token: secret,
  createAccount: false,
}
afterEach(() => vi.unstubAllGlobals())
it('accepts only through authenticated existing contract without requiring active merchant access', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ ...login, account: { ...login.account, email: input.email } }))
    .mockResolvedValueOnce(json({ invitationId: 12, brandId: 3, membershipId: 8 }))
  vi.stubGlobal('fetch', fetcher)
  await expect(
    acceptBrandInvitation(new ApiClient('https://api.example.invalid/api/v1'), input),
  ).resolves.toEqual({ invitationId: 12, brandId: 3, membershipId: 8 })
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    'https://api.example.invalid/api/v1/auth/login',
    'https://api.example.invalid/api/v1/brand-invitations/accept',
  ])
  expect(fetcher.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer test-access-token')
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ token: secret })
  expect(fetcher.mock.calls[1][1]).toMatchObject({
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  })
})
it('rejects malformed secrets before login or account creation', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await expect(
    acceptBrandInvitation(new ApiClient('https://api.example.invalid/api/v1'), {
      ...input,
      token: 'bad',
      createAccount: true,
    }),
  ).rejects.toThrow('complete invitation secret')
  expect(fetcher).not.toHaveBeenCalled()
})
it('keeps invalid, expired and wrong-recipient rejection generic and does not claim activation', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(json({ ...login, account: { ...login.account, email: input.email } }))
      .mockResolvedValueOnce(json({ token: secret, password: 'never echo' }, 400)),
  )
  await expect(
    acceptBrandInvitation(new ApiClient('https://api.example.invalid/api/v1'), input),
  ).rejects.toThrow('Some details were not accepted')
})
it('creates only an explicitly requested ordinary customer identity before acceptance', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ id: 8 }, 201))
    .mockResolvedValueOnce(json({ ...login, account: { ...login.account, email: input.email } }))
    .mockResolvedValueOnce(json({ invitationId: 12, brandId: 3, membershipId: 8 }))
  vi.stubGlobal('fetch', fetcher)
  await acceptBrandInvitation(new ApiClient('https://api.example.invalid/api/v1'), {
    ...input,
    createAccount: true,
  })
  expect(fetcher.mock.calls[0][0]).toContain('/registrations')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    email: input.email,
    password: input.password,
  })
})
it('clears secret fields on submit and reports acceptance separately from brand activation', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(json({ ...login, account: { ...login.account, email: input.email } }))
      .mockResolvedValueOnce(json({ invitationId: 12, brandId: 3, membershipId: 8 })),
  )
  const store = new SessionStore(new ApiClient('https://api.example.invalid/api/v1'))
  render(
    <SessionContext value={store}>
      <MemoryRouter initialEntries={['/accept-invitation']}>
        <App />
      </MemoryRouter>
    </SessionContext>,
  )
  fireEvent.change(screen.getByLabelText('Invited email'), { target: { value: input.email } })
  fireEvent.change(screen.getByLabelText('Recipient account password'), {
    target: { value: input.password },
  })
  fireEvent.change(screen.getByLabelText('Invitation secret'), { target: { value: secret } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify identity and accept invitation' }))
  expect(await screen.findByRole('heading', { name: 'Invitation accepted' })).toBeInTheDocument()
  expect(screen.getByText(/Ask your operator to activate/)).toBeInTheDocument()
  expect(store.snapshot()).toBeNull()
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
