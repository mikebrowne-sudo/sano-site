'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendJobReminder, sendTrainingReminder } from '@/lib/reminders'

export async function runJobReminders() {
  const supabase = createClient()
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Jobs scheduled for tomorrow, assigned, not finished
  const { data: jobs, error: queryErr } = await supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, contractor_id, status, last_reminder_sent_at, contractors ( full_name, email )')
    .eq('scheduled_date', tomorrowStr)
    .not('contractor_id', 'is', null)
    .neq('status', 'completed')
    .neq('status', 'invoiced')

  if (queryErr) {
    return { error: `Query failed: ${queryErr.message}`, sent: 0, failed: 0, total: 0 }
  }

  // Skip if already reminded today
  const eligible = (jobs ?? []).filter((j) => {
    return !j.last_reminder_sent_at || j.last_reminder_sent_at < todayStart
  })

  if (eligible.length === 0) {
    revalidatePath('/portal/alerts')
    return { sent: 0, failed: 0, total: 0 }
  }

  let sent = 0
  let failed = 0

  for (const job of eligible) {
    const contractor = job.contractors as unknown as { full_name: string; email: string } | null
    if (!contractor?.email) { failed++; continue }

    const ok = await sendJobReminder(contractor, {
      id: job.id,
      job_number: job.job_number,
      title: job.title,
      address: job.address,
      scheduled_date: job.scheduled_date,
      scheduled_time: job.scheduled_time,
    })

    if (ok) {
      await supabase.from('jobs').update({ last_reminder_sent_at: now.toISOString() }).eq('id', job.id)
      sent++
    } else {
      failed++
    }
  }

  revalidatePath('/portal/alerts')
  return { sent, failed, total: eligible.length }
}

export async function runTrainingReminders() {
  const supabase = createClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const { data: assignments, error: queryErr } = await supabase
    .from('worker_training_assignments')
    .select('id, due_date, last_reminder_sent_at, contractors ( full_name, email ), training_modules ( title )')
    .neq('status', 'completed')
    .not('due_date', 'is', null)
    .lt('due_date', today)

  if (queryErr) {
    return { error: `Query failed: ${queryErr.message}`, sent: 0, failed: 0, total: 0 }
  }

  const eligible = (assignments ?? []).filter((a) => {
    return !a.last_reminder_sent_at || a.last_reminder_sent_at < todayStart
  })

  if (eligible.length === 0) {
    revalidatePath('/portal/alerts')
    return { sent: 0, failed: 0, total: 0 }
  }

  let sent = 0
  let failed = 0

  for (const a of eligible) {
    const contractor = a.contractors as unknown as { full_name: string; email: string } | null
    const mod = a.training_modules as unknown as { title: string } | null
    if (!contractor?.email || !mod) { failed++; continue }

    const ok = await sendTrainingReminder(contractor, { title: mod.title, due_date: a.due_date })

    if (ok) {
      await supabase.from('worker_training_assignments').update({ last_reminder_sent_at: now.toISOString() }).eq('id', a.id)
      sent++
    } else {
      failed++
    }
  }

  revalidatePath('/portal/alerts')
  return { sent, failed, total: eligible.length }
}
