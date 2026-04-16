'use client'

import { useState, useTransition } from 'react'
import { createClientAction, updateClientAction } from '../_actions'
import clsx from 'clsx'

interface ClientData {
  id?: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  service_address: string | null
  billing_address: string | null
  billing_same_as_service: boolean
  notes: string | null
}

export function ClientForm({ client }: { client?: ClientData }) {
  const isEdit = !!client?.id

  const [name, setName] = useState(client?.name ?? '')
  const [companyName, setCompanyName] = useState(client?.company_name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [serviceAddress, setServiceAddress] = useState(client?.service_address ?? '')
  const [billingAddress, setBillingAddress] = useState(client?.billing_address ?? '')
  const [billingSame, setBillingSame] = useState(client?.billing_same_as_service ?? true)
  const [notes, setNotes] = useState(client?.notes ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!name.trim()) {
      setError('Client name is required.')
      return
    }

    const input = {
      name: name.trim(),
      company_name: companyName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      service_address: serviceAddress.trim() || undefined,
      billing_address: billingAddress.trim() || undefined,
      billing_same_as_service: billingSame,
      notes: notes.trim() || undefined,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateClientAction(client!.id!, input)
        : await createClientAction(input)

      if (result?.error) {
        setError(result.error)
      } else if (isEdit) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      {/* ── Contact ──────────────────────────────── */}
      <Section title="Contact">
        <Field label="Name" required value={name} onChange={setName} />
        <Field label="Company name" value={companyName} onChange={setCompanyName} className="mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
        </div>
      </Section>

      {/* ── Addresses ────────────────────────────── */}
      <Section title="Addresses">
        <Field label="Service address" value={serviceAddress} onChange={setServiceAddress} />

        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={billingSame}
            onClick={() => setBillingSame(!billingSame)}
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              billingSame ? 'bg-sage-500' : 'bg-gray-300',
            )}
          >
            <span
              className={clsx(
                'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
                billingSame ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
          <span className="text-sm font-medium text-sage-800">Billing same as service</span>
        </label>

        {!billingSame && (
          <Field label="Billing address" value={billingAddress} onChange={setBillingAddress} className="mt-4" />
        )}
      </Section>

      {/* ── Notes ────────────────────────────────── */}
      <Section title="Notes">
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra details about this client…"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
        />
      </Section>

      {/* ── Error / Success + Submit ─────────────── */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}
      {saved && (
        <p className="text-emerald-700 text-sm bg-emerald-50 rounded-lg px-4 py-3">Client saved.</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Client'}
        </button>
        <a href="/portal/clients" className="text-sm text-sage-600 hover:text-sage-800 transition-colors">
          {isEdit ? 'Back to clients' : 'Cancel'}
        </a>
      </div>
    </form>
  )
}

// ── Form primitives ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  required,
  className,
  value,
  onChange,
  ...rest
}: {
  label: string
  required?: boolean
  className?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        {...rest}
      />
    </label>
  )
}
