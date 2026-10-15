import { mfaStep, enforcedStep, isMfaExempt, mfaRedirectPath, safeNextPath } from '@/lib/mfa-gate'

describe('mfaStep', () => {
  it('lets a fully signed-in (aal2) session through', () => {
    expect(mfaStep({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('ok')
  })
  it('asks for the code when an authenticator exists but this session is password-only', () => {
    expect(mfaStep({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe('verify')
  })
  it('sends someone with no authenticator to set-up', () => {
    expect(mfaStep({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enroll')
  })
  it('fails closed when the level is unknown', () => {
    expect(mfaStep(null)).toBe('enroll')
    expect(mfaStep({ currentLevel: null, nextLevel: null })).toBe('enroll')
  })
})

describe('redirect helpers', () => {
  it('keeps login, password reset and the MFA pages reachable', () => {
    for (const p of ['/portal/login', '/portal/reset-password', '/portal/forgot-password', '/portal/auth/callback', '/portal/mfa', '/portal/mfa/setup']) {
      expect(isMfaExempt(p)).toBe(true)
    }
    expect(isMfaExempt('/portal/invoices')).toBe(false)
  })

  it('remembers where they were going', () => {
    expect(mfaRedirectPath('verify', '/portal/invoices/123?tab=x')).toBe('/portal/mfa?next=%2Fportal%2Finvoices%2F123%3Ftab%3Dx')
    expect(mfaRedirectPath('enroll', '/portal')).toBe('/portal/mfa/setup?next=%2Fportal')
  })

  it('never follows a next= outside the portal', () => {
    expect(safeNextPath('https://evil.example')).toBe('/portal')
    expect(safeNextPath('//evil.example')).toBe('/portal')
    expect(safeNextPath('/contractor/jobs')).toBe('/portal')
    expect(safeNextPath('/portal/mfa')).toBe('/portal')
    expect(safeNextPath(null)).toBe('/portal')
    expect(safeNextPath('/portal/finance')).toBe('/portal/finance')
  })
})

describe('enforcedStep (rollout switch)', () => {
  it('always demands the code from someone who has an authenticator', () => {
    expect(enforcedStep('verify', false)).toBe('verify')
    expect(enforcedStep('verify', true)).toBe('verify')
  })
  it('only forces set-up once PORTAL_MFA_REQUIRED is on', () => {
    expect(enforcedStep('enroll', false)).toBe('ok')
    expect(enforcedStep('enroll', true)).toBe('enroll')
  })
})
