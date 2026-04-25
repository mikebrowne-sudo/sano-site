'use client'

// Phase H — notification settings form.
//
// One client component renders the four sections from the brief:
//   A. Provider status (Twilio env presence)
//   B. Channel toggles
//   C. Type toggles
//   D. Template editor + Test SMS panel

import { useState, useTransition } from 'react'
import {
  saveNotificationSettings,
  saveNotificationTemplate,
  sendTestSms,
} from '../_actions'
import type { NotificationSettings } from '@/lib/notifications/settings'

type Channel = 'sms' | 'email'
type Audience = 'contractor' | 'customer' | 'staff'

interface TemplateRow {
  type: string
  channel: Channel
  audience: Audience
  body: string
  enabled: boolean
}

interface TypeMeta {
  type: string
  audience: Audience
  label: string
}

interface TwilioStatus {
  configured: boolean
  has_account_sid: boolean
  has_auth_token: boolean
  has_from_number: boolean
}

export function NotificationSettingsForm({
  initialSettings,
  twilioStatus,
  templates,
  notificationTypes,
  placeholders,
}: {
  initialSettings: NotificationSettings
  twilioStatus: TwilioStatus
  templates: TemplateRow[]
  notificationTypes: TypeMeta[]
  placeholders: string[]
}) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  function setProvider<K extends keyof NotificationSettings['provider']>(k: K, v: NotificationSettings['provider'][K]) {
    setSettings({ ...settings, provider: { ...settings.provider, [k]: v } })
  }
  function setChannel<K extends keyof NotificationSettings['channels']>(k: K, v: NotificationSettings['channels'][K]) {
    setSettings({ ...settings, channels: { ...settings.channels, [k]: v } })
  }
  function setType(audience: Audience, type: string, enabled: boolean) {
    setSettings({
      ...settings,
      types: { ...settings.types, [`${audience}.${type}`]: enabled },
    })
  }

  function flash(msg: string) {
    setSaved(msg)
    window.setTimeout(() => setSaved(null), 3000)
  }

  function handleSaveSettings() {
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const result = await saveNotificationSettings(settings)
      if ('error' in result) { setError(result.error); return }
      setSettings(result.settings)
      flash('Settings saved.')
    })
  }

  return (
    <div className="space-y-8 max-w-4xl">

      {/* A. Provider status */}
      <section className="bg-white rounded-xl border border-sage-100 p-6 md:p-8">
        <h2 className="text-base font-semibold text-sage-800 mb-1">Provider</h2>
        <p className="text-xs text-sage-500 mb-4">
          Twilio SMS. Auth token is server-only — values are never shown here.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <StatusPill ok={twilioStatus.has_account_sid} label="TWILIO_ACCOUNT_SID" />
          <StatusPill ok={twilioStatus.has_auth_token}  label="TWILIO_AUTH_TOKEN"  />
          <StatusPill ok={twilioStatus.has_from_number} label="TWILIO_FROM_NUMBER" />
        </div>

        <Toggle
          label="SMS enabled globally"
          hint="Master switch. When off, every SMS attempt is skipped (and logged)."
          checked={settings.provider.sms_enabled}
          onChange={(v) => setProvider('sms_enabled', v)}
        />
        {!twilioStatus.configured && settings.provider.sms_enabled && (
          <p className="text-xs text-amber-700 mt-2">
            Twilio is not fully configured yet. SMS attempts will skip until env vars are set.
          </p>
        )}
      </section>

      {/* B. Channel toggles */}
      <section className="bg-white rounded-xl border border-sage-100 p-6 md:p-8 space-y-4">
        <h2 className="text-base font-semibold text-sage-800 mb-1">Channels</h2>
        <Toggle label="Contractor SMS"   checked={settings.channels.contractor_sms_enabled} onChange={(v) => setChannel('contractor_sms_enabled', v)} />
        <Toggle label="Customer SMS"     checked={settings.channels.customer_sms_enabled}   onChange={(v) => setChannel('customer_sms_enabled', v)}   />
        <Toggle label="Email enabled"    hint="Existing assignment email always sends; this gates future email-channel notification types." checked={settings.channels.email_enabled} onChange={(v) => setChannel('email_enabled', v)} />
        <Toggle label="Manual sends"     hint="Allow admins to fire one-off SMS from job pages." checked={settings.channels.manual_enabled} onChange={(v) => setChannel('manual_enabled', v)} />
        <Toggle label="Automated sends"  hint="Allow workflow triggers like Assign + Notify to fire SMS." checked={settings.channels.automated_enabled} onChange={(v) => setChannel('automated_enabled', v)} />
      </section>

      {/* C. Type toggles */}
      <section className="bg-white rounded-xl border border-sage-100 p-6 md:p-8 space-y-4">
        <h2 className="text-base font-semibold text-sage-800 mb-1">Notification types</h2>
        <p className="text-xs text-sage-500 mb-4">
          Disabled types short-circuit before the template is loaded.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <TypeGroup
            heading="Contractor"
            items={notificationTypes.filter((t) => t.audience === 'contractor')}
            settings={settings}
            onToggle={(type, v) => setType('contractor', type, v)}
          />
          <TypeGroup
            heading="Customer"
            items={notificationTypes.filter((t) => t.audience === 'customer')}
            settings={settings}
            onToggle={(type, v) => setType('customer', type, v)}
          />
        </div>
      </section>

      {/* Save settings */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
        {saved && <span className="text-xs text-emerald-700">{saved}</span>}
      </div>

      {/* D. Templates */}
      <section className="bg-white rounded-xl border border-sage-100 p-6 md:p-8">
        <h2 className="text-base font-semibold text-sage-800 mb-1">Templates</h2>
        <p className="text-xs text-sage-500 mb-4">
          Use placeholders below — they expand at send time.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {placeholders.map((p) => (
            <code key={p} className="text-[11px] bg-sage-50 border border-sage-100 text-sage-700 px-1.5 py-0.5 rounded">
              {p}
            </code>
          ))}
        </div>

        <div className="space-y-5">
          {templates.length === 0 ? (
            <p className="text-sm text-sage-500">No templates yet. Run the Phase H migration to seed defaults.</p>
          ) : (
            templates.map((t) => (
              <TemplateEditor key={`${t.audience}.${t.type}.${t.channel}`} initial={t} onSavedFlash={flash} />
            ))
          )}
        </div>
      </section>

      {/* Test SMS panel */}
      <TestSmsPanel onSavedFlash={flash} />
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={
        ok
          ? 'flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
          : 'flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'
      }
    >
      <span className={ok ? 'inline-block w-2 h-2 rounded-full bg-emerald-500' : 'inline-block w-2 h-2 rounded-full bg-amber-500'} />
      <code className="font-mono">{label}</code>
      <span className="ml-auto font-semibold">{ok ? 'configured' : 'missing'}</span>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
      />
      <span>
        <span className="block text-sm font-medium text-sage-800">{label}</span>
        {hint && <span className="block text-[11px] text-sage-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function TypeGroup({
  heading,
  items,
  settings,
  onToggle,
}: {
  heading: string
  items: TypeMeta[]
  settings: NotificationSettings
  onToggle: (type: string, v: boolean) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-sage-500 mb-2">{heading}</h3>
      <div className="space-y-2">
        {items.map((it) => {
          const key = `${it.audience}.${it.type}`
          return (
            <Toggle
              key={key}
              label={it.label}
              checked={settings.types[key] !== false}
              onChange={(v) => onToggle(it.type, v)}
            />
          )
        })}
      </div>
    </div>
  )
}

function TemplateEditor({
  initial,
  onSavedFlash,
}: {
  initial: TemplateRow
  onSavedFlash: (msg: string) => void
}) {
  const [body, setBody] = useState(initial.body)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const charCount = body.length
  const overSegment = charCount > 160

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveNotificationTemplate({
        type: initial.type,
        channel: initial.channel,
        audience: initial.audience,
        body,
        enabled,
      })
      if ('error' in result) { setError(result.error); return }
      onSavedFlash(`${initial.audience} · ${initial.type} (${initial.channel}) saved.`)
    })
  }

  return (
    <div className="rounded-lg border border-sage-100 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-sage-500">{initial.audience}</span>
        <span className="text-sm font-semibold text-sage-800">{initial.type}</span>
        <span className="text-xs text-sage-500">· {initial.channel}</span>
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-sage-600">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
          />
          Enabled
        </label>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm font-mono"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-sage-300 text-sage-700 font-medium px-3 py-1.5 rounded-md text-xs hover:bg-sage-50 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save template'}
        </button>
        <span className={overSegment ? 'text-[11px] text-amber-700' : 'text-[11px] text-sage-500'}>
          {charCount} chars{overSegment ? ' — over 160; will use multiple SMS segments' : ''}
        </span>
        {error && <span className="ml-auto text-[11px] text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function TestSmsPanel({ onSavedFlash }: { onSavedFlash: (msg: string) => void }) {
  const [to, setTo] = useState('')
  const [body, setBody] = useState('Hello from Sano portal — Twilio test.')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function send() {
    setError(null)
    startTransition(async () => {
      const result = await sendTestSms({ to, body })
      if ('error' in result) { setError(result.error); return }
      onSavedFlash('Test SMS sent.')
    })
  }

  return (
    <section className="bg-white rounded-xl border border-sage-100 p-6 md:p-8 space-y-4">
      <h2 className="text-base font-semibold text-sage-800">Test SMS</h2>
      <p className="text-xs text-sage-500">
        Bypasses channel + type toggles. Still requires SMS enabled and Twilio configured.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Phone number</span>
          <input
            type="tel"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+64 21 …"
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send test SMS'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </section>
  )
}
