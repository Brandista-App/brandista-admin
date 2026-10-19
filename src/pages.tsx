import { useCallback, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from './api/client'
import type { BrandApplication, Invitation, ReviewDecision } from './api/types'
import { useAuth } from './auth/context'
import { Badge, ErrorNotice, Loading } from './components'
import { dateTime, validId } from './lib/format'
import { useResource } from './lib/resource'

export function Overview() {
  const { store } = useAuth()
  const resource = useResource('overview', store.api.applications)
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DAILY PERSPECTIVE</span>
          <h1>Welcome to the control center.</h1>
          <p className="muted">A clear view of the brands joining Brandista.</p>
        </div>
        <Link className="button primary" to="/applications">
          Review applications <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        resource.data && (
          <>
            <div className="metric-grid">
              {[
                ['Applications', resource.data.length, 'All received applications'],
                [
                  'Awaiting review',
                  resource.data.filter((app) => app.status === 'SUBMITTED').length,
                  'Ready for your attention',
                ],
                [
                  'Approved',
                  resource.data.filter((app) => app.status === 'APPROVED').length,
                  'Continue partner onboarding',
                ],
              ].map(([label, count, hint]) => (
                <article className="metric" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                  <small>{hint}</small>
                </article>
              ))}
            </div>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">THE NEXT STEP</span>
                  <h2>From application to activation</h2>
                </div>
                <span className="step-count">01 — 04</span>
              </div>
              <div className="journey">
                {[
                  ['01', 'Review', 'Read the application and record a decision.'],
                  ['02', 'Invite', 'Invite the approved contact through configured delivery.'],
                  [
                    '03',
                    'Verify',
                    'Check that the invitation was accepted and membership is eligible.',
                  ],
                  [
                    '04',
                    'Activate',
                    'Activate the brand only when the backend confirms eligibility.',
                  ],
                ].map(([number, title, description]) => (
                  <article key={number}>
                    <span>{number}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </section>
            <div className="section-heading">
              <h2>Recent applications</h2>
              <Link to="/applications">View all applications →</Link>
            </div>
            <ApplicationTable applications={resource.data.slice(0, 5)} />
          </>
        )
      )}
    </section>
  )
}
function ApplicationTable({ applications }: { applications: BrandApplication[] }) {
  if (!applications.length)
    return (
      <div className="panel empty-state">
        <h2>No applications to display</h2>
        <p>Applications will appear here when brands submit them.</p>
      </div>
    )
  return (
    <div className="table-scroll panel">
      <table>
        <caption className="sr-only">Brand applications</caption>
        <thead>
          <tr>
            <th scope="col">Brand / applicant</th>
            <th scope="col">Received</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id}>
              <td>
                <Link className="brand-link" to={`/applications/${app.id}`}>
                  {app.brandName}
                </Link>
                <small>
                  {app.contactName} · {app.contactEmail}
                </small>
              </td>
              <td>{dateTime(app.createdAt)}</td>
              <td>
                <Badge value={app.status} />
              </td>
              <td>
                <Link
                  className="table-action"
                  aria-label={`View ${app.brandName}`}
                  to={`/applications/${app.id}`}
                >
                  View <span aria-hidden="true">↗</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export function Applications() {
  const { store } = useAuth()
  const resource = useResource('applications', store.api.applications)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const filtered = resource.data?.filter(
    (app) =>
      (status === 'ALL' || app.status === status) &&
      `${app.brandName} ${app.contactName} ${app.contactEmail}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PARTNER RELATIONSHIPS</span>
          <h1>Brand applications</h1>
          <p className="muted">Review the details. Set a thoughtful first impression.</p>
        </div>
        <button className="button secondary" onClick={resource.reload} disabled={resource.loading}>
          Refresh list
        </button>
      </div>
      <div className="filters">
        <div>
          <label htmlFor="search">Find an application</label>
          <input
            id="search"
            type="search"
            placeholder="Brand, contact or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="status">Application status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['ALL', 'SUBMITTED', 'NEEDS_INFORMATION', 'APPROVED', 'REJECTED'].map((value) => (
              <option key={value} value={value}>
                {value === 'ALL' ? 'All statuses' : value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
      {resource.loading ? (
        <Loading label="Loading applications…" />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <p className="result-count">{filtered?.length ?? 0} applications shown</p>
          <ApplicationTable applications={filtered ?? []} />
        </>
      )}
    </section>
  )
}

type Intent =
  | { kind: 'review'; decision: ReviewDecision; note: string }
  | { kind: 'create' }
  | { kind: 'activate' }
  | { kind: 'revoke'; id: number }
  | { kind: 'reissue'; id: number }
const intentLabels = {
  review: 'Confirm review',
  create: 'Confirm invitation',
  activate: 'Confirm activation',
  revoke: 'Confirm revocation',
  reissue: 'Confirm reissue',
}
export function ApplicationDetail() {
  const { id: rawId } = useParams()
  // A route key remount also clears review drafts and confirmations between records.
  return <Detail key={rawId} rawId={rawId} />
}
function Detail({ rawId }: { rawId: string | undefined }) {
  const { store } = useAuth()
  const [page, setPage] = useState(0)
  const load = useCallback(async () => {
    const id = validId(rawId)
    const applications = await store.api.applications()
    const application = applications.find((app) => app.id === id)
    if (!application) throw new ApiError(404, 'Application not found.')
    const [onboarding, invitations] = await Promise.all([
      store.api.onboarding(id),
      store.api.invitations(id, page),
    ])
    return { application, onboarding, invitations }
  }, [rawId, store, page])
  const resource = useResource(`detail:${rawId}:${page}`, load)
  const [decision, setDecision] = useState<ReviewDecision>('NEEDS_INFORMATION')
  const [note, setNote] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [notice, setNotice] = useState('')
  const confirm = (action: Intent) => {
    setError(undefined)
    setNotice('')
    setIntent(action)
  }
  async function execute() {
    if (!intent || !resource.data || busy) return
    const action = intent
    const id = resource.data.application.id
    setBusy(true)
    setError(undefined)
    setNotice('')
    try {
      if (action.kind === 'review') await store.api.review(id, action.decision, action.note)
      else if (action.kind === 'create') await store.api.createInvitation(id)
      else if (action.kind === 'activate') await store.api.activate(id)
      else if (action.kind === 'revoke') await store.api.revokeInvitation(action.id)
      else await store.api.reissueInvitation(action.id)
      setNotice(
        action.kind === 'create' || action.kind === 'reissue'
          ? 'The backend confirmed invitation delivery. Review the refreshed invitation status below.'
          : 'The backend completed the action. Review the refreshed state below.',
      )
      setIntent(null)
      resource.reload()
    } catch (failure) {
      setError(failure)
      setIntent(null)
      resource.reload()
    } finally {
      setBusy(false)
    }
  }
  function review(event: FormEvent) {
    event.preventDefault()
    confirm({ kind: 'review', decision, note })
  }
  const data = resource.data
  return (
    <section className="page">
      <Link className="back-link" to="/applications">
        ← All applications
      </Link>
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {error !== undefined && <ErrorNotice error={error} />}
      {resource.loading ? (
        <Loading label="Loading application and onboarding…" />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        data && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">APPLICATION #{data.application.id}</span>
                <h1>{data.application.brandName}</h1>
                <p className="muted">Received {dateTime(data.application.createdAt)}</p>
              </div>
              <Badge value={data.application.status} />
            </div>
            {intent && (
              <section className="confirmation" aria-labelledby="confirm-heading">
                <h2 id="confirm-heading">{intentLabels[intent.kind]}</h2>
                <p>
                  {intent.kind === 'review'
                    ? `Record ${intent.decision.replaceAll('_', ' ')} for ${data.application.brandName}? Approval creates an inactive brand; it does not activate it.`
                    : intent.kind === 'activate'
                      ? 'Activate this brand? It will become available through existing customer catalogue rules. The backend rechecks eligibility.'
                      : intent.kind === 'revoke'
                        ? 'Revoke this pending invitation? The recipient will no longer be able to accept it.'
                        : intent.kind === 'reissue'
                          ? `Replace invitation #${intent.id}? Its previous token will stop working only if the new invitation is committed.`
                          : `Send an invitation to ${data.application.contactEmail}? This recipient is fixed by the approved application.`}
                </p>
                <div className="actions">
                  <button className="button primary" disabled={busy} onClick={() => void execute()}>
                    {busy ? 'Completing action…' : intentLabels[intent.kind]}
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setIntent(null)}
                  >
                    Cancel
                  </button>
                </div>
              </section>
            )}
            <div className="detail-grid">
              <section className="panel detail-card">
                <h2>Application details</h2>
                <dl>
                  <dt>Contact</dt>
                  <dd>{data.application.contactName}</dd>
                  <dt>Email</dt>
                  <dd>{data.application.contactEmail}</dd>
                  <dt>Website</dt>
                  <dd>{data.application.website || 'Not provided'}</dd>
                  <dt>Brand ID</dt>
                  <dd>{data.application.brandId ?? 'Not yet assigned'}</dd>
                  <dt>Applicant message</dt>
                  <dd className="preserve-lines">
                    {data.application.message || 'No message provided'}
                  </dd>
                  <dt>Latest review</dt>
                  <dd className="preserve-lines">
                    {data.application.reviewNote || 'No review note recorded'}
                  </dd>
                  <dt>Reviewed</dt>
                  <dd>{dateTime(data.application.reviewedAt)}</dd>
                </dl>
              </section>
              <section className="panel detail-card">
                <h2>Review application</h2>
                {['SUBMITTED', 'NEEDS_INFORMATION'].includes(data.application.status) ? (
                  <form onSubmit={review}>
                    <fieldset disabled={busy || !!intent}>
                      <label htmlFor="decision">Decision</label>
                      <select
                        id="decision"
                        value={decision}
                        onChange={(e) => setDecision(e.target.value as ReviewDecision)}
                      >
                        <option value="NEEDS_INFORMATION">Request more information</option>
                        <option value="APPROVED">Approve application</option>
                        <option value="REJECTED">Reject application</option>
                      </select>
                      <label htmlFor="review-note">
                        Review note <span className="muted">(optional)</span>
                      </label>
                      <textarea
                        id="review-note"
                        rows={5}
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <p className="form-hint">
                        Approval creates an inactive brand. Requesting information records the
                        decision and note; this portal does not send a follow-up email.
                      </p>
                      <button className="button primary" type="submit">
                        Review application
                      </button>
                    </fieldset>
                  </form>
                ) : (
                  <p className="muted">
                    This application has a final decision. The backend does not support reviewing it
                    again.
                  </p>
                )}
              </section>
            </div>
            <section className="panel detail-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">CONTROLLED LAUNCH</span>
                  <h2>Onboarding & activation</h2>
                </div>
                <Badge value={data.onboarding.brandStatus ?? 'NOT_CREATED'} />
              </div>
              <p>
                {data.onboarding.activationEligible
                  ? 'The backend confirms an accepted invitation and eligible active membership.'
                  : 'Activation requires approval, an accepted invitation and an eligible active membership. The backend makes the final decision.'}
              </p>
              <div className="actions">
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    !!intent ||
                    data.application.status !== 'APPROVED' ||
                    !data.onboarding.activationEligible ||
                    data.onboarding.brandStatus === 'ACTIVE'
                  }
                  onClick={() => confirm({ kind: 'activate' })}
                >
                  Activate brand
                </button>
                <button
                  className="button secondary"
                  disabled={busy || !!intent}
                  onClick={resource.reload}
                >
                  Refresh onboarding
                </button>
              </div>
            </section>
            <section className="panel detail-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">A PERSONAL WELCOME</span>
                  <h2>Brand invitations</h2>
                </div>
                <button
                  className="button primary"
                  disabled={busy || !!intent || data.application.status !== 'APPROVED'}
                  onClick={() => confirm({ kind: 'create' })}
                >
                  Create invitation
                </button>
              </div>
              <p className="muted">
                Recipient: <strong>{data.application.contactEmail}</strong>. Invitation secrets are
                delivered by the backend and never shown here.
              </p>
              {data.invitations.content.length ? (
                <div className="table-scroll">
                  <table>
                    <caption className="sr-only">Invitations for this application</caption>
                    <thead>
                      <tr>
                        <th scope="col">Invitation</th>
                        <th scope="col">Status</th>
                        <th scope="col">Expires</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invitations.content.map((invitation) => (
                        <InvitationRow
                          key={invitation.id}
                          invitation={invitation}
                          disabled={busy || !!intent}
                          confirm={confirm}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state compact">
                  <h3>No invitations on this page</h3>
                  <p>
                    Approved applications can receive an invitation through configured delivery.
                  </p>
                </div>
              )}
              <div className="pagination">
                <span>
                  Page {page + 1} · {data.invitations.totalElements} invitations
                </span>
                <div>
                  <button
                    className="button text"
                    disabled={busy || !!intent || page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="button text"
                    disabled={
                      busy ||
                      !!intent ||
                      (page + 1) * data.invitations.size >= data.invitations.totalElements
                    }
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )
      )}
    </section>
  )
}
function InvitationRow({
  invitation,
  disabled,
  confirm,
}: {
  invitation: Invitation
  disabled: boolean
  confirm: (intent: Intent) => void
}) {
  return (
    <tr>
      <td>
        <strong>#{invitation.id}</strong>
        <small>{invitation.recipientEmail}</small>
        {invitation.replacesInvitationId && (
          <small>Replaces #{invitation.replacesInvitationId}</small>
        )}
      </td>
      <td>
        <Badge value={invitation.status} />
      </td>
      <td>{dateTime(invitation.expiresAt)}</td>
      <td>
        <div className="actions">
          <button
            className="button text"
            disabled={disabled || invitation.status !== 'PENDING'}
            aria-label={`Revoke invitation ${invitation.id}`}
            onClick={() => confirm({ kind: 'revoke', id: invitation.id })}
          >
            Revoke
          </button>
          <button
            className="button text"
            disabled={disabled || !['PENDING', 'EXPIRED'].includes(invitation.status)}
            aria-label={`Reissue invitation ${invitation.id}`}
            onClick={() => confirm({ kind: 'reissue', id: invitation.id })}
          >
            Reissue
          </button>
        </div>
      </td>
    </tr>
  )
}
export function AssignedBrands() {
  const { store } = useAuth()
  const resource = useResource('assigned-brands', store.api.assignedBrands)
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MERCHANT WORKSPACE</span>
          <h1>Your assigned brands</h1>
          <p className="muted">The active brands your account is authorized to access.</p>
        </div>
        <button className="button secondary" disabled={resource.loading} onClick={resource.reload}>
          Refresh brands
        </button>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorNotice error={resource.error} retry={resource.reload} />
      ) : (
        <div className="brand-grid">
          {resource.data?.map((brand) => (
            <article key={brand.id} className="panel brand-card">
              <span className="eyebrow">BRAND #{brand.id}</span>
              <h2>{brand.name}</h2>
              <p>{brand.slug}</p>
              <Badge value="ASSIGNED" />
            </article>
          ))}
          {!resource.data?.length && (
            <div className="panel empty-state">
              <h2>No assigned brands</h2>
              <p>Ask an authorized operator to review your brand membership.</p>
            </div>
          )}
        </div>
      )}
      <p className="scope-note">
        This is a read-only brand access foundation. Merchant catalogue management and order
        dashboards are not implemented in this release.
      </p>
    </section>
  )
}
