import { ApiClient, ApiError } from '../api/client'
import type { LoginResponse } from '../api/types'
export type Acceptance = { invitationId: number; brandId: number; membershipId: number }
export async function acceptBrandInvitation(
  client: ApiClient,
  input: { email: string; password: string; token: string; createAccount: boolean },
  signal?: AbortSignal,
): Promise<Acceptance> {
  const email = input.email.trim().toLowerCase()
  const token = input.token.trim()
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new ApiError(400, 'Paste the complete invitation secret from your authorized delivery.')
  if (input.createAccount) {
    if ([...input.password].length < 12 || new TextEncoder().encode(input.password).length > 72)
      throw new ApiError(
        400,
        'A new account password needs at least 12 characters and at most 72 UTF-8 bytes.',
      )
    await client.request('/registrations', null, {
      method: 'POST',
      signal,
      body: JSON.stringify({ email, password: input.password }),
    })
  }
  const session = await client.request<LoginResponse>('/auth/login', null, {
    method: 'POST',
    signal,
    body: JSON.stringify({ email, password: input.password }),
  })
  if (
    !session.accessToken ||
    session.tokenType?.toLowerCase() !== 'bearer' ||
    session.expiresIn <= 0 ||
    !Number.isFinite(session.expiresIn) ||
    session.account?.email.toLowerCase() !== email
  )
    throw new ApiError(502, 'The backend returned an invalid recipient session.')
  const result = await client.request<Acceptance>(
    '/brand-invitations/accept',
    session.accessToken,
    {
      method: 'POST',
      signal,
      body: JSON.stringify({ token }),
    },
  )
  if (
    ![result.invitationId, result.brandId, result.membershipId].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    )
  )
    throw new ApiError(
      502,
      'The invitation response could not be verified. Ask your operator to check its status before retrying.',
    )
  return result
}
