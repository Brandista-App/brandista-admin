import type {
  AssignedBrand,
  BrandApplication,
  Identity,
  Invitation,
  InvitationPage,
  LoginResponse,
  Onboarding,
  ReviewDecision,
  Product,
  ProductInput,
  ProductPage,
  CategoryPage,
  Stock,
} from './types'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}
const messages: Record<number, string> = {
  0: 'Cannot reach the backend. Check the connection and API configuration.',
  400: 'Some details were not accepted. Check the form and try again.',
  401: 'Your session has expired or the credentials were not accepted. Sign in again.',
  403: 'You no longer have access to this workspace. Sign in with an authorized account.',
  404: 'This record is no longer available. Refresh the list.',
  409: 'This action conflicts with the current record. Refresh and review its latest state.',
  429: 'Too many requests. Please wait before trying again.',
  503: 'The service is unavailable. For invitations, delivery may not be configured. No invitation delivery is confirmed.',
}
export function apiBase(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Configure a valid VITE_API_BASE_URL ending in /api/v1.')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, '') !== '/api/v1' ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
  ) {
    throw new Error(
      'The API must use HTTPS (HTTP is allowed only on loopback), end in /api/v1 and contain no credentials or query.',
    )
  }
  return url.href.replace(/\/$/, '')
}

/** Backend messages/bodies are never logged or echoed into privileged UI errors. */
export class ApiClient {
  readonly base: string
  constructor(base: string) {
    this.base = apiBase(base)
  }
  async request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' })
    if (init.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let response: Response
    try {
      response = await fetch(`${this.base}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      })
    } catch {
      throw new ApiError(0, messages[0])
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        messages[response.status] ??
          'The backend could not complete this request. Try again later.',
      )
    try {
      return (await response.json()) as T
    } catch {
      throw new ApiError(502, 'The backend returned an unreadable response. Please try again.')
    }
  }
  login(email: string, password: string) {
    return this.request<LoginResponse>('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    })
  }
  identity(token: string) {
    return this.request<Identity>('/super-admin/identity', token)
  }
  assignedBrands(token: string) {
    return this.request<AssignedBrand[]>('/merchant/brands', token)
  }
}

export function operations(request: <T>(path: string, init?: RequestInit) => Promise<T>) {
  const app = (id: number) => `/super-admin/brand-applications/${id}`
  return {
    applications: () => request<BrandApplication[]>('/admin/brand-applications'),
    review: (id: number, decision: ReviewDecision, reviewNote: string) =>
      request<BrandApplication>(`/admin/brand-applications/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, reviewNote: reviewNote.trim() || null }),
      }),
    invitations: (id: number, page = 0) =>
      request<InvitationPage>(`${app(id)}/invitations?page=${page}&size=20`),
    createInvitation: (id: number) =>
      request<Invitation>(`${app(id)}/invitations`, { method: 'POST' }),
    revokeInvitation: (id: number) =>
      request<Invitation>(`/super-admin/brand-invitations/${id}/revoke`, { method: 'POST' }),
    reissueInvitation: (id: number) =>
      request<Invitation>(`/super-admin/brand-invitations/${id}/reissue`, { method: 'POST' }),
    onboarding: (id: number) => request<Onboarding>(`${app(id)}/onboarding`),
    activate: (id: number) => request<Onboarding>(`${app(id)}/activate`, { method: 'POST' }),
    assignedBrands: () => request<AssignedBrand[]>('/merchant/brands'),
    products: (brand: number, page = 0) =>
      request<ProductPage>(`/merchant/brands/${brand}/products?page=${page}&size=50`),
    product: (brand: number, id: number) =>
      request<Product>(`/merchant/brands/${brand}/products/${id}`),
    saveProduct: (brand: number, input: ProductInput, id?: number) =>
      request<Product>(`/merchant/brands/${brand}/products${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({ ...input, brandId: brand }),
      }),
    productStatus: (brand: number, id: number, action: 'publish' | 'unpublish' | 'deactivate') =>
      request<Product>(`/merchant/brands/${brand}/products/${id}/${action}`, { method: 'PATCH' }),
    stock: (brand: number, id: number) =>
      request<Stock>(`/merchant/brands/${brand}/products/${id}/stock`),
    saveStock: (brand: number, id: number, stockQuantity: number) =>
      request<Stock>(`/merchant/brands/${brand}/products/${id}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ stockQuantity }),
      }),
    categories: async () => {
      const categories: CategoryPage['content'] = []
      let page = 0
      let total: number
      do {
        const result = await request<CategoryPage>(`/categories?page=${page}&size=100`)
        categories.push(...result.content)
        total = result.totalPages
        page++
      } while (page < total)
      return categories
    },
  }
}
