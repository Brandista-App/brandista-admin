import { Link } from 'react-router-dom'
export function MerchantTerms() {
  return (
    <main className="public-workspace">
      <section className="panel onboarding-panel">
        <span className="eyebrow">BRANDISTA MERCHANT PARTNERSHIPS</span>
        <h1>Merchant terms</h1>
        <p>Version merchant-v1-2026-11</p>
        <h2>Your account and assigned brand</h2>
        <p>
          Use your account only for the brand assigned by Brandista. Keep your credentials and
          invitation private. You are responsible for actions performed through your account and
          must notify Brandista if access is compromised.
        </p>
        <h2>Accurate listings and fulfilment</h2>
        <p>
          Publish accurate product descriptions, prices, availability, and inventory. List only
          products you are authorized to sell. Fulfil accepted orders accurately and promptly, and
          follow the applicable Brandista order, delivery, cancellation, and returns policies
          communicated to your brand.
        </p>
        <h2>Customer information</h2>
        <p>
          Use customer and order information only to fulfil and support the relevant orders. Do not
          share it, export it for unrelated marketing, or use it to access another merchant's
          records.
        </p>
        <h2>Platform access</h2>
        <p>
          Brandista may suspend or revoke access for misuse, inaccurate listings, or security
          concerns. Access does not grant authority over other brands.
        </p>
        <h2>Commercial arrangements</h2>
        <p>
          Fees, settlement schedules, service obligations, and brand-specific arrangements remain
          subject to your separate agreement with Brandista. Contact Brandista Partnerships if you
          need clarification before accepting.
        </p>
        <p>
          Acceptance records this version and the time against your invitation and brand assignment.
        </p>
        <Link to="/login">Workspace sign-in</Link>
      </section>
    </main>
  )
}
