// Phase 4C — Jobs list page config. See types.ts for shape rules.
//
// Edit this file to add / reorder / hide tabs or actions without
// touching jobs/page.tsx. Per-user column visibility + default sort
// still come from /portal/settings/display via portal-display-settings.

import { CalendarDays, Plus } from 'lucide-react'
import type { ListPageConfig, ListPageTabConfig } from './types'

export type JobTab =
  | 'needs_attention'
  | 'needs_scheduling'
  | 'scheduled'
  | 'in_progress'
  | 'completed'

export const JOB_TABS: readonly ListPageTabConfig<JobTab>[] = [
  { value: 'needs_attention',  label: 'Needs attention' },
  { value: 'needs_scheduling', label: 'Needs scheduling' },
  { value: 'scheduled',        label: 'Scheduled' },
  { value: 'in_progress',      label: 'In progress' },
  { value: 'completed',        label: 'Completed' },
]

export const JOBS_LIST_CONFIG: ListPageConfig<JobTab> = {
  entity: 'jobs',
  pageTitle: 'Jobs',
  actions: [
    { label: 'Calendar', href: '/portal/jobs/calendar', variant: 'secondary', icon: CalendarDays },
    { label: 'New Job',  href: '/portal/jobs/new',      variant: 'primary',   icon: Plus },
  ],
  tabs: JOB_TABS,
  defaultTab: 'needs_attention',
  searchPlaceholder: 'Search jobs…',
  rowsPerPage: 100,
}
