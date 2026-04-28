import { ADMIN_EMAIL, getCleanupAccess, requireCleanupAccess } from '../cleanup-mode'

// Minimal Supabase mock — only the surface used by getCleanupAccess.
function makeSupabase({
  email,
  enable_cleanup_mode,
  userId = 'user-1',
}: {
  email: string | null
  enable_cleanup_mode?: boolean
  userId?: string
}) {
  const user = email ? { id: userId, email } : null
  const settingsRow = enable_cleanup_mode == null
    ? { value: {} }
    : { value: { enable_cleanup_mode } }
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (_table: string) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: settingsRow, error: null }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as unknown as any
}

describe('getCleanupAccess', () => {
  it('returns canCleanup=false for an unauthenticated visitor', async () => {
    const access = await getCleanupAccess(makeSupabase({ email: null }))
    expect(access.isAdmin).toBe(false)
    expect(access.isCleanupModeEnabled).toBe(false)
    expect(access.canCleanup).toBe(false)
  })

  it('returns canCleanup=false for a non-admin user, even if cleanup mode is on', async () => {
    const access = await getCleanupAccess(makeSupabase({
      email: 'staff@sano.nz',
      enable_cleanup_mode: true,
    }))
    expect(access.isAdmin).toBe(false)
    expect(access.canCleanup).toBe(false)
  })

  it('returns canCleanup=false when admin but cleanup mode is off', async () => {
    const access = await getCleanupAccess(makeSupabase({
      email: ADMIN_EMAIL,
      enable_cleanup_mode: false,
    }))
    expect(access.isAdmin).toBe(true)
    expect(access.isCleanupModeEnabled).toBe(false)
    expect(access.canCleanup).toBe(false)
  })

  it('returns canCleanup=true when admin AND cleanup mode is on', async () => {
    const access = await getCleanupAccess(makeSupabase({
      email: ADMIN_EMAIL,
      enable_cleanup_mode: true,
    }))
    expect(access.isAdmin).toBe(true)
    expect(access.isCleanupModeEnabled).toBe(true)
    expect(access.canCleanup).toBe(true)
  })

  it('defaults cleanup mode to false when settings row is empty', async () => {
    const access = await getCleanupAccess(makeSupabase({ email: ADMIN_EMAIL }))
    expect(access.isCleanupModeEnabled).toBe(false)
    expect(access.canCleanup).toBe(false)
  })
})

describe('requireCleanupAccess', () => {
  it('rejects unauthenticated callers as Admin only', async () => {
    const r = await requireCleanupAccess(makeSupabase({ email: null }))
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toMatch(/Admin only/)
  })

  it('rejects non-admin callers as Admin only', async () => {
    const r = await requireCleanupAccess(makeSupabase({
      email: 'staff@sano.nz',
      enable_cleanup_mode: true,
    }))
    if ('error' in r) expect(r.error).toMatch(/Admin only/)
    else throw new Error('expected error')
  })

  it('rejects admin when cleanup mode is disabled', async () => {
    const r = await requireCleanupAccess(makeSupabase({
      email: ADMIN_EMAIL,
      enable_cleanup_mode: false,
    }))
    if ('error' in r) expect(r.error).toMatch(/Cleanup mode is disabled/)
    else throw new Error('expected error')
  })

  it('returns ok + userId when admin AND cleanup mode is on', async () => {
    const r = await requireCleanupAccess(makeSupabase({
      email: ADMIN_EMAIL,
      enable_cleanup_mode: true,
      userId: 'admin-id',
    }))
    if ('ok' in r) {
      expect(r.ok).toBe(true)
      expect(r.userId).toBe('admin-id')
    } else {
      throw new Error('expected ok')
    }
  })
})
