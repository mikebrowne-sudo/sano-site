// Guard for portal server actions that CHANGE data or send messages.
//
// The portal lets two kinds of login in: staff (Mike, Carol — admins) and the
// accountants (read-only finance access). Most write actions relied on RLS
// alone, and accountants can SELECT invoices — so e.g. "Send invoice" (which
// emails a PDF) worked for a read-only accountant. Every exported write/send
// action calls this first. Throws, so a non-admin call fails loudly and does
// nothing; admins are unaffected.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'

export async function assertAdminAction(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) throw new Error('Only Sano staff can do that.')
}
