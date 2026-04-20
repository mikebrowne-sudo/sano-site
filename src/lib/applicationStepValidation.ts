import type { ApplicationFormData } from '@/types/application'
import { validateApplication } from './applicationValidation'

// Returns the error message for `field` if the full-form validator would flag it, else null.
function fieldError(data: ApplicationFormData, field: keyof ApplicationFormData): string | null {
  const errors = validateApplication(data)
  return errors[field] ?? null
}

export const stepValidators = {
  first_name: (d: ApplicationFormData) => fieldError(d, 'first_name'),
  last_name: (d: ApplicationFormData) => fieldError(d, 'last_name'),
  phone: (d: ApplicationFormData) => fieldError(d, 'phone'),
  email: (d: ApplicationFormData) => fieldError(d, 'email'),
  suburb: (d: ApplicationFormData) => fieldError(d, 'suburb'),
  application_type: (d: ApplicationFormData) => fieldError(d, 'application_type'),
  has_license: (d: ApplicationFormData) => fieldError(d, 'has_license'),
  has_vehicle: (d: ApplicationFormData) => fieldError(d, 'has_vehicle'),
  can_travel: (d: ApplicationFormData) => fieldError(d, 'can_travel'),
  has_experience: (d: ApplicationFormData) => fieldError(d, 'has_experience'),
  experience_types: (d: ApplicationFormData) => fieldError(d, 'experience_types'),
  has_equipment: (d: ApplicationFormData) => fieldError(d, 'has_equipment'),
  independent_work: (d: ApplicationFormData) => fieldError(d, 'independent_work'),
  work_rights_nz: (d: ApplicationFormData) => fieldError(d, 'work_rights_nz'),
  confirm_truth: (d: ApplicationFormData) => fieldError(d, 'confirm_truth'),
} as const

export type StepField = keyof typeof stepValidators
