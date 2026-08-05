// Company-name quality review for campaign leads.
//
// The intro email interpolates a lead's `company` straight into the subject
// ("Cleaning at {company}") and body ("...the cleaning at {company}..."). Lead
// data is scraped/hand-entered and sometimes carries research notes, contact
// names, emails, or junk in the company field — which, interpolated into a cold
// email, instantly reads as a broken mail-merge and burns the lead.
//
// This module flags company values that are unsafe to interpolate so they can be
// corrected, excluded, or explicitly approved BEFORE a campaign launches. Pure +
// dependency-free so it's unit-testable and runs both server-side (launch gate)
// and in the review UI.

export type CompanyNameFlag =
  | 'blank'
  | 'too_long'
  | 'research_note'
  | 'contact_name'
  | 'contact_detail'
  | 'punctuation'
  | 'duplicate_word'
  | 'all_caps'
  | 'suspicious_digits'

export interface CompanyNameIssue {
  flag: CompanyNameFlag
  detail: string
}

/** A company name is "clean" for interpolation when this returns []. */
export function reviewCompanyName(raw: string | null | undefined): CompanyNameIssue[] {
  const issues: CompanyNameIssue[] = []
  const value = (raw ?? '').trim()

  // 1. Blank / placeholder.
  if (!value) {
    issues.push({ flag: 'blank', detail: 'Company name is blank.' })
    return issues // nothing else to check
  }
  if (/^(n\/?a|none|unknown|tbc|tbd|test|placeholder|company( name)?|xxx+)$/i.test(value)) {
    issues.push({ flag: 'blank', detail: `Placeholder value: "${value}".` })
  }

  // 2. Unusually long — real company names are short; long = a note got pasted in.
  if (value.length > 60) {
    issues.push({ flag: 'too_long', detail: `Unusually long (${value.length} chars) — likely a note pasted into the field.` })
  }

  // 3. Research / verification notes left in the field.
  if (/\b(CONFIRMED|UNCONFIRMED|VERIFY|VERIFIED|Director|Manager|Owner|Principal|Founder|CEO|note[:s]?|likely|inferred|per LinkedIn|not the|role|listed|check before|confirm before)\b/i.test(value)) {
    issues.push({ flag: 'research_note', detail: 'Contains a research note / job title / verification word.' })
  }

  // 4. A contact name mixed into the company field (a person, not a business).
  //    Heuristic: a dash followed by a capitalised first name + at least one more
  //    name word (allowing lowercase particles like "den", "van", "de"), or a
  //    leading "Firstname Lastname —". Catches "Acme — Nick den Heijer".
  if (
    /[—–-]\s*[A-Z][a-z]+(?:\s+(?:[a-z]{2,4}\s+)?[A-Z][a-z]+)+/.test(value) ||
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s*[—–-]/.test(value)
  ) {
    issues.push({ flag: 'contact_name', detail: 'Looks like a person’s name is mixed into the company field.' })
  }

  // 5. Email / URL / phone number in the company field.
  if (/@|https?:\/\/|www\.|\.co\.nz|\.com\b|\.org|\.nz\b/i.test(value)) {
    issues.push({ flag: 'contact_detail', detail: 'Contains an email address or web/domain fragment.' })
  }
  if (/(\+?64|0)\s?\d[\d\s()-]{6,}/.test(value)) {
    issues.push({ flag: 'contact_detail', detail: 'Contains what looks like a phone number.' })
  }

  // 6. Brackets / pipes / arrows / long dashes / slashes — structural junk.
  if (/[|<>\[\]{}]|[—–]|=>|->|\/\//.test(value)) {
    issues.push({ flag: 'punctuation', detail: 'Contains brackets, a pipe, an arrow, a long dash or a double slash.' })
  }

  // 7. Duplicate adjacent words (e.g. "Acme Acme Ltd") — a merge artefact.
  const words = value.split(/\s+/)
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > 2 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
      issues.push({ flag: 'duplicate_word', detail: `Repeated word: "${words[i]}".` })
      break
    }
  }

  // 8. All-caps (SHOUTING) multi-letter entry — reads wrong in a personal email.
  //    Allow short acronyms (e.g. "BNZ", "ASB", "NZTA") and mixed-case names.
  const letters = value.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 6 && value === value.toUpperCase() && /[A-Z]/.test(value)) {
    issues.push({ flag: 'all_caps', detail: 'Entirely uppercase — will read as shouting in the email.' })
  }

  // 9. Suspicious digits / internal notes. A trailing/standalone number or a
  //    "#123" / "id:" style token suggests an internal reference, not a name.
  if (/#\d|(?:^|\s)id[:=]|\b(?:row|record|lead)\s*\d+/i.test(value)) {
    issues.push({ flag: 'suspicious_digits', detail: 'Contains an internal reference / id-like token.' })
  } else if (/\d{4,}/.test(value)) {
    issues.push({ flag: 'suspicious_digits', detail: 'Contains a long run of digits.' })
  }

  return issues
}

/** True when the company name is safe to interpolate (no issues). */
export function isCompanyNameClean(raw: string | null | undefined): boolean {
  return reviewCompanyName(raw).length === 0
}
