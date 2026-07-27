import { render, screen } from '@testing-library/react'
import {
  agreementSections,
  agreementTitle,
  CASUAL_AGREEMENT_SECTIONS,
  PERMANENT_AGREEMENT_SECTIONS,
} from '@/lib/employment-agreement-content'
import {
  EmploymentAgreementDocument,
  agreementViewFromRow,
  type AgreementView,
} from '@/components/EmploymentAgreementDocument'

const bodyText = (sections: typeof PERMANENT_AGREEMENT_SECTIONS, titleStartsWith: string) =>
  (sections.find((s) => s.title.startsWith(titleStartsWith))?.body ?? []).join(' ')

describe('employment agreement content — compliance fixes', () => {
  it('permanent title is an Individual Employment Agreement', () => {
    expect(agreementTitle('permanent_employee')).toBe('Individual Employment Agreement')
    expect(agreementSections('permanent_employee')).toBe(PERMANENT_AGREEMENT_SECTIONS)
  })

  describe('personal grievance clause states the 12-month sexual-harassment timeframe', () => {
    it('permanent clause 13.3', () => {
      const t = bodyText(PERMANENT_AGREEMENT_SECTIONS, '13.')
      expect(t).toMatch(/90 days/)
      expect(t).toMatch(/sexual harassment must generally be raised within 12 months/i)
    })
    it('casual clause 12.3 (same defect, fixed too)', () => {
      const t = bodyText(CASUAL_AGREEMENT_SECTIONS, '12.')
      expect(t).toMatch(/90 days/)
      expect(t).toMatch(/sexual harassment must generally be raised within 12 months/i)
    })
  })

  describe('permanent employee protection is a Part 6A cleaning-sector clause', () => {
    const t = bodyText(PERMANENT_AGREEMENT_SECTIONS, '12.')
    it('describes specified-employee transfer rights, not a shortened negotiate clause', () => {
      expect(t).toMatch(/Schedule 1A/)
      expect(t).toMatch(/Part 6A/)
      expect(t).toMatch(/specified employee/i)
      expect(t).toMatch(/elect to transfer/i)
      expect(t).toMatch(/same terms and conditions/i)
    })
    it('drops the old shortened wording', () => {
      expect(t).not.toMatch(/negotiate with the new employer .* where reasonably practicable/i)
      expect(t).not.toMatch(/69OI/)
    })
  })
})

describe('agreementViewFromRow — working pattern in the hours line', () => {
  it('combines weekly total with the concrete days/times pattern', () => {
    const v = agreementViewFromRow({
      agreement_type: 'permanent_employee',
      agreed_hours_per_week: 20,
      agreed_days: 'Monday, Tuesday, Thursday and Friday, normally 9:00 am to 2:00 pm',
    })
    expect(v.agreedHours).toBe('20 hours per week — Monday, Tuesday, Thursday and Friday, normally 9:00 am to 2:00 pm')
  })
})

function view(over: Partial<AgreementView> = {}): AgreementView {
  return {
    type: 'permanent_employee',
    position: 'Cleaner',
    hourlyRate: 30,
    startDate: '2026-07-27',
    agreedHours: '20 hours per week — Mon, Tue, Thu, Fri, 9:00 am to 2:00 pm',
    placeOfWork: 'Home-based',
    payFrequency: 'weekly',
    noticePeriod: '2 weeks',
    employeeFullName: 'Carol Browne',
    employeeAddress: null, employeeEmail: null, employeePhone: null,
    dateOfBirth: null, employeeIrdNumber: null, taxCode: 'M',
    kiwisaverChoice: 'opt_out',
    emergencyName: null, emergencyPhone: null, emergencyRelationship: null,
    contractorTradingName: null, contractorGstNumber: null,
    insurerName: null, insuranceCover: null, insuranceExpiry: null,
    signedName: null, signedAt: null, agreementVersion: 'Permanent Employee 2026',
    issuedAt: '2026-07-27',
    ...over,
  }
}

describe('EmploymentAgreementDocument — details table', () => {
  it('does not show the company GST number', () => {
    render(<EmploymentAgreementDocument a={view()} wrapper="share-page" />)
    expect(screen.queryByText(/GST No\./)).toBeNull()
  })

  it('does not show a Tax code row', () => {
    render(<EmploymentAgreementDocument a={view()} wrapper="share-page" />)
    expect(screen.queryByText('Tax code')).toBeNull()
  })

  it('states auto-enrolment + intention to opt out, never "opted out"', () => {
    render(<EmploymentAgreementDocument a={view({ kiwisaverChoice: 'opt_out' })} wrapper="share-page" />)
    expect(screen.getByText(/Automatically enrolled\. Employee has indicated an intention to opt out/)).toBeInTheDocument()
    expect(screen.queryByText(/opted out/i)).toBeNull()
  })

  it('renders the working pattern in the Hours of work row', () => {
    render(<EmploymentAgreementDocument a={view()} wrapper="share-page" />)
    expect(screen.getByText(/20 hours per week — Mon, Tue, Thu, Fri/)).toBeInTheDocument()
  })
})
