// Backfill proposal generator for `email_business_name` (REVIEW-FIRST).
//
// This does NOT write to the database. It reads every lead's `company`, computes
// a conservative `email_business_name` proposal, and writes a CSV so Mike can
// review the proposed values BEFORE anything is applied. Rows flagged
// low-confidence (or still unsafe) are marked for a closer look.
//
// Usage (from repo root, with SUPABASE env vars available):
//   node scripts/backfill-email-business-names.mjs > email-name-proposals.csv
//
// After review, apply the approved values (e.g. via a second script or the
// review panel). The launch gate blocks any lead whose email_business_name is
// still blank/unsafe, so nothing unreviewed can go out.

import { createClient } from '@supabase/supabase-js'

// Inline the conservative cleanup so this script is self-contained (mirrors
// src/lib/campaigns/email-business-name.ts — keep in sync if that changes).
const LEGAL_SUFFIXES = ['nz limited', 'new zealand limited', 'limited', 'ltd', 'ltd.', 'pty ltd', 'llc', 'inc', 'inc.', 'incorporated', 'co', 'co.', 'company']
const RESEARCH_NOTE = /\b(CONFIRMED|UNCONFIRMED|VERIFY|VERIFIED|note[:s]?|likely|inferred|per LinkedIn|not the|check before|confirm before)\b/i
const tidy = (s) => s.replace(/\s+/g, ' ').replace(/\s*[,;:–—-]\s*$/, '').replace(/^\s*[,;:–—-]\s*/, '').trim()

function derive(original) {
  original = (original ?? '').trim()
  if (!original) return { value: '', low: true, note: 'blank' }
  let value = original
  const changes = []
  if (RESEARCH_NOTE.test(value)) {
    const cut = value.replace(/\s*[—–-]\s*[^—–-]*$/, '')
    if (cut && cut.length < value.length && !RESEARCH_NOTE.test(cut)) { value = cut; changes.push('note removed') }
    else return { value: tidy(value), low: true, note: 'entangled research note' }
  }
  const noBr = value.replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ')
  if (noBr.trim() && noBr.trim() !== value.trim()) { value = noBr; changes.push('bracket removed') }
  const suffixRe = new RegExp(`[,]?\\s+(?:${LEGAL_SUFFIXES.map((s) => s.replace(/[.]/g, '\\.')).join('|')})\\s*$`, 'i')
  const noSuf = value.replace(suffixRe, '')
  if (noSuf.trim() && noSuf.trim() !== value.trim()) { value = noSuf; changes.push('suffix removed') }
  value = tidy(value)
  if (changes.length === 0) {
    const complex = value.length > 40 || /[|<>/=]/.test(value)
    return { value, low: complex, note: complex ? 'no change — check' : 'already clean' }
  }
  return { value, low: false, note: changes.join('; ') }
}

const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('sales_leads')
    .select('id, company, email_business_name, quality_rank')
    .order('quality_rank', { ascending: true })
    .limit(2000)
  if (error) { console.error(error.message); process.exit(1) }

  console.log(['lead_id', 'grade', 'company (CRM)', 'proposed email_business_name', 'low_confidence', 'note'].map(csvCell).join(','))
  for (const l of data ?? []) {
    const p = derive(l.company)
    console.log([l.id, l.quality_rank ?? '', l.company ?? '', p.value, p.low ? 'REVIEW' : '', p.note].map(csvCell).join(','))
  }
  console.error(`\nGenerated ${data?.length ?? 0} proposals. Review the CSV; rows marked REVIEW need a human eye.`)
}

main()
