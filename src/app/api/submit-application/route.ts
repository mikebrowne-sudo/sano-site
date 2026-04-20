import { NextRequest, NextResponse } from 'next/server'
import { validateApplication } from '@/lib/applicationValidation'
import type { JobApplicationPayload } from '@/types/application'

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as JobApplicationPayload

    const errors = validateApplication(payload)
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      return NextResponse.json(
        { error: errors[errorKeys[0] as keyof typeof errors] ?? 'Invalid submission' },
        { status: 400 },
      )
    }

    console.log('[job-application] received', {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      suburb: payload.suburb,
      application_type: payload.application_type,
    })

    // TODO(later): insert into job_applications (Supabase), send Resend thank-you, notify SANO_NOTIFY_EMAIL.

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[job-application] error', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
