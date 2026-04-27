// Phase 5.5.5 — /client root redirects to the dashboard placeholder.
import { redirect } from 'next/navigation'

export default function ClientRoot() {
  redirect('/client/dashboard')
}
