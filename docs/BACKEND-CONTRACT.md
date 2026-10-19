# Backend integration contract — PR5

Inspected in the official local `brandista-mvp` checkout at merged PR4 commit `c5c11b9a828a2b72512cd4207ca17fd301a002c0`. All paths below are relative to the configured API root ending in `/api/v1`. No backend source or authorization rule is changed in this PR.

| Method | Path                                                              | Request / response                                                                                     |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/login`                                                     | `{email,password}` → `{accessToken,tokenType,expiresIn,account:{id,email,role}}`; expiry is seconds    |
| GET    | `/super-admin/identity`                                           | Bearer token → `{userId,platformGrants}`; require matching account ID and `SUPER_ADMIN`                |
| GET    | `/admin/brand-applications`                                       | Array of application DTOs, newest first; **not** a Spring page                                         |
| PATCH  | `/admin/brand-applications/{id}/review`                           | `{decision,reviewNote}` → updated application; note null/optional, max 2000 chars                      |
| GET    | `/super-admin/brand-applications/{id}/invitations?page=0&size=20` | `{content,page,size,totalElements}`; invitation status DTOs                                            |
| POST   | `/super-admin/brand-applications/{id}/invitations`                | No body / recipient override → invitation status, 201                                                  |
| POST   | `/super-admin/brand-invitations/{id}/revoke`                      | No body → invitation status                                                                            |
| POST   | `/super-admin/brand-invitations/{id}/reissue`                     | No body → replacement invitation status, 201                                                           |
| GET    | `/super-admin/brand-applications/{id}/onboarding`                 | `{applicationId,applicationStatus,brandId,brandStatus,activationEligible}`                             |
| POST   | `/super-admin/brand-applications/{id}/activate`                   | No body → updated onboarding state                                                                     |
| GET    | `/merchant/brands`                                                | Array of `{id,name,slug,logoReference}` for current active assignments; empty/no access may return 403 |

Application DTO: `id`, `brandName`, `contactName`, `contactEmail`, `website`, `message`, `status`, `reviewNote`, `reviewedAt`, `brandId`, `approvedBrandStatus`, `createdAt`, `updatedAt`. Optional values are nullable. The backend has no GET application detail route: the UI resolves details from the list endpoint. Backend list pagination is not invented; search/status filtering is local and scaling this list is a future backend capability.

Application states: SUBMITTED, NEEDS_INFORMATION, APPROVED, REJECTED. Only the first two are reviewable. Review decisions are NEEDS_INFORMATION, APPROVED or REJECTED. Approval creates an **inactive** brand. Requesting information records a status/note; it does not send a follow-up email in this UI. Final applications cannot be reviewed again through the existing contract.

Invitation DTO: `id`, `applicationId`, `brandId`, `recipientEmail`, `status`, `createdAt`, `expiresAt`, `replacesInvitationId`, `acceptedUserId`. The UI selects named fields only for display. It never renders generic JSON responses or provides invitation-token fields. Statuses: PENDING, ACCEPTED, EXPIRED, REVOKED. Reissue is offered for PENDING/EXPIRED; revoke is offered for PENDING. Backend enforcement is authoritative if the state changes while a page is open. Refresh follows successful and failed mutations. Invocation success is shown only after a successful backend response; a later refresh failure is separately visible.

Activation requires approved application, accepted invitation and the backend's current membership/user eligibility. `activationEligible` gates the button, and the server rechecks on POST. Already ACTIVE brands have the action disabled. No alternative global-brand endpoint bypass is used.

Date fields are Spring UTC LocalDateTime without offsets, rendered explicitly as UTC. Login `expiresIn` sets a tab-local expiry timer; the backend still enforces JWT expiry and current privilege state.

Error handling: 400 validation guidance, 401 session loss, 403 access loss (fail-closed sign-out), 404 unavailable record, 409 refresh/review conflicting state, 429 retry later, 503 unavailable/unconfigured delivery, other failures generic. Arbitrary backend error bodies and raw network exception diagnostics are not echoed or logged. This intentionally sacrifices detailed server field-error strings to avoid reflecting sensitive payloads. Frontend required/email/max-length controls supplement backend validation.

The automated endpoint/body assertions and UI fixtures mirror these inspected DTOs. They are not a live-backend contract test; a deployment must run acceptance against its approved backend revision and selected CORS origins.
