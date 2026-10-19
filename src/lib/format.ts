import { ApiError } from '../api/client'

export function dateTime(value: string | null) {
  if (!value) return '—'
  // Backend LocalDateTime is UTC, not the browser's local timezone.
  const time = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(time.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(time) + ' UTC'
}
export function validId(value: string | undefined) {
  const id = Number(value)
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0)
    throw new ApiError(404, 'Application not found.')
  return id
}
