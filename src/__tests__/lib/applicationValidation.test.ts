import { validateApplication, createEmptyApplicationForm } from '@/lib/applicationValidation'
import type { ApplicationFormData } from '@/types/application'

function valid(): ApplicationFormData {
  return {
    full_name: 'Jane Doe',
    phone: '021 000 0000',
    email: 'jane@example.com',
    suburb: 'Mount Eden',
    application_type: 'contractor',
    has_license: true,
    has_vehicle: true,
    can_travel: true,
    has_experience: true,
    experience_types: ['residential'],
    experience_notes: '',
    has_equipment: true,
    equipment_notes: '',
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    work_preferences: '',
    independent_work: true,
    why_join_sano: '',
    work_rights_nz: true,
    has_insurance: null,
    willing_to_get_insurance: null,
    confirm_truth: true,
  }
}

describe('validateApplication', () => {
  it('returns no errors for a complete valid form', () => {
    expect(validateApplication(valid())).toEqual({})
  })

  it('requires full_name', () => {
    const data = { ...valid(), full_name: '   ' }
    expect(validateApplication(data).full_name).toBeDefined()
  })

  it('requires phone (presence only, no format check)', () => {
    const missing = validateApplication({ ...valid(), phone: '' })
    expect(missing.phone).toBeDefined()
    const anyFormat = validateApplication({ ...valid(), phone: '12345' })
    expect(anyFormat.phone).toBeUndefined()
  })

  it('requires a valid email format', () => {
    expect(validateApplication({ ...valid(), email: '' }).email).toBeDefined()
    expect(validateApplication({ ...valid(), email: 'not-an-email' }).email).toBeDefined()
  })

  it('requires suburb', () => {
    expect(validateApplication({ ...valid(), suburb: '' }).suburb).toBeDefined()
  })

  it('requires application_type', () => {
    expect(validateApplication({ ...valid(), application_type: '' }).application_type).toBeDefined()
  })

  it('requires has_license/has_vehicle/can_travel to be non-null', () => {
    expect(validateApplication({ ...valid(), has_license: null }).has_license).toBeDefined()
    expect(validateApplication({ ...valid(), has_vehicle: null }).has_vehicle).toBeDefined()
    expect(validateApplication({ ...valid(), can_travel: null }).can_travel).toBeDefined()
  })

  it('requires has_experience/has_equipment/independent_work to be non-null', () => {
    expect(validateApplication({ ...valid(), has_experience: null }).has_experience).toBeDefined()
    expect(validateApplication({ ...valid(), has_equipment: null }).has_equipment).toBeDefined()
    expect(validateApplication({ ...valid(), independent_work: null }).independent_work).toBeDefined()
  })

  it('requires work_rights_nz', () => {
    expect(validateApplication({ ...valid(), work_rights_nz: null }).work_rights_nz).toBeDefined()
  })

  it('does NOT require has_insurance or willing_to_get_insurance', () => {
    const errors = validateApplication({ ...valid(), has_insurance: null, willing_to_get_insurance: null })
    expect(errors.has_insurance).toBeUndefined()
    expect(errors.willing_to_get_insurance).toBeUndefined()
  })

  it('requires confirm_truth to be true', () => {
    expect(validateApplication({ ...valid(), confirm_truth: false }).confirm_truth).toBeDefined()
  })

  it('requires at least one experience_type when has_experience is true', () => {
    const errors = validateApplication({ ...valid(), has_experience: true, experience_types: [] })
    expect(errors.experience_types).toBeDefined()
  })

  it('does not require experience_types when has_experience is false', () => {
    const errors = validateApplication({ ...valid(), has_experience: false, experience_types: [] })
    expect(errors.experience_types).toBeUndefined()
  })

  it('createEmptyApplicationForm returns a form that fails validation', () => {
    const empty = createEmptyApplicationForm()
    expect(Object.keys(validateApplication(empty)).length).toBeGreaterThan(0)
  })
})
