import { errorMessage } from './api/client'
export function Loading({ label = 'Loading workspace…' }: { label?: string }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <strong>Unable to complete this request</strong>
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll('_', '-')}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}
