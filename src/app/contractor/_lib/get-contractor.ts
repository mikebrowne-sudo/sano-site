import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function getContractor() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/contractor/login')
  }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, full_name, hourly_rate')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!contractor) {
    redirect('/contractor/login')
  }

  return { supabase, contractor }
}
