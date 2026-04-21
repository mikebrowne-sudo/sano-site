import type { ApplicationFormData, ApplicationFormErrors } from '@/types/application'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createEmptyApplicationForm(): ApplicationFormData {
  return {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    suburb: '',
    date_of_birth: null,
    application_type: '',
    has_license: null,
    has_vehicle: null,
    can_travel: null,
    has_experience: null,
    experience_types: [],
    experience_notes: '',
    has_equipment: null,
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    independent_work: null,
    work_rights_nz: null,
    has_insurance: null,
    willing_to_get_insurance: null,
    why_join_sano: '',
    confirm_truth: false,
  }
}

export function validateApplication(data: ApplicationFormData): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {}

  if (!data.first_name.trim()) errors.first_name = 'Your first name is required'
  if (!data.last_name.trim()) errors.last_name = 'Your last name is required'
  if (!data.phone.trim()) errors.phone = 'Phone is required'
  if (!data.email.trim() || !EMAIL_RE.test(data.email.trim())) errors.email = 'A valid email is required'
  if (!data.suburb.trim()) errors.suburb = 'Suburb is required'

  if (data.application_type !== 'contractor' && data.application_type !== 'employee') {
    errors.application_type = 'Please choose one'
  }

  if (data.has_license === null) errors.has_license = 'Please answer yes or no'
  if (data.has_vehicle === null) errors.has_vehicle = 'Please answer yes or no'
  if (data.can_travel === null) errors.can_travel = 'Please answer yes or no'

  if (data.has_experience === null) errors.has_experience = 'Please answer yes or no'
  if (data.has_experience === true && data.experience_types.length === 0) {
    errors.experience_types = 'Select at least one type'
  }

  if (data.has_equipment === null) errors.has_equipment = 'Please answer yes or no'

  if (data.independent_work === null) errors.independent_work = 'Please answer yes or no'
  if (data.work_rights_nz === null) errors.work_rights_nz = 'Please answer yes or no'

  if (!data.confirm_truth) errors.confirm_truth = 'You must confirm before submitting'

  return errors
}
