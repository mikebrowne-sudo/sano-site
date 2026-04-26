import { NextRequest, NextResponse } from 'next/server'
import { validateApplication } from '@/lib/applicationValidation'
import { getServiceSupabase } from '@/lib/supabase-service'
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

    const supabase = getServiceSupabase()
    const { error: insertError } = await supabase.from('applicants').insert({
      status:                     'new',
      first_name:                 payload.first_name.trim(),
      last_name:                  payload.last_name.trim(),
      phone:                      payload.phone.trim(),
      email:                      payload.email.trim().toLowerCase(),
      suburb:                     payload.suburb.trim(),
      date_of_birth:              payload.date_of_birth,
      application_type:           payload.application_type,
      has_license:                payload.has_license,
      has_vehicle:                payload.has_vehicle,
      can_travel:                 payload.can_travel,
      has_experience:             payload.has_experience,
      experience_types:           payload.experience_types,
      experience_notes:           payload.experience_notes || null,
      has_equipment:              payload.has_equipment,
      available_days:             payload.available_days,
      preferred_hours:            payload.preferred_hours || null,
      travel_areas:               payload.travel_areas || null,
      independent_work:           payload.independent_work,
      work_rights_nz:             payload.work_rights_nz,
      has_insurance:              payload.has_insurance,
      willing_to_get_insurance:   payload.willing_to_get_insurance,
      why_join_sano:              payload.why_join_sano || null,
      confirm_truth:              payload.confirm_truth,
    })

    if (insertError) {
      console.error('[job-application] insert failed', insertError)
      // Don't leak DB error details to the public form. Return generic
      // 500 so the wizard's catch path shows a friendly retry message.
      return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[job-application] error', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
