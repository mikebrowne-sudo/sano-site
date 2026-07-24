/** @jest-environment node */

// Phase 6 — H&S module content seed. Structure assertions on the seed SQL
// (content is prose, reviewed in the file; this locks the shape + flags).

import { readFileSync } from 'fs'
import { join } from 'path'
import { INDUCTION_MODULE_KEYS } from '@/lib/induction-modules'

const sql = readFileSync(join(process.cwd(), 'docs/db/2026-07-24-phase6-hs-module-content.sql'), 'utf8')
const sourceSql = readFileSync(join(process.cwd(), 'docs/db/2026-07-24-phase6-assignment-source.sql'), 'utf8')
const backfillSql = readFileSync(join(process.cwd(), 'docs/db/2026-07-24-phase6-assign-core-modules-to-existing.sql'), 'utf8')

const CORE = ['hs_induction', 'hazardous_substances', 'safe_work_practices', 'hazard_incident_reporting', 'security_property', 'privacy_conduct']
const ROLE = ['working_at_height', 'team_leader']

describe('Phase 6 — H&S module seed', () => {
  it('seeds the six core modules', () => {
    for (const k of CORE) expect(sql).toContain(`'${k}'`)
    // core modules are the induction (auto-assigned) set
    expect([...INDUCTION_MODULE_KEYS].sort()).toEqual([...CORE].sort())
  })
  it('seeds the two role-specific modules', () => {
    for (const k of ROLE) expect(sql).toContain(`'${k}'`)
  })
  it('is an idempotent upsert by key that preserves assignments/acks', () => {
    expect(sql).toMatch(/on conflict \(key\) where key is not null do update/)
    // touches only training_modules — never the assignment/ack tables
    expect(sql).not.toMatch(/(insert|update|delete)[\s\S]{0,40}worker_training_assignments/i)
    expect(sql).not.toMatch(/(insert|update|delete)[\s\S]{0,40}worker_training_acknowledgements/i)
  })
  it('every module requires acknowledgement, and there are no quiz/knowledge fields', () => {
    // requires_acknowledgement is true for all eight rows (the ", true, true," flag pair)
    expect((sql.match(/'active', true, true,/g) ?? []).length).toBe(CORE.length + ROLE.length)
    expect(sql).not.toMatch(/quiz|question|answer|score/i)
  })
  it('supporting PDFs are labelled but document_url is left NULL (uploaded later; optional to complete)', () => {
    expect(sql).toContain("'Sano Health & Safety Plan'")
    expect(sql).toContain("'Sano Hazardous Substances Register (SDS)'")
    // The insert column list carries document_label but NOT document_url (so it
    // stays NULL and staff upload the PDF later).
    const cols = sql.match(/\(key, title[\s\S]*?document_label\)/)?.[0] ?? ''
    expect(cols).toContain('document_label')
    expect(cols).not.toContain('document_url')
  })
})

describe('Phase 6 — assignment traceability', () => {
  it('adds an assignment_source column + CHECK covering the known sources', () => {
    expect(sourceSql).toMatch(/add column if not exists assignment_source text/)
    expect(sourceSql).toMatch(/wta_assignment_source_chk/)
    for (const v of ['automatic_on_sign', 'manual_staff_assignment', 'phase6_existing_worker_backfill', 'phase7_role_targeting', 'site_specific_assignment', 'imported_legacy']) {
      expect(sourceSql).toContain(`'${v}'`)
    }
  })
  it('the backfill stamps the phase6 source, pins the six core keys, and keeps ON CONFLICT DO NOTHING', () => {
    expect(backfillSql).toContain("'phase6_existing_worker_backfill'")
    expect(backfillSql).toMatch(/on conflict \(contractor_id, training_module_id\) do nothing/)
    for (const k of CORE) expect(backfillSql).toContain(`'${k}'`)
    expect(backfillSql).not.toMatch(/m\.auto_assign = true/) // pinned by explicit key, not the flag
  })
  it('the backfill rollback deletes ONLY the phase6 source rows (never pre-existing / manual)', () => {
    const rb = backfillSql.slice(backfillSql.indexOf('ROLLBACK'))
    expect(rb).toMatch(/delete from public\.worker_training_assignments[\s\S]*?assignment_source = 'phase6_existing_worker_backfill'/)
    // never deletes by key/status alone (which would catch pre-existing rows)
    expect(rb).not.toMatch(/using public\.training_modules/)
  })
})
