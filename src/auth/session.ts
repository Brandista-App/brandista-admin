import { ApiClient, ApiError, operations } from '../api/client'
import type { AssignedBrand } from '../api/types'

export interface Session {
  userId: number
  email: string
  mode: 'admin' | 'merchant'
  expiresAt: number
  brands: AssignedBrand[]
}
export class SessionStore {
  private token: string | null = null
  private value: Session | null = null
  private revision = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private listeners = new Set<() => void>()
  notice = ''
  readonly api: ReturnType<typeof operations>
  constructor(readonly client: ApiClient) {
    this.api = operations(<T>(path: string, init?: RequestInit) => this.request<T>(path, init))
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  snapshot = () => this.value
  private emit() {
    this.listeners.forEach((listener) => listener())
  }
  logout = (notice = '') => {
    this.revision++
    this.token = null
    this.value = null
    this.notice = notice
    clearTimeout(this.timer)
    this.emit()
  }
  async login(email: string, password: string, mode: 'admin' | 'merchant') {
    this.logout()
    const revision = this.revision
    const started = Date.now()
    const result = await this.client.login(email, password)
    if (revision !== this.revision)
      throw new ApiError(401, 'This sign-in was cancelled. Please try again.')
    if (
      !result.accessToken ||
      result.tokenType?.toLowerCase() !== 'bearer' ||
      !Number.isFinite(result.expiresIn) ||
      result.expiresIn <= 0
    ) {
      throw new ApiError(502, 'The backend returned an invalid session.')
    }
    let userId: number
    let brands: AssignedBrand[] = []
    if (mode === 'admin') {
      const identity = await this.client.identity(result.accessToken)
      if (
        identity.userId !== result.account.id ||
        !identity.platformGrants.includes('SUPER_ADMIN')
      ) {
        throw new ApiError(403, 'Verified super-admin access is required.')
      }
      userId = identity.userId
    } else {
      brands = await this.client.assignedBrands(result.accessToken)
      if (!Array.isArray(brands) || brands.length === 0)
        throw new ApiError(403, 'No assigned active brands are available for this account.')
      userId = result.account.id
    }
    if (revision !== this.revision)
      throw new ApiError(401, 'This sign-in was cancelled. Please try again.')
    // Never decode JWT role claims or persist bearer tokens to browser storage.
    const expiresAt = started + Math.min(result.expiresIn * 1000, 2_147_000_000)
    if (expiresAt <= Date.now()) throw new ApiError(401, 'This session has expired. Sign in again.')
    this.token = result.accessToken
    this.value = { userId, email: result.account.email, mode, expiresAt, brands }
    this.timer = setTimeout(
      () => this.logout('Your session expired. Sign in again.'),
      expiresAt - Date.now(),
    )
    this.emit()
  }
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.token
    const revision = this.revision
    if (!token || !this.value || this.value.expiresAt <= Date.now()) {
      this.logout('Your session expired. Sign in again.')
      throw new ApiError(401, 'Sign in to continue.')
    }
    const publicCategoryRead =
      /^\/categories\?page=\d+&size=100$/.test(path) && (!init?.method || init.method === 'GET')
    if (this.value.mode === 'merchant' && !path.startsWith('/merchant/') && !publicCategoryRead)
      throw new ApiError(403, 'This page requires super-admin access.')
    try {
      const data = await this.client.request<T>(path, token, init)
      if (revision !== this.revision) throw new ApiError(401, 'The previous session has ended.')
      return data
    } catch (error) {
      if (
        revision === this.revision &&
        error instanceof ApiError &&
        [401, 403].includes(error.status)
      ) {
        this.logout(
          error.status === 401
            ? 'Your session expired. Sign in again.'
            : 'Access was denied. Sign in again to verify your permissions.',
        )
      }
      throw error
    }
  }
}
