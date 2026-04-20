import type { ApplicationFormData } from '@/types/application'

export type StepDef =
  | { id: string; type: 'welcome' }
  | { id: string; type: 'info'; title?: string | ((d: ApplicationFormData) => string); body: string | ((d: ApplicationFormData) => string); visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'text'; field: 'first_name' | 'last_name' | 'phone' | 'email' | 'suburb' | 'preferred_hours' | 'travel_areas'; question: string; inputType?: 'text' | 'tel' | 'email'; placeholder?: string; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'textarea'; field: 'experience_notes' | 'why_join_sano'; question: string; placeholder?: string; helper?: string; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'yesno'; field: 'has_license' | 'has_vehicle' | 'can_travel' | 'has_experience' | 'has_equipment' | 'independent_work' | 'work_rights_nz' | 'has_insurance' | 'willing_to_get_insurance'; question: string | ((d: ApplicationFormData) => string); required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-single'; field: 'application_type'; question: string; options: { value: string; label: string }[]; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-multi'; field: 'experience_types' | 'available_days'; question: string; helper?: string; options: { value: string; label: string }[]; minSelected?: number; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'declaration'; field: 'confirm_truth'; body: string }
  | { id: string; type: 'review' }
  | { id: string; type: 'success' }

const EXPERIENCE_OPTIONS = [
  { value: 'residential', label: 'Residential cleaning' },
  { value: 'deep', label: 'Deep cleaning' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'carpet_upholstery', label: 'Carpet & upholstery' },
  { value: 'windows', label: 'Window cleaning' },
  { value: 'post_construction', label: 'Post-construction' },
  { value: 'other', label: 'Other' },
]

const DAY_OPTIONS = [
  { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' }, { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const APPLICATION_TYPE_OPTIONS = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'employee', label: 'Employee' },
]

export const STEPS: StepDef[] = [
  { id: 'welcome', type: 'welcome' },

  { id: 'first_name', type: 'text', field: 'first_name', question: "What's your first name?", required: true },
  { id: 'last_name', type: 'text', field: 'last_name', question: 'And your surname?', required: true },

  { id: 'hello', type: 'info',
    title: (d) => `Nice to meet you, ${d.first_name.trim() || 'there'}.`,
    body: 'Next, a few quick questions to understand how you prefer to work.',
  },

  { id: 'phone', type: 'text', field: 'phone', inputType: 'tel', question: "What's the best number to reach you on?", required: true },
  { id: 'email', type: 'text', field: 'email', inputType: 'email', question: 'What email should we use to contact you?', required: true },
  { id: 'suburb', type: 'text', field: 'suburb', question: 'Which area are you based in?', required: true },

  { id: 'application_type', type: 'chip-single', field: 'application_type',
    question: 'What type of role are you interested in?',
    options: APPLICATION_TYPE_OPTIONS, required: true,
  },

  { id: 'fit_intro', type: 'info',
    body: 'A few quick yes/no questions next to understand how you like to work.',
  },

  { id: 'has_license', type: 'yesno', field: 'has_license', question: 'Do you hold a current driver licence?', required: true },
  { id: 'has_vehicle', type: 'yesno', field: 'has_vehicle', question: 'Do you have access to a vehicle for getting to jobs?', required: true },
  { id: 'can_travel', type: 'yesno', field: 'can_travel', question: 'Are you comfortable travelling to different job locations?', required: true },

  { id: 'has_experience', type: 'yesno', field: 'has_experience', question: 'Have you worked in cleaning before?', required: true },

  { id: 'experience_types', type: 'chip-multi', field: 'experience_types',
    question: 'What type of cleaning experience do you have?',
    helper: 'Select all that apply.',
    options: EXPERIENCE_OPTIONS, minSelected: 1,
    visible: (d) => d.has_experience === true,
  },
  { id: 'experience_notes', type: 'textarea', field: 'experience_notes',
    question: 'Tell us a bit about your experience (optional).',
  },

  { id: 'values', type: 'info',
    body: 'We\u2019re looking for people who are reliable, detail-focused, and take pride in their work.',
  },

  { id: 'has_equipment', type: 'yesno', field: 'has_equipment',
    question: (d) =>
      d.application_type === 'contractor'
        ? 'Do you have your own cleaning equipment and products?'
        : 'Do you currently have cleaning equipment and products of your own?',
    required: true,
  },

  { id: 'available_days', type: 'chip-multi', field: 'available_days',
    question: 'What days are you generally available? (optional)',
    helper: 'Select all that apply.',
    options: DAY_OPTIONS,
  },
  { id: 'preferred_hours', type: 'text', field: 'preferred_hours',
    question: 'What hours usually work best for you?',
    placeholder: 'e.g. mornings, school hours',
  },
  { id: 'travel_areas', type: 'text', field: 'travel_areas',
    question: 'What areas are you happy to work in?',
    placeholder: 'e.g. Central, North Shore, Eastern suburbs',
  },

  { id: 'independent_work', type: 'yesno', field: 'independent_work', question: 'Are you comfortable working independently when needed?', required: true },
  { id: 'work_rights_nz', type: 'yesno', field: 'work_rights_nz', question: 'Do you have the legal right to work in New Zealand?', required: true },

  { id: 'has_insurance', type: 'yesno', field: 'has_insurance',
    question: 'Do you currently have public liability insurance?',
    visible: (d) => d.application_type === 'contractor',
  },
  { id: 'willing_to_get_insurance', type: 'yesno', field: 'willing_to_get_insurance',
    question: 'If required, would you be willing to arrange public liability insurance?',
    visible: (d) => d.application_type === 'contractor' && d.has_insurance === false,
  },

  { id: 'why_join_sano', type: 'textarea', field: 'why_join_sano',
    question: 'Why are you interested in working with Sano? (optional).',
  },

  { id: 'declaration', type: 'declaration', field: 'confirm_truth',
    body: 'Please confirm the information you\u2019ve provided is accurate.',
  },

  { id: 'review', type: 'review' },
  { id: 'success', type: 'success' },
]
