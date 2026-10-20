import { ApiError } from '../api/client'

/** Explicit precision: locale currency defaults may round PKR to whole rupees. */
export function formatCurrency(value: number, currency = 'PKR') {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/[\u00a0\u202f]/g, ' ')
}

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
