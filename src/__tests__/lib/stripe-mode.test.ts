import { getStripeMode, canTakeRealPayments, stripeModeWarning } from '@/lib/stripe'

// Card payment sat live for months with an sk_test_ key and never took a cent.
// Nothing surfaced the mode, so it looked like customers simply preferred bank
// transfer. These helpers make the mode visible instead of silent.

describe('getStripeMode', () => {
  it('reads a live secret key', () => {
    expect(getStripeMode('sk_live_51ABCdef')).toBe('live')
  })

  it('reads a live restricted key', () => {
    expect(getStripeMode('rk_live_51ABCdef')).toBe('live')
  })

  it('reads a test key', () => {
    expect(getStripeMode('sk_test_51TNxyz')).toBe('test')
    expect(getStripeMode('rk_test_51TNxyz')).toBe('test')
  })

  it('treats a missing key as unconfigured', () => {
    expect(getStripeMode('')).toBe('unconfigured')
    expect(getStripeMode(undefined)).toBe('unconfigured')
    expect(getStripeMode('   ')).toBe('unconfigured')
  })

  it('never assumes an unrecognised key is live', () => {
    // Treating a malformed key as production is the more expensive mistake.
    expect(getStripeMode('pk_live_something')).toBe('unconfigured')
    expect(getStripeMode('nonsense')).toBe('unconfigured')
  })
})

describe('canTakeRealPayments', () => {
  it('is true only for a live key', () => {
    expect(canTakeRealPayments('sk_live_x')).toBe(true)
  })

  it('is false for a test key — real cards would be declined', () => {
    expect(canTakeRealPayments('sk_test_x')).toBe(false)
  })

  it('is false when unset', () => {
    expect(canTakeRealPayments('')).toBe(false)
  })
})

describe('stripeModeWarning', () => {
  it('says nothing when payments work', () => {
    expect(stripeModeWarning('sk_live_x')).toBeNull()
  })

  it('names the exact env vars to change in test mode', () => {
    const w = stripeModeWarning('sk_test_x')!
    expect(w).toContain('TEST mode')
    expect(w).toContain('STRIPE_SECRET_KEY')
    expect(w).toContain('sk_live_')
    expect(w).toContain('STRIPE_WEBHOOK_SECRET')
  })

  it('explains an unconfigured setup', () => {
    const w = stripeModeWarning('')!
    expect(w).toContain('not configured')
    expect(w).toContain('STRIPE_SECRET_KEY')
  })
})
