export type Target = 'BOTH' | 'MOBILE' | 'WEBSITE'
export type SectionKey = 'HERO' | 'COLLECTIONS' | 'BRANDS' | 'PRODUCTS'
export interface Banner {
  id: string
  title: string
  description: string
  imageUrl: string
  destination: string
  placement: 'HERO' | 'PROMOTION' | 'COLLECTION'
  target: Target
  enabled: boolean
  startsAt: string | null
  endsAt: string | null
}
export interface ContentDocument {
  banners: Banner[]
  sections: { key: SectionKey; enabled: boolean }[]
  brandIds: number[]
  collectionIds: number[]
}
export interface ContentState {
  version: number
  draft: ContentDocument
  published: ContentDocument | null
}
export interface History {
  id: number
  version: number
  action: string
  actor: string
  occurredAt: string
}
export const contentPath = '/super-admin/content'
export function move<T>(items: T[], index: number, direction: number): T[] {
  const next = index + direction
  if (next < 0 || next >= items.length) return items
  const copy = [...items]
  ;[copy[index], copy[next]] = [copy[next], copy[index]]
  return copy
}
