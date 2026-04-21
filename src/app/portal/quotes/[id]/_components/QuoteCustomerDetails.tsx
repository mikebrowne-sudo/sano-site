// src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx

interface QuoteCustomerDetailsProps {
  name: string | null
  phone: string | null
  email: string | null
  serviceAddress: string | null
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

export function QuoteCustomerDetails({ name, phone, email, serviceAddress }: QuoteCustomerDetailsProps) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-5 mb-6">
      <h2 className="text-sm uppercase tracking-wider text-sage-600 font-semibold mb-4">Customer</h2>
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
    </div>
  )
}
