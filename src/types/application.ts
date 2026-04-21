// src/types/application.ts

export type ApplicationType = 'contractor' | 'employee'

export type ExperienceType =
  | 'residential'
  | 'deep'
  | 'end_of_tenancy'
  | 'commercial'
  | 'carpet_upholstery'
  | 'windows'
  | 'post_construction'
  | 'other'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface ApplicationFormData {
  // Personal details
  first_name: string
  last_name: string
  phone: string
  email: string
  suburb: string
  date_of_birth: string | null   // ISO YYYY-MM-DD; null if skipped

  // Role type
  application_type: ApplicationType | ''

  // Licence & transport
  has_license: boolean | null
  has_vehicle: boolean | null
  can_travel: boolean | null

  // Experience
  has_experience: boolean | null
  experience_types: ExperienceType[]
  experience_notes: string

  // Equipment
  has_equipment: boolean | null

  // Availability
  available_days: DayOfWeek[]
  preferred_hours: string
  travel_areas: string

  // Independent work + compliance
  independent_work: boolean | null
  work_rights_nz: boolean | null
  has_insurance: boolean | null
  willing_to_get_insurance: boolean | null

  // Motivation (optional)
  why_join_sano: string

  // Declaration
  confirm_truth: boolean
}

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormData, string>>
export type JobApplicationPayload = ApplicationFormData
