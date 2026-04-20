// src/types/application.ts

export type ApplicationType = 'contractor' | 'casual' | 'either'

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
  full_name: string
  phone: string
  email: string
  suburb: string

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
  equipment_notes: string

  // Availability
  available_days: DayOfWeek[]
  preferred_hours: string
  travel_areas: string

  // Additional questions
  work_preferences: string
  independent_work: boolean | null
  why_join_sano: string

  // Compliance
  work_rights_nz: boolean | null
  has_insurance: boolean | null
  willing_to_get_insurance: boolean | null

  // Declaration
  confirm_truth: boolean
}

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormData, string>>

export type JobApplicationPayload = ApplicationFormData
