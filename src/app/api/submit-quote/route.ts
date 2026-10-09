import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isHoneypotTripped, isThrottled, overLength } from '@/lib/form-guard'
import { createServerClient } from '@/lib/supabase'
import { sendQuoteConfirmation, sendQuoteNotification } from '@/lib/resend'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, service, postcode, preferredDate, message } = body

  // Abuse guards (lib/form-guard). A bot that fills the hidden field gets a
  // normal-looking success and nothing is saved or sent.
  if (isHoneypotTripped(body)) return NextResponse.json({ success: true }, { status: 200 })
  if (overLength(body ?? {}, { name: 120, email: 200, phone: 40, service: 200, postcode: 120, message: 4000 })) {
    return NextResponse.json({ error: 'Some of your answers are too long. Please shorten them and try again.' }, { status: 400 })
  }

  // Validate required fields
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!email?.trim() || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!service?.trim()) {
    return NextResponse.json({ error: 'Service is required' }, { status: 400 })
  }
  if (!postcode?.trim()) {
    return NextResponse.json({ error: 'Postcode is required' }, { status: 400 })
  }

  if (await isThrottled(getServiceSupabase, { table: 'quote_requests', emailColumn: 'email', email, perEmail: 3, overall: 30, minutes: 60 })) {
    return NextResponse.json({ error: 'We’ve already received your request. If it’s urgent, please call us on 0800 726 686.' }, { status: 429 })
  }

  // Write to Supabase
  const supabase = createServerClient()
  const { error: dbError } = await supabase.from('quote_requests').insert({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    service: service.trim(),
    postcode: postcode.trim(),
    message: message?.trim() || null,
    preferred_date: preferredDate || null,
  })

  if (dbError) {
    console.error('Supabase insert error:', dbError)
    return NextResponse.json({ error: 'Failed to save request' }, { status: 500 })
  }

  // Send emails — must be awaited on serverless (runtime shuts down on response)
  const emailParams = { name, email, phone: phone || '', service, postcode, preferredDate: preferredDate || '', message: message || '' }
  let emailError: string | null = null
  try {
    await Promise.all([
      sendQuoteConfirmation(emailParams),
      sendQuoteNotification(emailParams),
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Email send error:', msg)
    emailError = msg
  }

  return NextResponse.json({ success: true, emailError }, { status: 200 })
}
