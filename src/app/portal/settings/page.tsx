import { Settings, SlidersHorizontal, ArchiveRestore, LayoutGrid, FileText, Briefcase, MessageCircle, KeyRound, AlertTriangle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL
  const settings = isAdmin ? await loadWorkforceSettings(supabase) : null
  const cleanupOn = !!settings?.enable_cleanup_mode

  return (
    <div>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Settings</h1>

      {isAdmin && (
        <>
          <div className="mb-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-500 px-1">System / Operations</h2>
          </div>
          <Link
            href="/portal/settings/cleanup-mode"
            className="block bg-white rounded-xl border border-amber-200 shadow-sm p-5 mb-4 hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-amber-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sage-800 font-semibold text-sm">Cleanup mode</span>
                  <span className={
                    'inline-flex items-center text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ' +
                    (cleanupOn ? 'bg-amber-100 text-amber-800' : 'bg-sage-100 text-sage-700')
                  }>
                    {cleanupOn ? 'On' : 'Off'}
                  </span>
                </div>
                <div className="text-sage-600 text-xs mt-1">
                  Master gate for the operational lifecycle controls — Mark as test, Archive, Restore, and the bulk-action bar. Default OFF. Admin-only.
                </div>
              </div>
            </div>
          </Link>

          <div className="mb-2 mt-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-500 px-1">Configuration</h2>
          </div>
          <Link
            href="/portal/settings/pricing-engine"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <SlidersHorizontal size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Pricing engine</div>
                <div className="text-sage-600 text-xs mt-1">
                  Commercial margin tiers and multipliers. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/proposals"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Proposal settings</div>
                <div className="text-sage-600 text-xs mt-1">
                  Edit the editable parts of commercial proposals — executive summary, terms, footer, sections. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/jobs"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <Briefcase size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Job settings</div>
                <div className="text-sage-600 text-xs mt-1">
                  Payment defaults, review + invoicing rules, contractor notification method. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/display"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <LayoutGrid size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Display settings</div>
                <div className="text-sage-600 text-xs mt-1">
                  Choose which fields appear in Jobs and Quotes lists, and the default sort. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/portal-access"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <KeyRound size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Portal access</div>
                <div className="text-sage-600 text-xs mt-1">
                  Feature flags for the contractor + customer portals, and the auth email templates. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/notifications"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <MessageCircle size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Notifications</div>
                <div className="text-sage-600 text-xs mt-1">
                  Twilio SMS provider, channel + type toggles, message templates, test SMS panel. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/cleanup"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Cleanup</div>
                <div className="text-sage-600 text-xs mt-1">
                  Duplicate clients, unlinked invoices, manual jobs, and quote/job mismatches. Admin-only.
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/portal/settings/archive"
            className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <ArchiveRestore size={20} className="text-sage-500 mt-0.5" />
              <div>
                <div className="text-sage-800 font-semibold text-sm">Archived Records</div>
                <div className="text-sage-600 text-xs mt-1">
                  Restore archived quotes, invoices, and jobs. Admin-only.
                </div>
              </div>
            </div>
          </Link>
        </>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <Settings size={32} className="text-sage-200 mx-auto mb-3" />
        <p className="text-sage-600 text-sm">More account and portal settings coming soon.</p>
      </div>
    </div>
  )
}
