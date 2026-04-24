import { Settings, SlidersHorizontal, ArchiveRestore, LayoutGrid, FileText, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <div>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Settings</h1>

      {isAdmin && (
        <>
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
