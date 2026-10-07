// Sender-readiness check — before a campaign goes out, confirm the sending
// domain is authenticated (SPF / DKIM) and the visible From aligns with it, so
// carol@sano.nz email isn't spam-binned or spoofed. This is the foundation:
// good copy on an unauthenticated domain still lands in junk.
//
// We check two things without needing DNS libraries at runtime:
//   1. Resend reports the domain as verified (it verifies SPF + DKIM on setup).
//   2. The From address's domain matches a Resend-verified domain (alignment).
//
// DMARC can't be read from Resend's API, so we surface it as a manual reminder
// rather than a hard gate — the SPF/DKIM/alignment checks are the enforceable
// ones. Result.ready gates (or prominently warns) the launch.

export interface SenderReadiness {
  ready: boolean
  fromDomain: string
  domainVerified: boolean
  aligned: boolean
  checks: Array<{ label: string; ok: boolean; detail: string }>
  note: string
}

interface ResendDomain { name: string; status: string }

/**
 * Check whether `fromEmail` is safe to send a campaign from. Queries Resend's
 * Domains API for the domain's verification status + alignment.
 */
export async function checkSenderReadiness(fromEmail: string): Promise<SenderReadiness> {
  const fromDomain = (fromEmail.split('@')[1] || '').toLowerCase().trim()
  const checks: SenderReadiness['checks'] = []

  let domainVerified = false
  let apiOk = false
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      cache: 'no-store',
    })
    if (res.ok) {
      apiOk = true
      const body = (await res.json()) as { data?: ResendDomain[] } | ResendDomain[]
      const domains = Array.isArray(body) ? body : (body.data ?? [])
      const match = domains.find((d) => d.name.toLowerCase() === fromDomain)
      domainVerified = match?.status?.toLowerCase() === 'verified'
    }
  } catch {
    apiOk = false
  }

  const aligned = fromDomain.length > 0 // the From domain IS the verified domain we check

  checks.push({
    label: 'SPF + DKIM (domain verified in Resend)',
    ok: domainVerified,
    detail: !apiOk
      ? 'Could not reach Resend to confirm — verify manually before sending.'
      : domainVerified
        ? `${fromDomain} is verified (SPF + DKIM authenticated).`
        : `${fromDomain} is NOT a verified Resend domain. Verify it before sending or the mail will fail SPF/DKIM and land in spam.`,
  })
  checks.push({
    label: 'From-domain alignment',
    ok: domainVerified && aligned,
    detail: domainVerified
      ? `From address (${fromEmail}) is on the authenticated domain — aligned.`
      : 'From-domain must be the authenticated domain for DMARC alignment.',
  })
  checks.push({
    label: 'DMARC policy (manual)',
    ok: true,
    detail: 'Confirm a DMARC record exists for the domain (Resend can’t report this). Not a hard block, but recommended before bulk sending.',
  })

  return {
    ready: domainVerified && aligned,
    fromDomain,
    domainVerified,
    aligned,
    checks,
    note: domainVerified
      ? 'Sender authentication looks good. Still send a test to yourself and confirm inbox placement before launching.'
      : 'Sender authentication is NOT confirmed — sending now risks bounces and spam placement.',
  }
}
