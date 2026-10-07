// Renders an agreement (casual employment OR independent contractor) using the
// shared Sano document design system (branded sage header + party blocks + dark
// footer, same as quotes/invoices), with the parties/details, the static
// clauses for that type, and — once signed — the signature block. Shared by the
// staff detail view, the print/PDF routes, and the public sign page.

import { QUOTE_INVOICE_CSS } from './document/QuoteInvoiceCss'
import { EMPLOYER, agreementTitle, agreementSections, type AgreementType } from '@/lib/employment-agreement-content'
import { kiwiSaverStatusStatement } from '@/lib/payroll/kiwisaver'
import { schedulePayLine, supplyLabel, type AgreementScheduleBlock } from '@/lib/agreement-schedule-blocks'
import { entityDisplayLines } from '@/lib/contractor-structure-fields'

export interface AgreementView {
  type: AgreementType
  employmentType: string | null
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
  kiwisaverStatus: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  emergencyRelationship: string | null
  contractorTradingName: string | null
  contractorGstNumber: string | null
  contractorBusinessStructure?: string | null
  contractorLegalName?: string | null
  contractorNzbn?: string | null
  contractorCompanyNumber?: string | null
  authorisedSignatoryName?: string | null
  authorisedSignatoryCapacity?: string | null
  authorityConfirmed?: boolean | null
  authorityDeclarationText?: string | null
  authorityConfirmedAt?: string | null
  insurerName: string | null
  insuranceCover: string | null
  insuranceExpiry: string | null
  signedName: string | null
  signedAt: string | null
  agreementVersion: string | null
  issuedAt: string | null
  /** Contractor service schedules presented on this agreement (Schedule A/B/…).
   *  Absent/empty for employees. Display terms only. */
  scheduleBlocks?: AgreementScheduleBlock[]
  /** Explicit staff choice that this contractor agreement has NO service schedule.
   *  When true the document states so plainly instead of showing an agreed rate. */
  noSchedules?: boolean
  /** The effective contractor insurance arrangement driving clause 9. Contractor-
   *  facing fields ONLY (mode + minCover/requiredType) — never insurer, policy
   *  numbers, limits or internal notes. Frozen at send; injected live for drafts. */
  insuranceArrangement?: {
    mode: 'own_required' | 'covered_by_sano' | 'not_required' | 'pending_review'
    minCover?: number | null
    requiredType?: string | null
  } | null
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
    employmentType: a.employment_type ?? null,
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
    kiwisaverStatus: a.kiwisaver_status ?? null,
    emergencyName: a.emergency_contact_name ?? null,
    emergencyPhone: a.emergency_contact_phone ?? null,
    emergencyRelationship: a.emergency_contact_relationship ?? null,
    contractorTradingName: a.contractor_trading_name ?? null,
    contractorGstNumber: a.contractor_gst_number ?? null,
    contractorBusinessStructure: a.contractor_business_structure ?? null,
    contractorLegalName: a.contractor_legal_name ?? null,
    contractorNzbn: a.contractor_nzbn ?? null,
    contractorCompanyNumber: a.contractor_company_number ?? null,
    authorisedSignatoryName: a.authorised_signatory_name ?? null,
    authorisedSignatoryCapacity: a.authorised_signatory_capacity ?? null,
    authorityConfirmed: a.authority_confirmed ?? null,
    authorityDeclarationText: a.authority_declaration_text ?? null,
    authorityConfirmedAt: a.authority_confirmed_at ?? null,
    insurerName: a.insurer_name ?? null,
    insuranceCover: a.insurance_cover ?? null,
    insuranceExpiry: a.insurance_expiry ?? null,
    signedName: a.signed_name ?? null,
    signedAt: a.signed_at ?? null,
    agreementVersion: a.agreement_version ?? null,
    issuedAt: a.created_at ?? null,
    // Frozen snapshot when present (sent/signed); else whatever the caller
    // supplies live. The DB row carries the snapshot as service_schedules_snapshot.
    scheduleBlocks: Array.isArray(a.service_schedules_snapshot)
      ? (a.service_schedules_snapshot as AgreementScheduleBlock[])
      : [],
    noSchedules: !!a.no_service_schedules,
    // Frozen insurance snapshot when present (sent/signed); else null and the
    // caller may inject a live value for a draft. Contractor-safe fields only.
    insuranceArrangement: a.insurance_arrangement_snapshot ?? null,
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// KiwiSaver wording for the agreement. Shows the employee's CURRENT LEGAL STATUS
// only — never a future intention, pending opt-out or form-processing detail
// (those live in onboarding/payroll records). Driven by the status determined at
// signing; falls back to the auto-enrolled statement for legacy signed rows that
// predate the status column (choice was captured but is never an opt-out).
function kiwisaverLine(status: string | null, choice: string | null): string {
  if (status) return kiwiSaverStatusStatement(status)
  if (choice === 'opt_out' || choice === 'stay_in') {
    return 'Automatically enrolled in KiwiSaver. Contributions and deductions apply in accordance with the KiwiSaver Act 2006.'
  }
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
  // Full legal entity identity on the contractor party block (company/trust/
  // partnership). Sole traders show their trading name only, as before.
  if (isContractor) {
    const entityLines = entityDisplayLines({
      structure: a.contractorBusinessStructure,
      legalName: a.contractorLegalName,
      tradingName: a.contractorTradingName,
      companyNumber: a.contractorCompanyNumber,
      nzbn: a.contractorNzbn,
    })
    if (entityLines.length > 0) signerLines.push(...entityLines)
    else if (a.contractorTradingName) signerLines.push(a.contractorTradingName)
  }
  if (a.employeeAddress) signerLines.push(a.employeeAddress)
  if (a.employeeEmail) signerLines.push(a.employeeEmail)
  if (a.employeePhone) signerLines.push(a.employeePhone)

  const emergency = emergencyLine(a)

  // Contractor rate/schedule presentation:
  //  - schedule blocks present → each schedule carries its own terms below; omit
  //    the single "Agreed rate" row (no universal rate implied).
  //  - explicit no-schedule exception → omit the rate row too; a plain statement
  //    below says no schedules are attached (never a misleading universal rate).
  //  - genuine legacy (no blocks, no exception) → keep the legacy agreed-rate row.
  const scheduleBlocks = a.scheduleBlocks ?? []
  const hasSchedules = isContractor && scheduleBlocks.length > 0
  const noSchedulesStated = isContractor && !hasSchedules && !!a.noSchedules
  const insuranceMode = a.insuranceArrangement?.mode ?? null
  // Suppress legacy free-text insurer rows when the recorded arrangement means the
  // contractor doesn't hold their own cover (clause 9 states the real position).
  const insuranceRowsAllowed = insuranceMode == null || insuranceMode === 'own_required'
  const hasOngoingSchedule = scheduleBlocks.some((b) => b.term === 'ongoing')
  const rows: [string, string][] = isContractor
    ? [
        ['Engagement', 'Independent Contractor'],
        ['Commencement date', fmtDate(a.startDate)],
        ...(hasSchedules || noSchedulesStated
          ? []
          : [['Agreed rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour (inclusive of GST)` : '—'] as [string, string]]),
        ['Contractor GST No.', a.contractorGstNumber || '—'],
        // Contractor IRD number is a tax identifier — deliberately NOT shown on
        // the general signed agreement/PDF. It is retained only in the secure
        // structured record (employment_agreements.employee_ird_number + the
        // contractor / tax-declaration record). The signed agreement shows the
        // legal contracting identity, not unnecessary tax identifiers.
        ['Date of birth', fmtDate(a.dateOfBirth)],
        ...(emergency ? [['Emergency contact', emergency] as [string, string]] : []),
        // Legacy free-text insurer/cover rows show ONLY when the contractor holds
        // their own cover (own_required) or no arrangement mode is recorded. When
        // the recorded arrangement is covered_by_sano or not_required, clause 9
        // states the position and these rows are suppressed (no insurer detail).
        ...(insuranceRowsAllowed && a.insurerName ? [['Insurer', a.insurerName] as [string, string]] : []),
        ...(insuranceRowsAllowed && a.insuranceCover ? [['Insurance cover', a.insuranceCover] as [string, string]] : []),
        ...(insuranceRowsAllowed && a.insuranceExpiry ? [['Insurance expiry', fmtDate(a.insuranceExpiry)] as [string, string]] : []),
      ]
    : isPermanent
    ? [
        ['Position', a.position || 'Employee'],
        ['Employment type', a.employmentType === 'full_time' ? 'Permanent full-time' : 'Permanent part-time'],
        ['Commencement date', fmtDate(a.startDate)],
        ['Hours of work', a.agreedHours || '—'],
        ['Place of work', a.placeOfWork || '—'],
        ['Hourly rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour` : '—'],
        ['Pay cycle', cap(a.payFrequency)],
        ['Notice period', a.noticePeriod || '—'],
        ['Annual leave', '4 weeks paid annual holidays (accrued)'],
        ['Sick leave', '10 days per year (after 6 months)'],
        ['Employee IRD No.', a.employeeIrdNumber || '—'],
        ['KiwiSaver', kiwisaverLine(a.kiwisaverStatus, a.kiwisaverChoice)],
        ['Date of birth', fmtDate(a.dateOfBirth)],
        ...(emergency ? [['Emergency contact', emergency] as [string, string]] : []),
      ]
    : [
        ['Position', a.position || 'Cleaner (Casual)'],
        ['Employment type', 'Casual (no guaranteed hours)'],
        ['Commencement date', fmtDate(a.startDate)],
        ...(a.agreedHours ? [['Indicative availability', a.agreedHours] as [string, string]] : []),
        ['Agreed hourly rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour (inclusive of 8% holiday pay)` : '—'],
        ['Employee IRD No.', a.employeeIrdNumber || '—'],
        ['KiwiSaver', kiwisaverLine(a.kiwisaverStatus, a.kiwisaverChoice)],
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

            {/* Service schedules (contractor, when present) — each arrangement
                as its own clearly-labelled block. Display terms only. */}
            {hasSchedules && (
              <section className="mb-7 space-y-4">
                <h2 className="font-semibold text-sage-800 text-[15px]">Service schedules</h2>
                <p className="text-[13px] text-sage-600 leading-relaxed">
                  The following work arrangements apply under this agreement. Each schedule sets its own customer, scope and payment terms.
                </p>
                {scheduleBlocks.map((b) => {
                  const detail: [string, string][] = [
                    ...(b.customer ? [['Customer', b.customer] as [string, string]] : []),
                    ...(b.serviceType ? [['Service', b.serviceType] as [string, string]] : []),
                    ...(b.classification ? [['Type', b.classification === 'commercial' ? 'Commercial' : 'Residential'] as [string, string]] : []),
                    ...(b.serviceAddress ? [['Site', b.serviceAddress] as [string, string]] : []),
                    ...(b.startDate ? [['Start date', fmtDate(b.startDate)] as [string, string]] : []),
                    ...(b.frequency ? [['Frequency', b.frequency] as [string, string]] : []),
                    ...(b.term ? [['Term', b.term === 'ongoing' ? 'Ongoing' : 'Fixed term'] as [string, string]] : []),
                    ['Payment', schedulePayLine(b)],
                    ...(b.additionalWorkApproval ? [['Additional work', b.additionalWorkApproval] as [string, string]] : []),
                    ...(b.closureTreatment ? [['Cancellation / closure', b.closureTreatment] as [string, string]] : []),
                    ...(supplyLabel(b.equipmentArrangement) ? [['Equipment', supplyLabel(b.equipmentArrangement)!] as [string, string]] : []),
                    ...(supplyLabel(b.productArrangement) ? [['Cleaning products', supplyLabel(b.productArrangement)!] as [string, string]] : []),
                    ...(b.equipmentProducts ? [['Equipment & products', b.equipmentProducts] as [string, string]] : []),
                    ...(b.noticePeriod ? [['Notice period', b.noticePeriod] as [string, string]] : []),
                    ...(b.priceReviewDate ? [['Price review', fmtDate(b.priceReviewDate)] as [string, string]] : []),
                  ]
                  return (
                    <div key={b.id} className="rounded-xl border border-sage-100 overflow-hidden">
                      <div className="bg-sage-50 px-4 py-2 border-b border-sage-100">
                        <span className="font-semibold text-sage-800 text-[13px]">{b.label}</span>
                        <span className="text-sage-600 text-[13px]"> — {b.name}</span>
                      </div>
                      <table className="w-full text-[13px]">
                        <tbody>
                          {detail.map(([k, v], i) => (
                            <tr key={i} className="border-b border-sage-50 last:border-0">
                              <td className="py-2 px-4 text-sage-500 w-2/5 align-top">{k}</td>
                              <td className="py-2 px-4 font-medium text-sage-800">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </section>
            )}

            {/* Explicit no-service-schedule statement (contractor). Shown instead
                of a schedules section / rate row so nothing implies a universal rate. */}
            {noSchedulesStated && (
              <section className="mb-7">
                <div className="rounded-xl border border-sage-100 bg-sage-50/50 px-4 py-3">
                  <p className="text-[13px] text-sage-700">No service schedules are attached to this agreement. Work and payment terms will be set out in a separate service schedule before any work is performed.</p>
                </div>
              </section>
            )}

            {/* Clauses */}
            <section className="space-y-5">
              {agreementSections(a.type, {
                hasOngoingSchedule,
                insuranceMode,
                insuranceMinCover: a.insuranceArrangement?.minCover ?? null,
              }).map((s) => (
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

            {/* Signature. For an entity contractor, name the signatory + capacity. */}
            {a.signedName && a.signedAt ? (
              <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">
                  Signed by the {signerLabel}
                  {isContractor && a.contractorLegalName ? ` (${a.contractorLegalName})` : ''}
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  {a.signedName}
                  {isContractor && a.authorisedSignatoryCapacity ? `, ${a.authorisedSignatoryCapacity}` : ''}
                  {' · '}{fmtDate(a.signedAt)}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">Electronically signed — by typing their name the {isContractor && a.authorisedSignatoryName ? 'authorised signatory' : signerLabel} confirmed they had read, understood, and agreed to this Agreement{isContractor && a.contractorLegalName ? ' on behalf of the entity named above' : ''}.</p>
                {/* Frozen authority-to-bind declaration (entities). Shows the exact
                    wording confirmed at signing. Never re-derived — read from the row. */}
                {isContractor && a.authorityConfirmed && a.authorityDeclarationText ? (
                  <p className="text-[11px] text-emerald-700 mt-2 pt-2 border-t border-emerald-200">
                    Authority to bind: “{a.authorityDeclarationText}” — confirmed{a.authorityConfirmedAt ? ` ${fmtDate(a.authorityConfirmedAt)}` : ''}.
                  </p>
                ) : null}
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
