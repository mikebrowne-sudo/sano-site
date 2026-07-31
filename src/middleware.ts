import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAccountantEmail, isAdminEmail } from '@/lib/is-admin'

// Portal route prefixes a read-only accountant (finance) login may access.
// Everything else under /portal is redirected to the finance area for them.
// Includes the Pay + Reports hubs and the pay/finance surfaces they front.
const FINANCE_PREFIXES = [
  '/portal/finance',
  '/portal/expenses',
  '/portal/invoices',
  '/portal/contractor-invoices',
  '/portal/contractor-statements',
  '/portal/payroll',
  '/portal/mileage',
  '/portal/pay',
  '/portal/reports',
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options } as never)
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '')
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options } as never)
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPortal = path.startsWith('/portal')
  const isPortalLogin = path === '/portal/login'
  const isPortalCallback = path === '/portal/auth/callback'
  // Phase 5B-followup — public auth routes that must NOT be gated by
  // the unauthenticated-portal redirect below. Supabase invite/recovery
  // links land here without a session cookie (the session is in the URL
  // hash/code), so an early redirect to /portal/login would strip the
  // auth payload and leave the contractor stuck on the staff sign-in
  // page with no way to set a password.
  const isResetPassword = path === '/portal/reset-password'
  const isForgotPassword = path === '/portal/forgot-password'
  const isContractor = path.startsWith('/contractor')
  const isContractorLogin = path === '/contractor/login'
  // Phase 5.5.5 — customer portal scaffold. Auth-only and role-scoped;
  // the placeholder page checks the enable_customer_portal flag and
  // shows a "not available yet" state instead of leaking data.
  const isClient = path.startsWith('/client')
  const isClientLogin = path === '/client/login'

  // ── Not logged in ───────────────────────────────────
  if (!user) {
    if (isPortal && !isPortalLogin && !isPortalCallback && !isResetPassword && !isForgotPassword) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (isContractor && !isContractorLogin) {
      return NextResponse.redirect(new URL('/contractor/login', request.url))
    }
    if (isClient && !isClientLogin) {
      // No dedicated client login yet — bounce to the staff login as a
      // safe default since /portal/login is the only auth surface.
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    return response
  }

  // ── Logged in — figure out the role.
  // Two role lookups in parallel; both are RLS-scoped self-reads.
  const [{ data: contractorRecord }, { data: clientRecord }] = await Promise.all([
    supabase.from('contractors').select('id').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('clients').select('id').eq('auth_user_id', user.id).maybeSingle(),
  ])

  const isContractorUser = !!contractorRecord
  const isClientUser = !!clientRecord && !isContractorUser

  // ── Contractor user hitting admin portal → redirect out ──
  if (isContractorUser && isPortal && !isPortalLogin) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }

  // ── Staff user hitting contractor portal → redirect out ──
  if (!isContractorUser && !isClientUser && isContractor && !isContractorLogin) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Phase 5.5.5 — /client gate. Only client users may visit. Staff
  // and contractor users get bounced to their own home. The placeholder
  // page itself handles the "feature disabled" state for client users.
  if (isClient) {
    if (isContractorUser) {
      return NextResponse.redirect(new URL('/contractor/jobs', request.url))
    }
    if (!isClientUser) {
      // Authenticated but not a client → staff. Send to admin home.
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  // ── Accountant (finance) login — read-only, finance area only ──
  // A staff-side account whose email is on the accountant list (and is not an
  // admin) may only reach the finance route prefixes; anything else under
  // /portal bounces to the finance home. Auth/util routes stay open so they
  // can log in and reset their password.
  const isAccountant = !isContractorUser && !isClientUser
    && isAccountantEmail(user.email) && !isAdminEmail(user.email)
  if (isAccountant && isPortal && !isPortalLogin && !isPortalCallback && !isResetPassword && !isForgotPassword) {
    const allowed = FINANCE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
    if (!allowed) {
      return NextResponse.redirect(new URL('/portal/finance', request.url))
    }
  }

  // ── Login page redirects for already-authenticated users ──
  if (isPortalLogin && isContractorUser) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }
  if (isPortalLogin && isClientUser) {
    return NextResponse.redirect(new URL('/client/dashboard', request.url))
  }
  if (isPortalLogin && !isContractorUser && !isClientUser) {
    return NextResponse.redirect(new URL(isAccountant ? '/portal/finance' : '/portal', request.url))
  }
  if (isContractorLogin && isContractorUser) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }
  if (isContractorLogin && isClientUser) {
    return NextResponse.redirect(new URL('/client/dashboard', request.url))
  }
  if (isContractorLogin && !isContractorUser && !isClientUser) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return response
}

export const config = {
  matcher: ['/portal/:path*', '/contractor/:path*', '/client/:path*'],
}
