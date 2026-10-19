export type ApplicationStatus = 'SUBMITTED' | 'NEEDS_INFORMATION' | 'APPROVED' | 'REJECTED'
export type ReviewDecision = Exclude<ApplicationStatus, 'SUBMITTED'>
export interface BrandApplication {
  id: number
  brandName: string
  contactName: string
  contactEmail: string
  website: string | null
  message: string | null
  status: ApplicationStatus
  reviewNote: string | null
  reviewedAt: string | null
  brandId: number | null
  approvedBrandStatus: string | null
  createdAt: string
  updatedAt: string
}
export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  account: { id: number; email: string; role: string }
}
export interface Identity {
  userId: number
  platformGrants: string[]
}
export interface AssignedBrand {
  id: number
  name: string
  slug: string
  logoReference: string | null
}
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
export interface Invitation {
  id: number
  applicationId: number
  brandId: number
  recipientEmail: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  replacesInvitationId: number | null
  acceptedUserId: number | null
}
export interface InvitationPage {
  content: Invitation[]
  page: number
  size: number
  totalElements: number
}
export interface Onboarding {
  applicationId: number
  applicationStatus: ApplicationStatus
  brandId: number | null
  brandStatus: string | null
  activationEligible: boolean
}
