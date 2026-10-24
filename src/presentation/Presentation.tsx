import { useState } from 'react'
import { Link } from 'react-router-dom'
const steps = [
  [
    'Application',
    'Prospective brand',
    'Submit the existing customer website’s /partners form. An application is a request for review, not acceptance or a partnership.',
    'Example: Mehr Atelier submits a synthetic introduction.',
  ],
  [
    'Review',
    'Super-admin',
    'Read the contact and brand details in Applications. Record a decision. Only an explicit super-admin grant can approve.',
    'Example: the operator approves the fictional application.',
  ],
  [
    'Approval',
    'Super-admin',
    'Approval creates an inactive brand. Review the linked onboarding state before issuing an invitation.',
    'Example: Mehr Atelier remains INACTIVE.',
  ],
  [
    'Invitation',
    'Super-admin',
    'Issue through configured delivery, then inspect status. Recipient is bound to the approved contact email. Reissue or revoke supported pending invitations.',
    'Production email is not configured or verified by this presentation.',
  ],
  [
    'Account acceptance',
    'Invited brand administrator',
    'Use Accept invitation with the invited email, account password and delivered secret. A new customer identity can be registered first. No platform privilege is granted.',
    'Example: acceptance creates only the invited brand membership.',
  ],
  [
    'Activation',
    'Super-admin',
    'Refresh onboarding eligibility, then activate through the existing server-controlled action. Acceptance alone does not activate a brand.',
    'Example: an eligible fictional brand becomes ACTIVE.',
  ],
  [
    'Catalogue setup',
    'Brand administrator',
    'Sign in to Merchant, select an assigned brand, create a draft product, set PKR price and stock, then publish. Inventory and publication are separate.',
    'Example: 20 units of a fictional embroidered lawn product. No upload API is claimed.',
  ],
  [
    'Orders',
    'Customer and brand administrator',
    'Customer reviews a saved address and places an unpaid COD order. Each brand sees only its order lines and advances supported fulfillment states.',
    'PLACED → ACCEPTED → PACKED → SHIPPED → DELIVERED. No courier booking or payment settlement is claimed.',
  ],
]
export function Presentation() {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('super')
  return (
    <main className="public-workspace presentation-page">
      <header className="public-header">
        <Link to="/login">
          <img
            src="/brandista-approved-logo.jpeg.jpeg"
            alt="Brandista — Many brands. One destination."
          />
        </Link>
        <Link className="button secondary" to="/login">
          Open real workspace sign-in
        </Link>
      </header>
      <div className="presentation-label" role="note">
        OFFLINE PRESENTATION MATERIALS · ILLUSTRATIVE ONLY · NO ACCOUNTS OR ORDERS ARE CREATED
      </div>
      <section className="page-heading">
        <div>
          <span className="eyebrow">MANY BRANDS. ONE DESTINATION.</span>
          <h1>A marketplace, from every side.</h1>
          <p className="muted">
            Customer discovery. Independent brand control. Considered platform operations.
          </p>
        </div>
      </section>
      <section className="panel">
        <h2>One journey, eight clear steps.</h2>
        <p>
          This guide is bundled in the existing admin web build. It explains implemented workflows
          without impersonating a functioning backend or an authenticated dashboard.
        </p>
        <nav className="presentation-steps" aria-label="Onboarding journey">
          {steps.map(([title], i) => (
            <button
              key={title}
              className={`button ${i === step ? 'primary' : 'secondary'}`}
              aria-pressed={i === step}
              onClick={() => setStep(i)}
            >
              {String(i + 1).padStart(2, '0')} · {title}
            </button>
          ))}
        </nav>
        <article className="presentation-detail">
          <span className="eyebrow">{steps[step][1]}</span>
          <h2>{steps[step][0]}</h2>
          <p>{steps[step][2]}</p>
          <p className="notice">{steps[step][3]}</p>
        </article>
      </section>
      <section className="panel">
        <h2>Explore the workspace responsibilities.</h2>
        <div className="actions" role="group" aria-label="Presentation roles">
          {[
            ['super', 'Super-admin'],
            ['brand-a', 'Fictional brand A'],
            ['brand-b', 'Fictional brand B'],
            ['customer', 'Customer'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`button ${role === value ? 'primary' : 'secondary'}`}
              aria-pressed={role === value}
              onClick={() => setRole(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {role === 'super' ? (
          <>
            <h3>Super-admin control center</h3>
            <p>
              Review applications, issue/revoke/reissue invitations, check acceptance and activation
              eligibility. Brand membership does not confer platform privileges.
            </p>
            <div className="metric-grid">
              <article className="metric">
                <span>Illustrative applications</span>
                <strong>2</strong>
                <small>Synthetic presentation scenario only</small>
              </article>
              <article className="metric">
                <span>Operator actions</span>
                <strong>Review → activate</strong>
                <small>Require a real authorized account and backend</small>
              </article>
            </div>
          </>
        ) : role === 'customer' ? (
          <>
            <h3>Customer shopping</h3>
            <p>
              The standalone Android APK bundles fictional discovery, search, bag and simulated
              checkout. Those demo orders never enter the backend. The separate customer web
              storefront supports real COD only when connected to a configured backend.
            </p>
            <p>
              No live customer account, purchase or delivery is demonstrated by this static guide.
            </p>
          </>
        ) : (
          <>
            <h3>
              {role === 'brand-a'
                ? 'Mehr Atelier · fictional brand A'
                : 'Gul Studio · fictional brand B'}
            </h3>
            <p>
              Each administrator sees only assigned active brands. Create/edit drafts, set stock,
              publish and manage that brand’s own order lines.
            </p>
            <div className="table-scroll">
              <table>
                <caption>Illustrative catalogue row — not backend inventory</caption>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Example product</th>
                    <th>Example stock</th>
                    <th>Responsibility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{role === 'brand-a' ? 'Mehr Atelier' : 'Gul Studio'}</td>
                    <td>{role === 'brand-a' ? 'Ivory lawn ensemble' : 'Rose kurta'}</td>
                    <td>20 (fictional)</td>
                    <td>Catalogue · stock · fulfillment</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="notice">
              Brand A must be denied access to brand B’s resources. The real backend enforces
              membership and tenant ownership on each request.
            </p>
          </>
        )}
      </section>
      <section className="panel">
        <h2>A five-minute brand conversation</h2>
        <ol>
          <li>Introduce the marketplace and show the offline customer APK (one minute).</li>
          <li>Walk through application, review, invitation and activation (one minute).</li>
          <li>
            Show a brand’s catalogue, stock and assigned orders using this labelled guide, or a
            separately authorized live workspace (two minutes).
          </li>
          <li>
            Explain COD fulfillment, tenant boundaries and the remaining hosting, delivery and
            operational requirements (one minute).
          </li>
        </ol>
        <p>
          For a real demonstration, first provision an isolated environment and have the owner
          supervise privileged account provisioning. Use synthetic brand administrators and
          customers only. Never use production orders for rehearsals.
        </p>
        <Link to="/accept-invitation">Open the real invitation acceptance form</Link>
      </section>
      <footer className="page-footer">
        Brandista · Presentation materials · No live metrics, email delivery, payments or courier
        integration are represented here.
      </footer>
    </main>
  )
}
