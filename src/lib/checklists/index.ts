/**
 * Sano Cleaning Standards — checklist index.
 *
 * One entry per Sano Cleaning Standard. Add new standards here only after
 * adding a matching `ChecklistSlug` member in src/types/checklist.ts.
 */

import type { Checklist, ChecklistSlug } from '@/types/checklist'
import { SANO_100_POINT_HOME_CLEAN } from './sano-100-point-home-clean'
import { SANO_DEEP_CLEAN_DETAIL } from './sano-deep-clean-detail'
import { SANO_125_POINT_PROPERTY_RESET } from './sano-125-point-property-reset'

export {
  SANO_100_POINT_HOME_CLEAN,
  SANO_DEEP_CLEAN_DETAIL,
  SANO_125_POINT_PROPERTY_RESET,
}

export const SANO_CLEANING_STANDARDS: readonly Checklist[] = [
  SANO_100_POINT_HOME_CLEAN,
  SANO_DEEP_CLEAN_DETAIL,
  SANO_125_POINT_PROPERTY_RESET,
] as const

export function getChecklistBySlug(slug: ChecklistSlug): Checklist | undefined {
  return SANO_CLEANING_STANDARDS.find((c) => c.slug === slug)
}
