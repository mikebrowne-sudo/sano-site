// Contractor experience level — the ONLY values the contractors table accepts
// (contractors_experience_level_check). Shared by the competency sign-off and
// any other form that writes experience_level, so the UI can never offer a
// value the database will reject.

export const EXPERIENCE_LEVELS = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'experienced', label: 'Experienced' },
  { value: 'lead', label: 'Lead' },
] as const

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value']

const VALID = new Set<string>(EXPERIENCE_LEVELS.map((l) => l.value))

/**
 * Normalise a submitted experience level. Blank → null (allowed). A known
 * value in any case / with stray spaces → the canonical lowercase value.
 * Anything else → 'invalid' so the caller can return a friendly error rather
 * than a raw check-constraint failure.
 */
export function normaliseExperienceLevel(input: string | null | undefined): ExperienceLevel | null | 'invalid' {
  const v = (input ?? '').trim().toLowerCase()
  if (!v) return null
  return VALID.has(v) ? (v as ExperienceLevel) : 'invalid'
}
