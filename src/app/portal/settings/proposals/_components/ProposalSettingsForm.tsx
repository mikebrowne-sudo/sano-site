'use client'

// Proposal settings form. One client component, five sections (Content,
// Terms, Commercial, Footer, Sections). Pure React state; on save we
// hand the whole ProposalSettings object to the server action, which
// re-runs validation and persists.

import { useState, useTransition } from 'react'
import {
  type ProposalSettings,
  type ProposalSettingsContent,
  type ProposalSettingsTerms,
  type ProposalSettingsCommercial,
  type ProposalSettingsFooter,
  type ProposalSettingsSections,
} from '@/lib/proposals/proposal-settings'
import { saveProposalSettings, resetProposalSettings } from '../_actions'
import { Save, RotateCcw, Check, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type Banner = { kind: 'ok' | 'error'; text: string } | null

export function ProposalSettingsForm({
  initialSettings,
}: {
  initialSettings: ProposalSettings
}) {
  const [settings, setSettings] = useState<ProposalSettings>(initialSettings)
  const [banner, setBanner] = useState<Banner>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveProposalSettings(settings)
      if ('error' in result) {
        setBanner({ kind: 'error', text: result.error })
      } else {
        setSettings(result.settings)
        setBanner({ kind: 'ok', text: 'Proposal settings saved.' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset proposal settings to the built-in defaults?')) return
    setBanner(null)
    startTransition(async () => {
      const result = await resetProposalSettings()
      if ('error' in result) {
        setBanner({ kind: 'error', text: result.error })
      } else {
        setSettings(result.settings)
        setBanner({ kind: 'ok', text: 'Proposal settings reset to defaults.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-3 text-sm border',
            banner.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          )}
        >
          {banner.kind === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}
          {banner.text}
        </div>
      )}

      {/* Content */}
      <Section title="Content" description="Default text shown on the proposal when the quote does not provide its own.">
        <Textarea
          label="Executive summary (default)"
          rows={5}
          value={settings.content.executive_summary_default}
          onChange={(v) => setContent('executive_summary_default', v)}
        />
        <Textarea
          label="Pricing note"
          rows={3}
          value={settings.content.pricing_note}
          onChange={(v) => setContent('pricing_note', v)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Text label='"Prepared for" label'  value={settings.content.prepared_for_label}  onChange={(v) => setContent('prepared_for_label', v)} />
          <Text label='"Site address" label'  value={settings.content.site_address_label}  onChange={(v) => setContent('site_address_label', v)} />
          <Text label='"Date" label'          value={settings.content.date_label}          onChange={(v) => setContent('date_label', v)} />
          <Text label='"Reference" label'     value={settings.content.reference_label}     onChange={(v) => setContent('reference_label', v)} />
        </div>
        <Textarea
          label="Acceptance wording"
          help="Persisted now; renders on the Acceptance page when that's added in a future phase."
          rows={3}
          value={settings.content.acceptance_wording}
          onChange={(v) => setContent('acceptance_wording', v)}
        />
      </Section>

      {/* Terms */}
      <Section title="Terms & legal" description="Terms HTML and the supporting scalar values referenced in proposals.">
        <Textarea
          label="Terms & conditions (HTML)"
          help="Safe HTML. Use <h3>, <p>, <ul>/<li>. Renders on the Terms page when no quote-specific terms are present."
          rows={10}
          mono
          value={settings.terms.terms_and_conditions_html}
          onChange={(v) => setTerms('terms_and_conditions_html', v)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberInput label="Default contract term (months)"  value={settings.terms.default_contract_term_months} min={0} max={120} onChange={(v) => setTerms('default_contract_term_months', v)} />
          <NumberInput label="Default payment term (days)"      value={settings.terms.default_payment_term_days}    min={0} max={365} onChange={(v) => setTerms('default_payment_term_days', v)} />
          <NumberInput label="Default notice period (days)"     value={settings.terms.default_notice_period_days}   min={0} max={365} onChange={(v) => setTerms('default_notice_period_days', v)} />
        </div>
        <Textarea
          label="Liability clause"
          rows={3}
          value={settings.terms.liability_clause}
          onChange={(v) => setTerms('liability_clause', v)}
        />
      </Section>

      {/* Commercial */}
      <Section title="Commercial defaults" description="Defaults used when a quote does not specify them. Pricing suffix text appears on the pricing card.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberInput label="Proposal validity (days)"     value={settings.commercial.proposal_validity_days} min={0} max={365} onChange={(v) => setCommercial('proposal_validity_days', v)} />
          <Text        label="GST suffix text"               value={settings.commercial.gst_suffix_text}         onChange={(v) => setCommercial('gst_suffix_text', v)} />
          <Text        label="Monthly fee suffix text"       value={settings.commercial.monthly_fee_suffix_text} onChange={(v) => setCommercial('monthly_fee_suffix_text', v)} />
        </div>
      </Section>

      {/* Footer */}
      <Section title="Footer" description="Contact triplet shown on every proposal page.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Text label="Email"   value={settings.footer.footer_email}   onChange={(v) => setFooter('footer_email', v)} />
          <Text label="Website" value={settings.footer.footer_website} onChange={(v) => setFooter('footer_website', v)} />
          <Text label="Phone"   value={settings.footer.footer_phone}   onChange={(v) => setFooter('footer_phone', v)} />
        </div>
      </Section>

      {/* Sections */}
      <Section title="Section visibility" description="Toggle whether each section is rendered. Acceptance page lands in a future phase; the toggle persists for now.">
        <div className="space-y-3">
          <Toggle label="Show executive summary" value={settings.sections.show_executive_summary} onChange={(v) => setSection('show_executive_summary', v)} />
          <Toggle label="Show terms & conditions" value={settings.sections.show_terms} onChange={(v) => setSection('show_terms', v)} />
          <Toggle
            label="Show acceptance"
            value={settings.sections.show_acceptance}
            onChange={(v) => setSection('show_acceptance', v)}
            disabledNote="Acceptance page is not yet rendered. Setting persists for the future page."
          />
        </div>
      </Section>

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )

  // ── Tiny setters per section ──────────────────────────────────
  function setContent<K extends keyof ProposalSettingsContent>(k: K, v: ProposalSettingsContent[K]) {
    setSettings((s) => ({ ...s, content: { ...s.content, [k]: v } }))
  }
  function setTerms<K extends keyof ProposalSettingsTerms>(k: K, v: ProposalSettingsTerms[K]) {
    setSettings((s) => ({ ...s, terms: { ...s.terms, [k]: v } }))
  }
  function setCommercial<K extends keyof ProposalSettingsCommercial>(k: K, v: ProposalSettingsCommercial[K]) {
    setSettings((s) => ({ ...s, commercial: { ...s.commercial, [k]: v } }))
  }
  function setFooter<K extends keyof ProposalSettingsFooter>(k: K, v: ProposalSettingsFooter[K]) {
    setSettings((s) => ({ ...s, footer: { ...s.footer, [k]: v } }))
  }
  function setSection<K extends keyof ProposalSettingsSections>(k: K, v: ProposalSettingsSections[K]) {
    setSettings((s) => ({ ...s, sections: { ...s.sections, [k]: v } }))
  }
}

// ── Section + inputs ──────────────────────────────────────────────

function Section({
  title, description, children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-sage-800">{title}</h2>
        {description && <p className="text-xs text-sage-500 mt-1">{description}</p>}
      </header>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  )
}

function Text({ label, value, onChange, help }: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1">{label}</span>
      {help && <p className="text-xs text-sage-500 mb-1.5">{help}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
      />
    </label>
  )
}

function Textarea({ label, value, onChange, rows = 4, mono, help }: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  mono?: boolean
  help?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1">{label}</span>
      {help && <p className="text-xs text-sage-500 mb-1.5">{help}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={clsx(
          'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-y',
          mono && 'font-mono text-xs leading-relaxed',
        )}
      />
    </label>
  )
}

function NumberInput({ label, value, onChange, min, max, help }: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  help?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1">{label}</span>
      {help && <p className="text-xs text-sage-500 mb-1.5">{help}</p>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) ? n : 0)
        }}
        min={min}
        max={max}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-sage-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-sage-500"
      />
    </label>
  )
}

function Toggle({ label, value, onChange, disabledNote }: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  disabledNote?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors mt-0.5',
          value ? 'bg-sage-500' : 'bg-gray-300',
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
            value ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      <div>
        <span className="block text-sm font-medium text-sage-800">{label}</span>
        {disabledNote && (
          <span className="block text-xs text-sage-500 mt-0.5">{disabledNote}</span>
        )}
      </div>
    </div>
  )
}
