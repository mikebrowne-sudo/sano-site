import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const isContractor = path.startsWith('/contractor')
  const isContractorLogin = path === '/contractor/login'

  // ── Not logged in ───────────────────────────────────
  if (!user) {
    if (isPortal && !isPortalLogin && !isPortalCallback) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (isContractor && !isContractorLogin) {
      return NextResponse.redirect(new URL('/contractor/login', request.url))
    }
    return response
  }

  // ── Logged in — check if this user is a contractor ──
  const { data: contractorRecord } = await supabase
    .from('contractors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isContractorUser = !!contractorRecord

  // ── Contractor user hitting admin portal → redirect out ──
  if (isContractorUser && isPortal && !isPortalLogin) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }

  // ── Staff user hitting contractor portal → redirect out ──
  if (!isContractorUser && isContractor && !isContractorLogin) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Login page redirects for already-authenticated users ──
  if (isPortalLogin && !isContractorUser) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }
  if (isPortalLogin && isContractorUser) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }
  if (isContractorLogin && isContractorUser) {
    return NextResponse.redirect(new URL('/contractor/jobs', request.url))
  }
  if (isContractorLogin && !isContractorUser) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return response
}

export const config = {
  matcher: ['/portal/:path*', '/contractor/:path*'],
}
