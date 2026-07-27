// Renders an agreement (casual employment OR independent contractor) using the
// shared Sano document design system (branded sage header + party blocks + dark
// footer, same as quotes/invoices), with the parties/details, the static
// clauses for that type, and — once signed — the signature block. Shared by the
// staff detail view, the print/PDF routes, and the public sign page.

import { QUOTE_INVOICE_CSS } from './document/QuoteInvoiceCss'
import { EMPLOYER, agreementTitle, agreementSections, type AgreementType } from '@/lib/employment-agreement-content'

export interface AgreementView {
  type: AgreementType
  position: string | null
  hourlyRate: number | null
  startDate: string | null
  agreedHours: string | null
  placeOfWork: string | null
  payFrequency: string | null
  noticePeriod: string | null
  employeeFullName: string | null
  employeeAddress: string | null
  employeeEmail: string | null
  employeePhone: string | null
  dateOfBirth: string | null
  employeeIrdNumber: string | null
  taxCode: string | null
  kiwisaverChoice: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  emergencyRelationship: string | null
  contractorTradingName: string | null
  contractorGstNumber: string | null
  insurerName: string | null
  insuranceCover: string | null
  insuranceExpiry: string | null
  signedName: string | null
  signedAt: string | null
  agreementVersion: string | null
  issuedAt: string | null
}

/** Map an employment_agreements DB row to the document view. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function agreementViewFromRow(a: any): AgreementView {
  // Hours line combines the weekly total with the concrete working pattern
  // (days + approximate start/finish times + any flexibility) captured in
  // agreed_days, so the actual pattern appears in the agreement, not just a total.
  const hrs = a.agreed_hours_per_week != null ? Number(a.agreed_hours_per_week) : null
  const agreedHours = hrs != null
    ? `${hrs} hours per week${a.agreed_days ? ` — ${a.agreed_days}` : ''}`
    : (a.agreed_days ?? null)
  return {
    type: a.agreement_type === 'contractor'
      ? 'contractor'
      : a.agreement_type === 'permanent_employee'
        ? 'permanent_employee'
        : 'casual_employee',
    position: a.position ?? null,
    hourlyRate: a.hourly_rate ?? null,
    startDate: a.start_date ?? null,
    agreedHours,
    placeOfWork: a.place_of_work ?? null,
    payFrequency: a.pay_frequency ?? null,
    noticePeriod: a.notice_period ?? null,
    employeeFullName: a.employee_full_name ?? null,
    employeeAddress: a.employee_address ?? null,
    employeeEmail: a.employee_email ?? null,
    employeePhone: a.employee_phone ?? null,
    dateOfBirth: a.date_of_birth ?? null,
    employeeIrdNumber: a.employee_ird_number ?? null,
    taxCode: a.tax_code ?? null,
    kiwisaverChoice: a.kiwisaver_choice ?? null,
    emergencyName: a.emergency_contact_name ?? null,
    emergencyPhone: a.emergency_contact_phone ?? null,
    emergencyRelationship: a.emergency_contact_relationship ?? null,
    contractorTradingName: a.contractor_trading_name ?? null,
    contractorGstNumber: a.contractor_gst_number ?? null,
    insurerName: a.insurer_name ?? null,
    insuranceCover: a.insurance_cover ?? null,
    insuranceExpiry: a.insurance_expiry ?? null,
    signedName: a.signed_name ?? null,
    signedAt: a.signed_at ?? null,
    agreementVersion: a.agreement_version ?? null,
    issuedAt: a.created_at ?? null,
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// KiwiSaver wording for the agreement. A newly auto-enrolled employee cannot
// formally opt out until day 14 and must generally do so by day 56 (KS10), so a
// stated intention to opt out is described as exactly that — the agreement never
// records the employee as already "opted out".
function kiwisaverLine(choice: string | null): string {
  if (choice === 'opt_out') return 'Automatically enrolled. Employee has indicated an intention to opt out during the statutory opt-out period (KS10, between day 14 and day 56).'
  if (choice === 'stay_in') return 'Automatically enrolled and contributing.'
  return '—'
}

function emergencyLine(a: AgreementView): string | null {
  if (!a.emergencyName && !a.emergencyPhone) return null
  const rel = a.emergencyRelationship ? ` (${a.emergencyRelationship})` : ''
  const phone = a.emergencyPhone ? ` · ${a.emergencyPhone}` : ''
  return `${a.emergencyName ?? ''}${rel}${phone}`.trim()
}

export function EmploymentAgreementDocument({
  a,
  wrapper = 'print-overlay',
}: {
  a: AgreementView
  /** 'share-page' = on-screen centred card; 'print-overlay' = PDF/print. */
  wrapper?: 'share-page' | 'print-overlay'
}) {
  const isContractor = a.type === 'contractor'
  const isPermanent = a.type === 'permanent_employee'
  const signerLabel = isContractor ? 'Contractor' : 'Employee'
  const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

  // Party detail lines (name is separate). GST number is a payroll/company
  // record, not a contractual term — it is deliberately not shown on the agreement.
  const employerLines = [EMPLOYER.address]
  const signerLines: string[] = []
  if (isContractor && a.contractorTradingName) signerLines.push(a.contractorTradingName)
  if (a.employeeAddress) signerLines.push(a.employeeAddress)
  if (a.employeeEmail) signerLines.push(a.employeeEmail)
  if (a.employeePhone) signerLines.push(a.employeePhone)

  const emergency = emergencyLine(a)

  const rows: [string, string][] = isContractor
    ? [
        ['Engagement', 'Independent Contractor'],
        ['Commencement date', fmtDate(a.startDate)],
        ['Agreed rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour (inclusive of GST)` : '—'],
        ['Contractor GST No.', a.contractorGstNumber || '—'],
        ['Contractor IRD No.', a.employeeIrdNumber || '—'],
        ['Date of birth', fmtDate(a.dateOfBirth)],
        ...(emergency ? [['Emergency contact', emergency] as [string, string]] : []),
        ...(a.insurerName ? [['Insurer', a.insurerName] as [string, string]] : []),
        ...(a.insuranceCover ? [['Insurance cover', a.insuranceCover] as [string, string]] : []),
        ...(a.insuranceExpiry ? [['Insurance expiry', fmtDate(a.insuranceExpiry)] as [string, string]] : []),
      ]
    : isPermanent
    ? [
        ['Position', a.position || 'Employee'],
        ['Employment type', 'Permanent part-time'],
        ['Commencement date', fmtDate(a.startDate)],
        ['Hours of work', a.agreedHours || '—'],
        ['Place of work', a.placeOfWork || '—'],
        ['Hourly rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour` : '—'],
        ['Pay cycle', cap(a.payFrequency)],
        ['Notice period', a.noticePeriod || '—'],
        ['Annual leave', '4 weeks paid annual holidays (accrued)'],
        ['Sick leave', '10 days per year (after 6 months)'],
        ['Employee IRD No.', a.employeeIrdNumber || '—'],
        ['KiwiSaver', kiwisaverLine(a.kiwisaverChoice)],
        ['Date of birth', fmtDate(a.dateOfBirth)],
        ...(emergency ? [['Emergency contact', emergency] as [string, string]] : []),
      ]
    : [
        ['Position', a.position || 'Cleaner (Casual)'],
        ['Commencement date', fmtDate(a.startDate)],
        ['Agreed hourly rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour (inclusive of 8% holiday pay)` : '—'],
        ['Employee IRD No.', a.employeeIrdNumber || '—'],
        ['KiwiSaver', kiwisaverLine(a.kiwisaverChoice)],
        ['Date of birth', fmtDate(a.dateOfBirth)],
        ...(emergency ? [['Emergency contact', emergency] as [string, string]] : []),
      ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QUOTE_INVOICE_CSS }} />
      {/* Print-only page numbers (agreement PDF). Reserves a small bottom
          margin and renders "Page x of y" bottom-right. Screen view unaffected. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          margin: 0 0 12mm 0;
          @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 8pt;
            color: #9AA39E;
            padding: 5mm 14mm 0 0;
          }
        }
      ` }} />
      {wrapper === 'print-overlay' && (
        <style dangerouslySetInnerHTML={{ __html: `@media print { .doc { box-shadow: none; } }` }} />
      )}
      <div className={wrapper}>
        <article className="doc" aria-label="Agreement">
          {/* Branded header */}
          <header className="doc-header">
            <div className="doc-header-row">
              <div className="doc-logo-lockup">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="doc-logo-img" src="/brand/sano-full-white.png" alt="Sano — Cleaning, done properly" />
              </div>
              <div className="doc-identity">
                <div className="doc-eyebrow">{agreementTitle(a.type)}</div>
                <h1 className="doc-type">{isContractor ? 'Contractor' : 'Employment'}<span className="dot">.</span></h1>
                <dl className="doc-meta-grid">
                  <dt>Status</dt>
                  <dd>{a.signedAt ? 'Signed' : 'Draft'}</dd>
                  {a.agreementVersion && (<><dt>Version</dt><dd>{a.agreementVersion}</dd></>)}
                  <dt>Issued</dt>
                  <dd>{fmtDate(a.issuedAt)}</dd>
                  {a.signedAt && (<><dt>Signed</dt><dd>{fmtDate(a.signedAt)}</dd></>)}
                  <dt>Commences</dt>
                  <dd>{fmtDate(a.startDate)}</dd>
                </dl>
              </div>
            </div>
          </header>

          <div className="doc-body">
            {/* Parties */}
            <section className="doc-parties">
              <div>
                <div className="doc-party-eyebrow">{isContractor ? 'Principal' : 'Employer'}</div>
                <div className="doc-party-name">{EMPLOYER.name}</div>
                <div className="doc-party-detail">{employerLines.join('\n')}</div>
              </div>
              <div>
                <div className="doc-party-eyebrow">{signerLabel}</div>
                <div className="doc-party-name">{a.employeeFullName || '—'}</div>
                {signerLines.length > 0 && <div className="doc-party-detail">{signerLines.join('\n')}</div>}
              </div>
            </section>

            {/* Details */}
            <section className="mt-2 mb-7">
              <div className="rounded-xl border border-sage-100 overflow-hidden">
                <table className="w-full text-[13px]">
                  <tbody>
                    {rows.map(([k, v], i) => (
                      <tr key={i} className="border-b border-sage-50 last:border-0">
                        <td className="py-2 px-4 text-sage-500 w-2/5 align-top">{k}</td>
                        <td className="py-2 px-4 font-medium text-sage-800">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Clauses */}
            <section className="space-y-5">
              {agreementSections(a.type).map((s) => (
                <div key={s.title}>
                  <h2 className="font-semibold text-sage-800 mb-1.5 text-[15px]">{s.title}</h2>
                  <div className="space-y-1.5">
                    {s.body.map((p, i) => (
                      <p key={i} className="text-[13px] leading-relaxed text-sage-700">{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Signature */}
            {a.signedName && a.signedAt ? (
              <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Signed by the {signerLabel}</p>
                <p className="text-sm text-emerald-700 mt-1">{a.signedName} · {fmtDate(a.signedAt)}</p>
                <p className="text-[11px] text-emerald-600 mt-1">Electronically signed — by typing their name the {signerLabel} confirmed they had read, understood, and agreed to this Agreement.</p>
              </div>
            ) : null}
          </div>

          {/* Dark footer */}
          <footer className="doc-footer">
            <div className="doc-footer-contacts">
              <span className="doc-footer-item"><span>hello@sano.nz</span></span>
              <span className="doc-footer-item"><span>0800 726 686</span></span>
              <span className="doc-footer-item"><span>sano.nz</span></span>
            </div>
            <div className="doc-footer-thanks">Cleaning, done properly.</div>
          </footer>
        </article>
      </div>
    </>
  )
}
