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

export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'DEACTIVATED'
export interface ProductInput {
  name: string
  slug: string
  description: string | null
  brandId: number
  categoryId: number
  price: number
  availability: 'AVAILABLE' | 'UNAVAILABLE'
}
export interface Product extends ProductInput {
  id: number
  brandName: string
  categoryName: string
  currency: string
  publicationStatus: PublicationStatus
  stockQuantity: number
  createdAt: string
  updatedAt: string
}
export interface ProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface CategoryPage {
  content: { id: number; name: string; status: string }[]
  page: number
  totalPages: number
}
export interface Stock {
  productId: number
  stockQuantity: number
}

export type FulfillmentStatus = 'PLACED' | 'ACCEPTED' | 'PACKED' | 'SHIPPED' | 'DELIVERED'
export interface MerchantOrderSummary {
  orderId: number
  brandId: number
  createdAt: string
  fulfillmentStatus: FulfillmentStatus
  version: number
  currency: string
  itemsSubtotal: number
  lineCount: number
  availableTransitions: FulfillmentStatus[]
}
export interface MerchantOrderPage {
  content: MerchantOrderSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface MerchantOrderDetail {
  order: MerchantOrderSummary
  deliveryAddress: {
    recipientName: string
    phoneNumber: string
    addressLine1: string
    addressLine2: string | null
    city: string
    province: string | null
    postalCode: string | null
    deliveryInstructions: string | null
  }
  items: {
    productId: number
    productSlug: string
    productName: string
    brandId: number
    brandName: string
    quantity: number
    unitPrice: number
    lineSubtotal: number
  }[]
  timeline: {
    fromStatus: FulfillmentStatus
    toStatus: FulfillmentStatus
    version: number
    occurredAt: string
  }[]
}
