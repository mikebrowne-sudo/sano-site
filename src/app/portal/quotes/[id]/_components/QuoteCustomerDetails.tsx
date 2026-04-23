// src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx

interface QuoteCustomerDetailsProps {
  name: string | null
  phone: string | null
  email: string | null
  serviceAddress: string | null
  // Phase 5D — universal billing fields surfaced on the quote header.
  contactName?: string | null
  contactEmail?: string | null
  accountsEmail?: string | null
  clientReference?: string | null
  requiresPo?: boolean | null
  // To open the underlying client record (the panel is otherwise read-only).
  clientId?: string | null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-sage-500 font-semibold mb-1">{label}</div>
      <div className="text-sm text-sage-800">{children}</div>
    </div>
  )
}

const MUTED_DASH = <span className="text-sage-400">—</span>

export function QuoteCustomerDetails({
  name,
  phone,
  email,
  serviceAddress,
  contactName,
  contactEmail,
  accountsEmail,
  clientReference,
  requiresPo,
  clientId,
}: QuoteCustomerDetailsProps) {
  const hasOverrides =
    !!(contactName || contactEmail || accountsEmail || clientReference || requiresPo)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm uppercase tracking-wider text-sage-600 font-semibold">Customer</h2>
        {clientId && (
          <a
            href={`/portal/clients/${clientId}`}
            className="text-xs text-sage-500 hover:text-sage-700 hover:underline transition-colors"
            title="The client record is shared across all quotes/invoices for this customer. Edits to per-quote contact overrides live in Contact &amp; Billing Details below."
          >
            Edit client record →
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Row label="Name">{name ? name : MUTED_DASH}</Row>
        <Row label="Phone">
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-sage-800 hover:text-sage-500 transition-colors">
              {phone}
            </a>
          ) : (
            MUTED_DASH
          )}
        </Row>
        <Row label="Email">
          {email ? (
            <a href={`mailto:${email}`} className="text-sage-800 hover:text-sage-500 transition-colors break-all">
              {email}
            </a>
          ) : (
            MUTED_DASH
          )}
        </Row>
        <Row label="Service address">{serviceAddress ? serviceAddress : MUTED_DASH}</Row>
      </div>

      {hasOverrides && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {contactName && <Row label="Primary contact">{contactName}</Row>}
          {contactEmail && (
            <Row label="Primary contact email">
              <a href={`mailto:${contactEmail}`} className="text-sage-800 hover:text-sage-500 transition-colors break-all">
                {contactEmail}
              </a>
            </Row>
          )}
          {accountsEmail && (
            <Row label="Accounts email">
              <a href={`mailto:${accountsEmail}`} className="text-sage-800 hover:text-sage-500 transition-colors break-all">
                {accountsEmail}
              </a>
            </Row>
          )}
          {clientReference && <Row label="Client reference / PO">{clientReference}</Row>}
          {requiresPo && (
            <Row label="PO required">
              <span className="text-amber-700 font-medium">Yes — PO needed before invoicing</span>
            </Row>
          )}
        </div>
      )}
    </div>
  )
}
