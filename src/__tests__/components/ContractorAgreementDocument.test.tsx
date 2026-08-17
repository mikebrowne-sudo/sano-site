import { render, screen } from '@testing-library/react'
import { EmploymentAgreementDocument, agreementViewFromRow, type AgreementView } from '@/components/EmploymentAgreementDocument'
import type { AgreementScheduleBlock } from '@/lib/agreement-schedule-blocks'

const block = (o: Partial<AgreementScheduleBlock> & { id: string; label: string; name: string }): AgreementScheduleBlock => ({
  versionKey: null, effectiveFrom: null, customer: null, classification: null, serviceType: null,
  serviceAddress: null, startDate: null, frequency: null, term: null, paymentMethod: null,
  paymentBasis: null, rateBasis: null, agreedAmount: null, noticePeriod: null, priceReviewDate: null,
  closureTreatment: null, additionalWorkApproval: null, equipmentProducts: null,
  equipmentArrangement: null, productArrangement: null, ...o,
})

const view = (o: Partial<AgreementView> = {}): AgreementView => ({
  type: 'contractor', employmentType: null, position: null, hourlyRate: 30, startDate: '2026-08-01',
  agreedHours: null, placeOfWork: null, payFrequency: null, noticePeriod: null,
  employeeFullName: 'Myrtle McGoon', employeeAddress: null, employeeEmail: null, employeePhone: null,
  dateOfBirth: null, employeeIrdNumber: null, taxCode: null, kiwisaverChoice: null, kiwisaverStatus: null,
  emergencyName: null, emergencyPhone: null, emergencyRelationship: null,
  contractorTradingName: null, contractorGstNumber: null, contractorBusinessStructure: 'sole_trader',
  contractorLegalName: null, contractorNzbn: null, contractorCompanyNumber: null,
  authorisedSignatoryName: null, authorisedSignatoryCapacity: null, authorityConfirmed: null,
  authorityDeclarationText: null, authorityConfirmedAt: null,
  insurerName: null, insuranceCover: null, insuranceExpiry: null, signedName: null, signedAt: null,
  agreementVersion: null, issuedAt: null, scheduleBlocks: [], noSchedules: false, insuranceArrangement: null, ...o,
})

const PUKEKOHE = block({
  id: 's-a', label: 'Schedule A', name: 'Pukekohe Golf Club commercial cleaning',
  customer: 'Pukekohe Golf Club', classification: 'commercial', term: 'ongoing',
  paymentMethod: 'fixed_monthly', paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500,
  frequency: '3 cleans per week',
})
const RESIDENTIAL = block({
  id: 's-b', label: 'Schedule B', name: 'Residential cleaning',
  classification: 'residential', paymentMethod: 'hourly', rateBasis: 'gst_exclusive', agreedAmount: 30,
})

function text() { return (document.body.textContent ?? '') }

describe('Contractor agreement document — Myrtle-shaped', () => {
  it('renders the linked customer, both schedules, and their correct payment terms', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE, RESIDENTIAL], insuranceArrangement: { mode: 'covered_by_sano' } })} />)
    expect(screen.getByText('Pukekohe Golf Club')).toBeInTheDocument()             // linked customer appears
    expect(screen.getByText('3 cleans per week')).toBeInTheDocument()
    // guaranteed net, GST-exclusive, monthly
    expect(text()).toMatch(/Guaranteed net payment of \$1,500\.00 per month \(GST exclusive\)/)
    // hourly, GST-exclusive
    expect(text()).toMatch(/\$30\.00 per hour \(GST exclusive\)/)
  })

  it('a GST-inclusive schedule renders "(GST inclusive)"', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [block({ id: 'x', label: 'Schedule A', name: 'X', paymentMethod: 'hourly', rateBasis: 'gst_inclusive', agreedAmount: 40 })] })} />)
    expect(text()).toMatch(/\$40\.00 per hour \(GST inclusive\)/)
  })

  it('a non-GST-registered contractor is NOT described as charging GST (clause 5.1 defers)', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE], contractorGstNumber: null })} />)
    const t = text()
    expect(t).not.toMatch(/The agreed rate is inclusive of GST/)
    expect(t).toMatch(/GST is payable only where the Contractor is registered for GST/)
  })

  it('omits the legacy "Agreed rate $X per hour (inclusive of GST)" row when schedules are selected', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ hourlyRate: 30, scheduleBlocks: [RESIDENTIAL] })} />)
    const t = text()
    expect(t).not.toMatch(/Agreed rate/)
    expect(t).not.toMatch(/30\.00 per hour \(inclusive of GST\)/) // no global inclusive-GST row
  })

  it('covered_by_sano renders the covered clause + suppresses own-insurance requirement', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE], insuranceArrangement: { mode: 'covered_by_sano' } })} />)
    const t = text()
    expect(t).toMatch(/included under the Principal’s insurance arrangement/)
    expect(t).not.toMatch(/does not extend to the Contractor/)
    expect(t).not.toMatch(/minimum requirement is/)
  })

  it('own_required renders the own-insurance clause', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [RESIDENTIAL], insuranceArrangement: { mode: 'own_required', minCover: 1000000 } })} />)
    expect(text()).toMatch(/must hold and maintain current public liability insurance/)
  })

  it('not_required renders the neutral clause', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [RESIDENTIAL], insuranceArrangement: { mode: 'not_required' } })} />)
    expect(text()).toMatch(/not currently required/)
  })

  it('ongoing schedule removes the "no guaranteed or regular work" contradiction in the document', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE] })} />)
    expect(text()).not.toMatch(/no guaranteed or regular work/)
    expect(text()).toMatch(/set out in the service schedules attached/)
  })

  it('does not expose insurer / policy / limit anywhere in the rendered agreement', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE], insuranceArrangement: { mode: 'covered_by_sano' }, insurerName: 'SHOULD-NOT-SHOW', insuranceCover: 'SECRET-LIMIT' })} />)
    const t = text()
    expect(t).not.toContain('SHOULD-NOT-SHOW')   // legacy insurer row suppressed for covered_by_sano
    expect(t).not.toContain('SECRET-LIMIT')
  })

  it('renders the equipment + cleaning-product arrangement per schedule (labelled)', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [
      block({ id: 'e', label: 'Schedule A', name: 'Pukekohe', paymentMethod: 'fixed_monthly', paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500,
        equipmentArrangement: 'contractor_supplied', productArrangement: 'sano_supplied' }),
    ] })} />)
    const t = text()
    expect(t).toMatch(/Equipment/)
    expect(t).toContain('Contractor supplied')  // equipment
    expect(t).toContain('Sano supplied')        // products
    expect(t).toMatch(/Cleaning products/)
  })

  it('omits equipment/product rows when not stated on the schedule', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [RESIDENTIAL] })} />)
    // RESIDENTIAL leaves both arrangements null → no supplied-by rows.
    expect(text()).not.toContain('Contractor supplied')
  })

  it('clause 6.1 defers to the schedule (does not assume the contractor supplies everything)', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE] })} />)
    expect(text()).toMatch(/stated in the applicable service schedule or job confirmation/)
    expect(text()).not.toMatch(/the Contractor will supply, at their own cost, the equipment/)
  })

  it('clause 17.2 uses the covered_by_sano wording (no "the Contractor’s insurance")', () => {
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={view({ scheduleBlocks: [PUKEKOHE], insuranceArrangement: { mode: 'covered_by_sano' } })} />)
    const t = text()
    expect(t).toMatch(/loss covered under the applicable insurance arrangement/)
    expect(t).not.toMatch(/amount recoverable under the Contractor’s insurance/)
  })

  it('clause 17.2 from a FROZEN snapshot uses the frozen mode — a later insurance change cannot alter it', () => {
    // A sent agreement froze covered_by_sano; even if the contractor's live setup
    // later flips to own_required, the frozen snapshot drives the clause.
    const frozen = agreementViewFromRow({
      agreement_type: 'contractor', start_date: '2026-08-01', hourly_rate: null,
      service_schedules_snapshot: [RESIDENTIAL],
      insurance_arrangement_snapshot: { mode: 'covered_by_sano' },
    })
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={frozen} />)
    expect(text()).toMatch(/loss covered under the applicable insurance arrangement/)
    expect(text()).not.toMatch(/amount recoverable under the Contractor’s insurance/)
  })

  it('renders the linked customer from a FROZEN snapshot (agreementViewFromRow path)', () => {
    // Simulate a sent/frozen agreement: the row carries service_schedules_snapshot.
    const frozen = agreementViewFromRow({
      agreement_type: 'contractor', start_date: '2026-08-01', hourly_rate: null,
      service_schedules_snapshot: [PUKEKOHE],
      insurance_arrangement_snapshot: { mode: 'covered_by_sano' },
    })
    render(<EmploymentAgreementDocument wrapper="print-overlay" a={frozen} />)
    expect(screen.getByText('Pukekohe Golf Club')).toBeInTheDocument()
    // frozen insurance drives clause 9 too
    expect(text()).toMatch(/included under the Principal’s insurance arrangement/)
  })
})
