export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'missing' | 'expired' | 'inactive'

export interface ComplianceInput {
  status?: string | null
  insurance_expiry?: string | null
  right_to_work_required?: boolean | null
  right_to_work_expiry?: string | null
  contract_signed_date?: string | null
}

export interface ComplianceResult {
  status: ComplianceStatus
  reasons: string[]
}

const EXPIRY_SOON_DAYS = 30

function daysUntil(iso: string, today: string): number {
  return Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86400000)
}

export function computeComplianceStatus(c: ComplianceInput, todayIso?: string): ComplianceResult {
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  const reasons: string[] = []

  if (c.status && c.status !== 'active') {
    return { status: 'inactive', reasons: ['Contractor is inactive'] }
  }

  let anyExpired = false
  let anyExpiringSoon = false
  let anyMissing = false

  // Insurance (always required before assignment)
  if (!c.insurance_expiry) {
    anyMissing = true
    reasons.push('Insurance expiry not on file')
  } else if (c.insurance_expiry < today) {
    anyExpired = true
    reasons.push(`Insurance expired on ${c.insurance_expiry}`)
  } else if (daysUntil(c.insurance_expiry, today) <= EXPIRY_SOON_DAYS) {
    anyExpiringSoon = true
    reasons.push(`Insurance expires in ${daysUntil(c.insurance_expiry, today)} days`)
  }

  // Right-to-work (only if required)
  if (c.right_to_work_required) {
    if (!c.right_to_work_expiry) {
      anyMissing = true
      reasons.push('Right-to-work expiry not on file')
    } else if (c.right_to_work_expiry < today) {
      anyExpired = true
      reasons.push(`Right-to-work expired on ${c.right_to_work_expiry}`)
    } else if (daysUntil(c.right_to_work_expiry, today) <= EXPIRY_SOON_DAYS) {
      anyExpiringSoon = true
      reasons.push(`Right-to-work expires in ${daysUntil(c.right_to_work_expiry, today)} days`)
    }
  }

  // Signed contract — missing is a soft signal (not currently blocking)
  if (!c.contract_signed_date) {
    anyMissing = true
    reasons.push('Contractor agreement not signed')
  }

  if (anyExpired) return { status: 'expired', reasons }
  if (anyMissing) return { status: 'missing', reasons }
  if (anyExpiringSoon) return { status: 'expiring_soon', reasons }
  return { status: 'compliant', reasons: [] }
}

export const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  expiring_soon: 'Expiring soon',
  missing: 'Missing',
  expired: 'Expired',
  inactive: 'Inactive',
}

export const COMPLIANCE_STYLES: Record<ComplianceStatus, string> = {
  compliant: 'bg-emerald-50 text-emerald-700',
  expiring_soon: 'bg-amber-50 text-amber-700',
  missing: 'bg-amber-50 text-amber-700',
  expired: 'bg-red-50 text-red-700',
  inactive: 'bg-gray-100 text-gray-600',
}
