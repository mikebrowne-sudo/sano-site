'use server'

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

interface SendInvoiceInput {
  invoice_id: string
  invoice_number: string
  to: string
  cc?: string[]
  subject: string
  message: string
  print_url: string
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendInvoiceEmail(input: SendInvoiceInput) {
  if (!input.to.trim()) {
    return { error: 'Recipient email is required.' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = `
    <p>${esc(input.message).replace(/\n/g, '<br>')}</p>
    <p><a href="${esc(input.print_url)}" style="display:inline-block;padding:10px 20px;background:#076653;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View Invoice</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  const ccList = (input.cc ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.toLowerCase() !== input.to.trim().toLowerCase())

  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    to: input.to.trim(),
    ...(ccList.length > 0 ? { cc: ccList } : {}),
    subject: input.subject,
    html,
  })

  if (emailErr) {
    return { error: `Failed to send email: ${emailErr.message}` }
  }

  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: invoice } = await supabase
    .from('invoices')
    .select('date_issued')
    .eq('id', input.invoice_id)
    .single()

  await supabase
    .from('invoices')
    .update({
      status: 'sent',
      date_issued: invoice?.date_issued || today,
    })
    .eq('id', input.invoice_id)

  revalidatePath(`/portal/invoices/${input.invoice_id}`)
  revalidatePath('/portal/invoices')
  return { success: true }
}

export async function markInvoicePaid(invoiceId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', date_paid: today })
    .eq('id', invoiceId)

  if (error) {
    return { error: `Failed to update invoice: ${error.message}` }
  }

  revalidatePath(`/portal/invoices/${invoiceId}`)
  revalidatePath('/portal/invoices')
  return { success: true }
}
