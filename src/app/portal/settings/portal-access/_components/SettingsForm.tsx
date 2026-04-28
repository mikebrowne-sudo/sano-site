'use client'

// Phase 5.5.8 — Settings form (admin only).
//
// Single-page form: feature flags + email templates. Saves through
// updatePortalSettings; success/error feedback inline. No reload.

import { useState, useTransition } from 'react'
import { updatePortalSettings, type SettingsFormInput } from '../_actions'
import { Save } from 'lucide-react'

export function SettingsForm({ initial }: { initial: SettingsFormInput }) {
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState<SettingsFormInput>(initial)
  const [feedback, setFeedback] = useState<null | { kind: 'ok' | 'error'; text: string }>(null)

  function setField<K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) {
    setValues((s) => ({ ...s, [k]: v }))
    setFeedback(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const r = await updatePortalSettings(values)
      if ('error' in r) {
        setFeedback({ kind: 'error', text: r.error })
        return
      }
      setFeedback({ kind: 'ok', text: 'Settings saved.' })
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Section title="Feature flags" hint="Toggle whole portal surfaces on or off.">
        <Toggle
          label="Contractor portal"
          description="When off, contractor invites are blocked and the contractor portal is unavailable."
          checked={values.enable_contractor_portal}
          onChange={(v) => setField('enable_contractor_portal', v)}
        />
        <Toggle
          label="Customer portal"
          description="When off, /client/dashboard shows the unavailable state and customer invites are blocked."
          checked={values.enable_customer_portal}
          onChange={(v) => setField('enable_customer_portal', v)}
        />
        <Toggle
          label="PWA install prompt"
          description="Hide or show the Add-to-home-screen prompt inside the contractor portal."
          checked={values.enable_pwa_prompt}
          onChange={(v) => setField('enable_pwa_prompt', v)}
        />
      </Section>

      <Section
        title="Cleanup mode"
        hint="Enable test, archive, and bulk-action controls on the operational lists. Server-side actions are also gated — turning this off blocks the API even for admins."
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <Toggle
            label="Enable Cleanup Mode"
            description="OFF (default): system runs as a normal operational tool — no checkboxes, no Mark-as-test / Archive / Restore. ON: admin-only controls appear on the lists and detail pages, and bulk actions become available."
            checked={values.enable_cleanup_mode}
            onChange={(v) => setField('enable_cleanup_mode', v)}
          />
        </div>
      </Section>

      <Section title="Email templates" hint="Use {{name}} and {{link}} placeholders. Leave blank to use the default copy.">
        <Field label="Invite email — subject">
          <input
            type="text"
            value={values.invite_email_subject}
            onChange={(e) => setField('invite_email_subject', e.target.value)}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            placeholder="You’re invited to the Sano portal"
          />
        </Field>
        <Field label="Invite email — body">
          <textarea
            value={values.invite_email_body_template}
            onChange={(e) => setField('invite_email_body_template', e.target.value)}
            rows={6}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 font-mono focus:outline-none focus:ring-2 focus:ring-sage-300"
            placeholder="Hi {{name}}, you’ve been invited… {{link}}"
          />
        </Field>
        <Field label="Reset email — subject">
          <input
            type="text"
            value={values.reset_email_subject}
            onChange={(e) => setField('reset_email_subject', e.target.value)}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            placeholder="Reset your Sano password"
          />
        </Field>
        <Field label="Reset email — body">
          <textarea
            value={values.reset_email_body_template}
            onChange={(e) => setField('reset_email_body_template', e.target.value)}
            rows={6}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 font-mono focus:outline-none focus:ring-2 focus:ring-sage-300"
            placeholder="Hi {{name}}, click here to reset… {{link}}"
          />
        </Field>
      </Section>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          <Save size={16} />
          {pending ? 'Saving…' : 'Save settings'}
        </button>
        {feedback?.kind === 'ok' && (
          <span className="text-sm text-emerald-700">{feedback.text}</span>
        )}
        {feedback?.kind === 'error' && (
          <span className="text-sm text-red-600">{feedback.text}</span>
        )}
      </div>
    </form>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-sage-800">{title}</h2>
        {hint && <p className="text-xs text-sage-500 mt-0.5">{hint}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          (checked ? 'bg-sage-500' : 'bg-sage-200') +
          ' relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors mt-0.5'
        }
      >
        <span
          className={
            (checked ? 'translate-x-5' : 'translate-x-1') +
            ' inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
          }
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-sage-800">{label}</span>
        <span className="block text-xs text-sage-500 leading-relaxed">{description}</span>
      </span>
    </label>
  )
}
