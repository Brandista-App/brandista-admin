import type { BrandApplication, Invitation, Onboarding } from '../src/api/types'

export const application: BrandApplication = {
  id: 7,
  brandName: 'Test Atelier',
  contactName: 'Test Partner',
  contactEmail: 'partner@example.invalid',
  website: 'https://example.invalid',
  message: 'Synthetic test application',
  status: 'SUBMITTED',
  reviewNote: null,
  reviewedAt: null,
  brandId: null,
  approvedBrandStatus: null,
  createdAt: '2026-10-19T09:00:00',
  updatedAt: '2026-10-19T09:00:00',
}
export const approved: BrandApplication = {
  ...application,
  status: 'APPROVED',
  brandId: 3,
  approvedBrandStatus: 'INACTIVE',
}
export const invitation: Invitation = {
  id: 12,
  applicationId: 7,
  brandId: 3,
  recipientEmail: application.contactEmail,
  status: 'PENDING',
  createdAt: '2026-10-19T09:00:00',
  expiresAt: '2026-10-20T09:00:00',
  replacesInvitationId: null,
  acceptedUserId: null,
}
export const onboarding: Onboarding = {
  applicationId: 7,
  applicationStatus: 'APPROVED',
  brandId: 3,
  brandStatus: 'INACTIVE',
  activationEligible: false,
}
export const login = {
  accessToken: 'test-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  account: { id: 41, email: 'operator@example.invalid', role: 'CUSTOMER' },
}
export const identity = { userId: 41, platformGrants: ['SUPER_ADMIN'] }
export const brands = [{ id: 3, name: 'Test Atelier', slug: 'test-atelier', logoReference: null }]
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
