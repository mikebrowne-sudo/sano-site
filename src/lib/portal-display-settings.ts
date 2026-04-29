// Phase 2 — Portal display settings: single source of truth.
//
// Pure module. No DB access here beyond the small loader at the bottom
// (which is a thin Supabase select). Server actions live in
// src/app/portal/settings/display/_actions.ts.
//
// Design:
//  • Allowed-field registry per entity (jobs, quotes) — fields not in
//    the registry are silently dropped on read AND rejected on write.
//  • DEFAULT_DISPLAY_SETTINGS is the canonical fallback. The loader
//    deep-merges stored JSON over defaults, then validates field
//    references so a removed-from-registry field never lifts back in.
//  • The merge always produces a fully-populated, type-safe shape.
//    Consumers (jobs/quotes pages) never need to handle "missing".

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Allowed-field registry ────────────────────────────────────────

export interface FieldDef {
  key: string
  label: string
  /** Whether the field is exposed in list view, detail view, or both. */
  contexts: ReadonlyArray<'list' | 'detail'>
  /** Whether the field can be used as a sort key in v1. */
  sortable?: boolean
  /** Whether the field can be used as a group-by key in v1. */
  groupable?: boolean
}

export const JOB_FIELDS: readonly FieldDef[] = [
  { key: 'job_number',     label: 'Job #',       contexts: ['list', 'detail'], sortable: true,  groupable: false },
  { key: 'title',          label: 'Title',       contexts: ['list', 'detail'] },
  { key: 'client',         label: 'Client',      contexts: ['list', 'detail'], groupable: true },
  { key: 'company',        label: 'Company',     contexts: ['list', 'detail'], groupable: true },
  { key: 'address',        label: 'Address',     contexts: ['list', 'detail'] },
  { key: 'assigned_to',    label: 'Contractor',  contexts: ['list', 'detail'], groupable: true },
  { key: 'status',         label: 'Status',      contexts: ['list', 'detail'], sortable: true,  groupable: true },
  { key: 'scheduled_date', label: 'Scheduled',   contexts: ['list', 'detail'], sortable: true,  groupable: true },
] as const

export const QUOTE_FIELDS: readonly FieldDef[] = [
  { key: 'quote_number',     label: 'Quote #',          contexts: ['list', 'detail'], sortable: true },
  { key: 'client',           label: 'Client',           contexts: ['list', 'detail'], groupable: true },
  { key: 'company',          label: 'Company',          contexts: ['list', 'detail'], groupable: true },
  { key: 'address',          label: 'Address',          contexts: ['list', 'detail'] },
  { key: 'status',           label: 'Status',           contexts: ['list', 'detail'], sortable: true,  groupable: true },
  { key: 'total',            label: 'Total',            contexts: ['list', 'detail'], sortable: true },
  { key: 'date_issued',      label: 'Issued',           contexts: ['list', 'detail'], sortable: true,  groupable: false },
  { key: 'valid_until',      label: 'Valid until',      contexts: ['list', 'detail'], sortable: true },
  { key: 'created_at',       label: 'Created',          contexts: ['list', 'detail'], sortable: true },
  { key: 'client_reference', label: 'Client reference', contexts: ['list', 'detail'] },
  // Phase list-view-uxp-1: linked-record columns. Not sortable
  // because they live on a different table; not groupable for the
  // same reason. The page's cell() helper renders the chip / Create
  // CTA / muted "Not ready" label depending on data + eligibility.
  { key: 'linked_job',       label: 'Linked job',       contexts: ['list'] },
  { key: 'linked_invoice',   label: 'Linked invoice',   contexts: ['list'] },
] as const

// Phase list-view-uxp-1: invoices field registry. Mirrors the shape
// of QUOTE_FIELDS / JOB_FIELDS. Extending DisplaySettings additively
// — existing portal_settings rows that don't hold an `invoices` key
// fall through mergeEntity to the DEFAULT below.
export const INVOICE_FIELDS: readonly FieldDef[] = [
  { key: 'invoice_number',   label: 'Invoice #',        contexts: ['list', 'detail'], sortable: true },
  { key: 'client',           label: 'Client',           contexts: ['list', 'detail'], groupable: true },
  { key: 'company',          label: 'Company',          contexts: ['list', 'detail'], groupable: true },
  { key: 'address',          label: 'Address',          contexts: ['list', 'detail'] },
  { key: 'status',           label: 'Status',           contexts: ['list', 'detail'], sortable: true,  groupable: true },
  { key: 'total',            label: 'Total',            contexts: ['list', 'detail'], sortable: true },
  { key: 'date_issued',      label: 'Issued',           contexts: ['list', 'detail'], sortable: true },
  { key: 'due_date',         label: 'Due',              contexts: ['list', 'detail'], sortable: true },
  { key: 'created_at',       label: 'Created',          contexts: ['list', 'detail'], sortable: true },
  { key: 'linked_quote',     label: 'Linked quote',     contexts: ['list'] },
  { key: 'linked_job',       label: 'Linked job',       contexts: ['list'] },
] as const

// Set lookups for fast validation
const JOB_FIELD_KEYS     = new Set(JOB_FIELDS.map((f) => f.key))
const QUOTE_FIELD_KEYS   = new Set(QUOTE_FIELDS.map((f) => f.key))
const INVOICE_FIELD_KEYS = new Set(INVOICE_FIELDS.map((f) => f.key))

function fieldsForContext(defs: readonly FieldDef[], ctx: 'list' | 'detail'): string[] {
  return defs.filter((f) => f.contexts.includes(ctx)).map((f) => f.key)
}

function sortableKeys(defs: readonly FieldDef[]): Set<string> {
  return new Set(defs.filter((f) => f.sortable).map((f) => f.key))
}

function groupableKeys(defs: readonly FieldDef[]): Set<string> {
  return new Set(defs.filter((f) => f.groupable).map((f) => f.key))
}

// ── Settings shape ────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface ListDisplay {
  visibleFields: string[]
  primaryField: string
  secondaryField: string
  sortBy: string
  sortDirection: SortDirection
  groupBy: string  // 'none' or a groupable field key
}

export interface DetailDisplay {
  visibleFields: string[]
}

export interface EntityDisplay {
  list: ListDisplay
  detail: DetailDisplay
}

export interface DisplaySettings {
  jobs: EntityDisplay
  quotes: EntityDisplay
  invoices: EntityDisplay
}

// ── Defaults ──────────────────────────────────────────────────────

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  jobs: {
    list: {
      visibleFields: ['job_number', 'title', 'address', 'assigned_to', 'status', 'scheduled_date'],
      primaryField: 'job_number',
      secondaryField: 'title',
      sortBy: 'scheduled_date',
      sortDirection: 'asc',
      groupBy: 'none',
    },
    detail: {
      visibleFields: ['job_number', 'title', 'client', 'address', 'assigned_to', 'status', 'scheduled_date'],
    },
  },
  quotes: {
    list: {
      visibleFields: ['quote_number', 'client', 'address', 'status', 'date_issued', 'valid_until', 'total', 'linked_job', 'linked_invoice'],
      primaryField: 'quote_number',
      secondaryField: 'client',
      sortBy: 'created_at',
      sortDirection: 'desc',
      groupBy: 'none',
    },
    detail: {
      visibleFields: ['quote_number', 'client', 'company', 'address', 'status', 'total', 'date_issued', 'valid_until'],
    },
  },
  invoices: {
    list: {
      visibleFields: ['invoice_number', 'client', 'status', 'date_issued', 'due_date', 'total', 'linked_quote', 'linked_job'],
      primaryField: 'invoice_number',
      secondaryField: 'client',
      sortBy: 'created_at',
      sortDirection: 'desc',
      groupBy: 'none',
    },
    detail: {
      visibleFields: ['invoice_number', 'client', 'company', 'address', 'status', 'total', 'date_issued', 'due_date'],
    },
  },
}

// ── Validation + safe merge ───────────────────────────────────────

function safeFieldList(input: unknown, allowed: Set<string>, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of input) {
    if (typeof v !== 'string') continue
    if (!allowed.has(v)) continue
    if (seen.has(v)) continue
    out.push(v)
    seen.add(v)
  }
  return out.length > 0 ? out : fallback
}

function safeFieldRef(input: unknown, visibleFields: string[], allowed: Set<string>, fallback: string): string {
  if (typeof input !== 'string' || !allowed.has(input)) return fallback
  // The primary/secondary must be a field that's currently visible —
  // if the operator hides it, we silently fall back rather than render
  // a blank cell.
  if (!visibleFields.includes(input)) {
    return visibleFields[0] ?? fallback
  }
  return input
}

function safeSortKey(input: unknown, allowedSortable: Set<string>, fallback: string): string {
  if (typeof input !== 'string' || !allowedSortable.has(input)) return fallback
  return input
}

function safeSortDirection(input: unknown, fallback: SortDirection): SortDirection {
  return input === 'asc' || input === 'desc' ? input : fallback
}

function safeGroupBy(input: unknown, allowedGroupable: Set<string>, fallback: string): string {
  if (input === 'none') return 'none'
  if (typeof input !== 'string' || !allowedGroupable.has(input)) return fallback
  return input
}

function mergeEntity(
  stored: unknown,
  defs: readonly FieldDef[],
  fallback: EntityDisplay,
): EntityDisplay {
  const allowedAll = new Set(defs.map((f) => f.key))
  const allowedListAll = new Set(fieldsForContext(defs, 'list'))
  const allowedDetailAll = new Set(fieldsForContext(defs, 'detail'))
  const allowedSortable = sortableKeys(defs)
  const allowedGroupable = groupableKeys(defs)

  const s = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {}

  const listIn = (s.list && typeof s.list === 'object') ? s.list as Record<string, unknown> : {}
  const detailIn = (s.detail && typeof s.detail === 'object') ? s.detail as Record<string, unknown> : {}

  const listVisible = safeFieldList(listIn.visibleFields, allowedListAll, fallback.list.visibleFields)
  const detailVisible = safeFieldList(detailIn.visibleFields, allowedDetailAll, fallback.detail.visibleFields)

  return {
    list: {
      visibleFields: listVisible,
      primaryField: safeFieldRef(listIn.primaryField, listVisible, allowedAll, fallback.list.primaryField),
      secondaryField: safeFieldRef(listIn.secondaryField, listVisible, allowedAll, fallback.list.secondaryField),
      sortBy: safeSortKey(listIn.sortBy, allowedSortable, fallback.list.sortBy),
      sortDirection: safeSortDirection(listIn.sortDirection, fallback.list.sortDirection),
      groupBy: safeGroupBy(listIn.groupBy, allowedGroupable, fallback.list.groupBy),
    },
    detail: {
      visibleFields: detailVisible,
    },
  }
}

/**
 * Merge stored JSON over defaults with full validation. The output is
 * always a complete, type-safe DisplaySettings; unknown / invalid
 * fields are silently dropped, never thrown.
 */
export function mergeDisplaySettings(stored: unknown): DisplaySettings {
  const s = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {}
  return {
    jobs:     mergeEntity(s.jobs,     JOB_FIELDS,     DEFAULT_DISPLAY_SETTINGS.jobs),
    quotes:   mergeEntity(s.quotes,   QUOTE_FIELDS,   DEFAULT_DISPLAY_SETTINGS.quotes),
    invoices: mergeEntity(s.invoices, INVOICE_FIELDS, DEFAULT_DISPLAY_SETTINGS.invoices),
  }
}

// Lightweight server-side validator used by the save action. Returns
// either a fully-validated payload or a string error.
export function validateDisplayPayload(input: unknown):
  | { ok: true; value: DisplaySettings }
  | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Settings payload must be an object.' }
  }
  // We just run it through mergeDisplaySettings — invalid keys get
  // dropped, defaults fill in gaps. A truly broken input still produces
  // the default settings; that's the safe behaviour the spec asks for.
  return { ok: true, value: mergeDisplaySettings(input) }
}

// ── Field exports for UI ──────────────────────────────────────────

export { JOB_FIELD_KEYS, QUOTE_FIELD_KEYS, INVOICE_FIELD_KEYS, fieldsForContext, sortableKeys, groupableKeys }

// ── Loader ────────────────────────────────────────────────────────

const SETTINGS_KEY = 'display'

/**
 * Load global display settings from `portal_settings`. Always returns
 * a fully-populated, validated DisplaySettings — falls back to the
 * code defaults when the row is missing or any read error occurs.
 */
export async function loadDisplaySettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public'>,
): Promise<DisplaySettings> {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error || !data) return DEFAULT_DISPLAY_SETTINGS
  return mergeDisplaySettings(data.value)
}

export { SETTINGS_KEY }
