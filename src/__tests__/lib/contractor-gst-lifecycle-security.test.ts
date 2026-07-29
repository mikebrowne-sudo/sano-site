// Lifecycle + security invariants for the effective-dated contractor GST history
// (PR 5). Source-level assertions locking the guarantees (coexist, no self-verify,
// atomic supersede, token safety, cache sync, migration constraints).

import { readFileSync } from 'fs'
import { join } from 'path'

const staffAction = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/gst/_actions.ts'), 'utf8')
const contractorAction = readFileSync(join(process.cwd(), 'src/app/contractor-setup/[token]/_gst-actions.ts'), 'utf8')
const dataLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history-data.ts'), 'utf8')
const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-01-contractor-gst-history.sql'), 'utf8')

describe('verified + pending replacement coexist; contractor cannot self-verify', () => {
  it('contractor submission is always pending, source contractor_submitted, never verified', () => {
    expect(contractorAction).toMatch(/status:\s*'submitted'/)
    expect(contractorAction).toMatch(/source:\s*'contractor_submitted'/)
    expect(contractorAction).not.toMatch(/status:\s*'verified'/)
    expect(contractorAction).not.toContain('verified_at:')
  })
  it('submit clears only a prior SUBMITTED row, never the verified one', () => {
    expect(contractorAction).toMatch(/priorSubmitted[\s\S]*?\.eq\('status',\s*'submitted'\)/)
    expect(staffAction).toMatch(/priorSubmitted[\s\S]*?\.eq\('status',\s*'submitted'\)/)
  })
})

describe('verify supersedes the prior verified atomically + syncs the cache', () => {
  it('verify supersedes the prior current-verified row (both pointers)', () => {
    expect(staffAction).toMatch(/priorVerified[\s\S]*?\.eq\('status',\s*'verified'\)[\s\S]*?\.is\('superseded_at',\s*null\)/)
    expect(staffAction).toMatch(/status:\s*'superseded'[\s\S]*superseded_by_id:\s*gstId/)
  })
  it('reject leaves the verified status untouched', () => {
    expect(staffAction).toMatch(/if\s*\(status === 'rejected'\)/)
    expect(staffAction).toMatch(/status:\s*'rejected'/)
  })
  it('verify + verify-now sync the derived contractors.gst_* cache', () => {
    expect(staffAction).toMatch(/syncGstCache/)
    expect(dataLib).toMatch(/export async function syncGstCache/)
    // the cache sync reads the CURRENT VERIFIED row (not newest).
    expect(dataLib).toMatch(/\.eq\('status',\s*'verified'\)[\s\S]*\.is\('superseded_at',\s*null\)/)
  })
  it('completeness guard on verify (effective for registered, signature, wording)', () => {
    expect(staffAction).toMatch(/Set an effective date before verifying a registered/)
    expect(staffAction).toMatch(/must be signed/)
  })
})

describe('token route exposes only contractor-safe GST fields', () => {
  it('the safe select excludes review notes / verification metadata / evidence', () => {
    const start = dataLib.indexOf('getContractorSafeGstByToken')
    const region = dataLib.slice(start)
    const cols = region.match(/\.select\('([^']*)'\)/)?.[1] ?? ''
    for (const f of ['review_notes', 'verified_at', 'verified_by', 'evidence_ref', 'created_by', 'supersedes_id']) {
      expect(cols.includes(f)).toBe(false)
    }
    const iface = dataLib.slice(dataLib.indexOf('export interface ContractorSafeGst'), dataLib.indexOf('}', dataLib.indexOf('export interface ContractorSafeGst')))
    for (const f of ['reviewNotes', 'verifiedAt', 'evidenceRef']) expect(iface.includes(f)).toBe(false)
  })
  it('token read is length-guarded + status-gated', () => {
    expect(dataLib).toMatch(/token\.length < 16/)
    expect(dataLib).toMatch(/OPEN\.has/)
  })
})

describe('no turnover inference; never applied before effective date', () => {
  it('nothing in the GST code computes registration from a turnover threshold', () => {
    // "turnover" appears only in comments stating we do NOT infer from it; the
    // real guarantee is: no $60k threshold arithmetic anywhere.
    for (const src of [staffAction, contractorAction, dataLib]) {
      expect(src).not.toMatch(/60[,_ ]?000/)
      expect(src).not.toMatch(/turnover\s*[><=]/i) // no turnover comparison
    }
  })
  it('the GST window resolver applies "not registered" before the effective date', () => {
    const gstLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history.ts'), 'utf8')
    expect(gstLib).toMatch(/effectiveDate <= dateIso/)
    expect(gstLib).toMatch(/gstRegistered: false/) // null/none → not registered
  })
})

describe('source of truth = history; existing invoices untouched', () => {
  it('the GST feature never reads or writes contractor_invoices / gst_applied / remittances', () => {
    for (const src of [staffAction, contractorAction, dataLib]) {
      expect(src).not.toContain('contractor_invoices')
      expect(src).not.toContain('gst_applied')
      expect(src).not.toContain('contractor_remittance')
    }
  })
  it('historical resolution uses the history list, and only the CACHE write targets contractors.gst_*', () => {
    // syncGstCache is the ONLY place that updates contractors.gst_* — and it reads
    // the verified history row first.
    const sync = dataLib.slice(dataLib.indexOf('export async function syncGstCache'))
    expect(sync).toMatch(/from\('contractor_gst_history'\)[\s\S]*\.eq\('status',\s*'verified'\)/)
    expect(sync).toMatch(/from\('contractors'\)\.update/)
    // date resolution keys off the history records, not the flat contractors columns.
    const gstLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history.ts'), 'utf8')
    expect(gstLib).toMatch(/selectGstStatusForDate/)
    expect(gstLib).not.toContain('contractors')
  })
})

describe('migration: immutable, split indexes, consistency constraints', () => {
  it('has the immutability trigger', () => {
    expect(sql).toMatch(/cgh_immutable_facts/)
    expect(sql).toMatch(/submitted GST facts are immutable/)
  })
  it('has separate one-submitted + one-current-verified partial indexes', () => {
    expect(sql).toMatch(/cgh_one_submitted_per_contractor[\s\S]*where status = 'submitted'/)
    expect(sql).toMatch(/cgh_one_current_verified_per_contractor[\s\S]*where status = 'verified' and superseded_at is null/)
  })
  it('has consistency + verified-completeness constraints', () => {
    for (const c of ['cgh_registered_number_chk', 'cgh_end_after_effective_chk', 'cgh_verified_complete_chk']) {
      expect(sql).toContain(c)
    }
  })
  it('registered-number CHECK requires a GST number when registered', () => {
    expect(sql).toMatch(/gst_registered = false or \(gst_number is not null/)
  })
  it('the backfill is commented out (opt-in, evidence-preserving, not an inference)', () => {
    expect(sql).toMatch(/-- insert into public\.contractor_gst_history/)
  })
})
