// Phase 5.5.12 — Shared types for the Job Setup wizard.
//
// Lives in a plain (no-directive) module so the 'use server' actions
// file and the 'use client' wizard component can both import the
// shared shapes without violating Next.js 14's "use server can only
// export async functions" rule.

import type { ExistingRecordRef } from '@/lib/quote-conversion-guard'

/** Phase quote-flow-clarity: every conversion action that the
 *  duplicate-conversion guard can reject returns this shape. The
 *  optional `existing` ref carries the id + number of the live
 *  downstream record so the UI can render an Open-existing CTA. */
export type ConvertActionError = { error: string; existing?: ExistingRecordRef }

export interface JobSetupInput {
  scheduled_date?: string | null    // ISO date 'YYYY-MM-DD'
  scheduled_time?: string | null    // free text 'HH:MM' or '08:30 AM'
  duration_estimate?: string | null // free text label
  allowed_hours?: number | null
  contractor_id?: string | null
  contractor_price?: number | null  // optional hourly override
  contact_id?: string | null
  site_id?: string | null
  address?: string | null
  access_instructions?: string | null
  internal_notes?: string | null
  // Residential scope hints (carry-through to job)
  occupancy?: string | null
  pets?: string | null
  parking?: string | null
  stairs?: string | null
  condition_level?: string | null
  // Payment exception — required when payment_type='cash_sale' but
  // operator wants the job to proceed without prepayment.
  payment_override?: { allow: boolean; reason?: string | null }
}

export interface ReadyContractor {
  id: string
  full_name: string
  hourly_rate: number | null
  base_hourly_rate: number | null
  status: 'active' | 'pending_onboarding' | 'inactive'
  blocker?: string | null
}
