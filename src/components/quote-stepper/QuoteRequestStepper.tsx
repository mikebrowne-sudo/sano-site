'use client'

// Public-side guided quote request flow.
//
// Renders inside the right-hand panel of /contact and replaces the
// legacy single-page QuoteForm. Layout (left static info + right
// stepper) is owned by the contact page; this component does NOT
// affect the left side.
//
// Submits to the existing POST /api/submit-quote endpoint, mapping
// the richer multi-step state into the existing payload shape:
//   - service           ← composed "Home — Deep clean" / "Commercial — Office" label
//   - postcode          ← suburb (existing field, name kept for compatibility)
//   - preferredDate     ← form.preferred_date
//   - message           ← multi-line structured summary (address, beds/baths,
//                          property type, frequency, extras, notes)
// No backend / DB changes required.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

type ServiceType = 'home' | 'commercial'
type HomeCleanType = 'regular' | 'one_off' | 'deep' | 'move_out' | 'unsure'
type CommercialSpaceType = 'office' | 'retail' | 'medical' | 'industrial' | 'other'
type Frequency = 'one_off' | 'weekly' | 'fortnightly' | 'monthly'
type Extra = 'oven' | 'windows' | 'carpet' | 'deep_upgrade'

interface FormData {
  service_type: ServiceType | ''
  home_clean_type: HomeCleanType | ''
  commercial_space_type: CommercialSpaceType | ''
  address: string
  suburb: string
  bedrooms: string
  bathrooms: string
  property_type: string
  approx_size: string
  commercial_frequency: string
  preferred_date: string
  frequency: Frequency | ''
  extras: Extra[]
  notes: string
  name: string
  email: string
  phone: string
}

const HOME_CLEAN_OPTIONS: { value: HomeCleanType; label: string; helper: string }[] = [
  { value: 'regular',  label: 'Regular clean',  helper: 'Ongoing cleaning to keep your home in great shape' },
  { value: 'one_off',  label: 'One-off clean',  helper: 'A general clean without ongoing visits' },
  { value: 'deep',     label: 'Deep clean',     helper: 'A more detailed clean for homes that need extra attention' },
  { value: 'move_out', label: 'Move-out clean', helper: 'A full clean when moving out or handing over a property' },
  { value: 'unsure',   label: 'Not sure',       helper: "We can help figure out what's best" },
]

const COMMERCIAL_SPACE_OPTIONS: { value: CommercialSpaceType; label: string; helper: string }[] = [
  { value: 'office',     label: 'Office',     helper: 'Workplaces, coworking, professional services' },
  { value: 'retail',     label: 'Retail',     helper: 'Shops, showrooms, customer-facing spaces' },
  { value: 'medical',    label: 'Medical',    helper: 'Clinics, dental, allied health' },
  { value: 'industrial', label: 'Industrial', helper: 'Warehouses, workshops, light industrial' },
  { value: 'other',      label: 'Other',      helper: 'Tell us about your space' },
]

const PROPERTY_TYPE_OPTIONS = [
  'House',
  'Apartment / Townhouse',
  'Studio',
  'Other',
]

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'one_off',     label: 'One-off' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly',     label: 'Monthly' },
]

const COMMERCIAL_FREQUENCY_OPTIONS = [
  'One-off',
  'Weekly',
  'Multiple times per week',
  'Fortnightly',
  'Monthly',
  'Not sure',
]

const EXTRA_OPTIONS: { value: Extra; label: string; helper: string }[] = [
  { value: 'oven',         label: 'Oven clean',          helper: 'Add a thorough oven clean' },
  { value: 'windows',      label: 'Windows',             helper: 'Interior or accessible exterior windows' },
  { value: 'carpet',       label: 'Carpet cleaning',     helper: 'Steam / extraction carpet clean' },
  { value: 'deep_upgrade', label: 'Deep clean upgrade',  helper: 'Add a deep clean to a regular booking' },
]

const TOTAL_STEPS = 8

// Map index → friendly title (used by the progress indicator).
const STEP_TITLES = [
  'Service type',
  'Type of clean',
  'Location',
  'Details',
  'Schedule',
  'Extras',
  'Contact',
  'All done',
]

function emptyForm(initialService: string): FormData {
  return {
    service_type: '',
    home_clean_type: '',
    commercial_space_type: '',
    address: '',
    suburb: '',
    bedrooms: '',
    bathrooms: '',
    property_type: '',
    approx_size: '',
    commercial_frequency: '',
    preferred_date: '',
    frequency: '',
    extras: [],
    notes: '',
    name: '',
    email: '',
    phone: '',
    // initialService allows ?service=... query string to seed the flow
    // (used by service-page CTAs to pre-select). We don't currently
    // use this for the new stepper but reserve the hook for parity
    // with the legacy QuoteForm.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ _initialService: initialService } as any),
  }
}

function composeServiceLabel(f: FormData): string {
  if (f.service_type === 'home') {
    const map: Record<HomeCleanType, string> = {
      regular: 'Regular clean',
      one_off: 'One-off clean',
      deep: 'Deep clean',
      move_out: 'Move-out clean',
      unsure: 'Not sure',
    }
    return `Home — ${map[f.home_clean_type as HomeCleanType] ?? ''}`
  }
  if (f.service_type === 'commercial') {
    const map: Record<CommercialSpaceType, string> = {
      office: 'Office',
      retail: 'Retail',
      medical: 'Medical',
      industrial: 'Industrial',
      other: 'Other',
    }
    return `Commercial — ${map[f.commercial_space_type as CommercialSpaceType] ?? ''}`
  }
  return ''
}

function composeMessage(f: FormData): string {
  const lines: string[] = []
  if (f.address) lines.push(`Address: ${f.address}`)
  if (f.service_type === 'home') {
    if (f.bedrooms)      lines.push(`Bedrooms: ${f.bedrooms}`)
    if (f.bathrooms)     lines.push(`Bathrooms: ${f.bathrooms}`)
    if (f.property_type) lines.push(`Property type: ${f.property_type}`)
    if (f.frequency)     lines.push(`Frequency: ${f.frequency}`)
  } else if (f.service_type === 'commercial') {
    if (f.approx_size)          lines.push(`Approx size: ${f.approx_size}`)
    if (f.commercial_frequency) lines.push(`Frequency: ${f.commercial_frequency}`)
  }
  if (f.extras.length) {
    const labels: Record<Extra, string> = {
      oven: 'Oven clean',
      windows: 'Windows',
      carpet: 'Carpet cleaning',
      deep_upgrade: 'Deep clean upgrade',
    }
    lines.push(`Extras: ${f.extras.map((e) => labels[e]).join(', ')}`)
  }
  if (f.notes) lines.push(`Notes:\n${f.notes}`)
  return lines.join('\n')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── UI atoms ──────────────────────────────────────────────────────

function StepProgress({ current, total, title }: { current: number; total: number; title: string }) {
  const pct = Math.min(100, ((current + 1) / total) * 100)
  const stepNumber = Math.min(current + 1, total)
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-sage-700 mb-2">
        Step {stepNumber} of {total}
        <span className="text-gray-400 mx-1.5">·</span>
        <span className="text-gray-500 font-normal">{title}</span>
      </p>
      <div className="h-1 bg-sage-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sage-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function OptionCard({
  active, onClick, label, helper, disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  helper?: string
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !active ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`relative w-full text-left rounded-2xl border-2 p-4 pr-10 transition-[border-color,background-color,box-shadow] duration-200 ${
        active
          ? 'border-sage-500 bg-sage-50 shadow-md'
          : 'border-sage-100 bg-white hover:border-sage-300 hover:shadow-sm'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <p className="font-semibold text-sm text-sage-800">{label}</p>
      {helper && <p className="text-gray-500 text-xs mt-1 leading-relaxed">{helper}</p>}
      <SelectedCheck active={active} />
    </motion.button>
  )
}

function SelectedCheck({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute right-3 top-3 inline-flex w-5 h-5 items-center justify-center rounded-full transition-all duration-200 ${
        active ? 'bg-sage-500 scale-100 opacity-100' : 'bg-transparent scale-75 opacity-0'
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function CheckboxCard({
  checked, onToggle, label, helper,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  helper?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={!checked ? { y: -2 } : undefined}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-[border-color,background-color,box-shadow] duration-200 ${
        checked
          ? 'border-sage-500 bg-sage-50 shadow-md'
          : 'border-sage-100 bg-white hover:border-sage-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center transition-colors duration-200 ${
            checked ? 'bg-sage-500 border-sage-500' : 'border-sage-200 bg-white'
          }`}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-sage-800">{label}</p>
          {helper && <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{helper}</p>}
        </div>
      </div>
    </motion.button>
  )
}

// ── Address autocomplete (Mapbox) ─────────────────────────────────
//
// Reuses the existing repo pattern from src/app/portal/_components/
// AddressField.tsx — same Mapbox endpoint, same NEXT_PUBLIC_MAPBOX_TOKEN
// env var, same NZ filter. Re-implemented inline here to match the
// stepper's input styling (rounded-xl, sage-100 borders) without
// touching the portal component.
//
// Suburb extraction: when a user picks a suggestion, we try to derive
// the suburb from Mapbox's `context` array (locality preferred,
// neighborhood as fallback) and call onSuburbResolved if the field
// is currently empty. The user can still override manually.
//
// Graceful degradation: if NEXT_PUBLIC_MAPBOX_TOKEN is missing, the
// component renders as a plain text input — typing still works,
// suggestions are simply never fetched.

interface MapboxFeature {
  id: string
  place_name: string
  text?: string
  context?: { id: string; text: string }[]
}

const MAPBOX_ENDPOINT = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

function suburbFromFeature(f: MapboxFeature): string {
  const ctx = f.context ?? []
  const locality = ctx.find((c) => c.id.startsWith('locality.'))?.text
  if (locality) return locality
  const neighborhood = ctx.find((c) => c.id.startsWith('neighborhood.'))?.text
  if (neighborhood) return neighborhood
  // Fallback — second comma-separated chunk of place_name is usually
  // the suburb on NZ addresses ("12 Example St, Mt Eden, Auckland …").
  const parts = (f.place_name ?? '').split(', ')
  return parts[1] ?? ''
}

function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  onSuburbResolved,
  placeholder,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  onSuburbResolved: (suburb: string) => void
  placeholder?: string
  required?: boolean
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>('')
  const justSelectedRef = useRef<boolean>(false)

  // Close on outside click. Listener is mounted once and torn down
  // on unmount — navigating Back/Continue does not stack duplicates
  // because React unmounts/remounts the component cleanly.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function runQuery(q: string) {
    if (!token || q.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    if (q === lastQueryRef.current) return
    lastQueryRef.current = q
    const url = `${MAPBOX_ENDPOINT}/${encodeURIComponent(q)}.json?country=nz&language=en&autocomplete=true&limit=5&types=address,place,postcode,locality,neighborhood&access_token=${token}`
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('mapbox'))))
      .then((data: { features: MapboxFeature[] }) => {
        setSuggestions(data.features ?? [])
        setOpen((data.features?.length ?? 0) > 0)
        setHighlight(0)
      })
      .catch(() => {
        setSuggestions([])
        setOpen(false)
      })
  }

  function handleInput(next: string) {
    onChange(next)
    // If a selection just landed and the user keeps typing, re-enable
    // queries. justSelectedRef guards against re-querying on the
    // selection-injected onChange.
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    if (!token) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runQuery(next), 200)
  }

  function handleSelect(feature: MapboxFeature) {
    const chosen = feature.place_name || feature.text || ''
    justSelectedRef.current = true
    onChange(chosen)
    const suburb = suburbFromFeature(feature)
    if (suburb) onSuburbResolved(suburb)
    setSuggestions([])
    setOpen(false)
    lastQueryRef.current = chosen
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-1.5">
        {label}{required && <span className="text-sage-500 ml-1">*</span>}
      </label>
      <div ref={wrapperRef} className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          required={required}
          placeholder={placeholder}
          autoComplete="street-address"
          className="w-full border border-sage-100 bg-white rounded-xl px-4 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-colors"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-xl border border-sage-100 bg-white shadow-lg overflow-hidden">
            {suggestions.map((f, i) => (
              <li
                key={f.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(f) }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-4 py-2 text-sm cursor-pointer border-b border-sage-50 last:border-b-0 ${
                  i === highlight ? 'bg-sage-50 text-sage-800' : 'text-sage-800'
                }`}
              >
                {f.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!token && (
        <p className="text-xs text-gray-400 mt-1">Type your address — autocomplete temporarily unavailable.</p>
      )}
    </div>
  )
}

function TextField({
  id, label, value, onChange, placeholder, type = 'text', required, helper, autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'date' | 'number'
  required?: boolean
  helper?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-1.5">
        {label}{required && <span className="text-sage-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full border border-sage-100 bg-white rounded-xl px-4 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-colors"
      />
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </div>
  )
}

function NavButtons({
  onBack, onNext, nextLabel, nextDisabled, isFirst, status,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  isFirst: boolean
  status?: 'idle' | 'submitting' | 'error'
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-sage-100">
      {!isFirst ? (
        <button
          type="button"
          onClick={onBack}
          disabled={status === 'submitting'}
          className="text-sm text-gray-500 hover:text-sage-800 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
      ) : <span />}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || status === 'submitting'}
          className="bg-sage-800 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-sage-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Sending…' : (nextLabel ?? 'Continue')}
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export function QuoteRequestStepper() {
  const searchParams = useSearchParams()
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<FormData>(emptyForm(searchParams.get('service') || ''))
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [suburbAutoFilled, setSuburbAutoFilled] = useState(false)

  // Brief delay between an auto-advance card click and moving to the
  // next step. Lets the green border + tap-scale animation finish so
  // the choice feels confirmed.
  const AUTO_ADVANCE_DELAY_MS = 120

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleExtra(extra: Extra) {
    setForm((prev) => ({
      ...prev,
      extras: prev.extras.includes(extra)
        ? prev.extras.filter((e) => e !== extra)
        : [...prev.extras, extra],
    }))
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1))
  }
  function delayedNext() {
    window.setTimeout(goNext, AUTO_ADVANCE_DELAY_MS)
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function submit() {
    setStatus('submitting')
    setErrorMessage('')
    try {
      const res = await fetch('/api/submit-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name.trim(),
          email:         form.email.trim(),
          phone:         form.phone.trim(),
          service:       composeServiceLabel(form),
          postcode:      form.suburb.trim(),
          preferredDate: form.preferred_date,
          message:       composeMessage(form),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setStatus('success')
      setStepIndex(TOTAL_STEPS - 1)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // ── Per-step "next" enablement ─────────────────────────────────
  function nextDisabled(): boolean {
    switch (stepIndex) {
      case 0: return form.service_type === ''
      case 1:
        if (form.service_type === 'home')       return form.home_clean_type === ''
        if (form.service_type === 'commercial') return form.commercial_space_type === ''
        return true
      case 2: return !form.address.trim() || !form.suburb.trim()
      case 3:
        if (form.service_type === 'home') return !form.bedrooms || !form.bathrooms
        return !form.approx_size && !form.commercial_frequency
      case 4: return false
      case 5: return false
      case 6:
        return !form.name.trim() || !isValidEmail(form.email) || !form.phone.trim()
      default: return false
    }
  }

  return (
    <div>
      {stepIndex < TOTAL_STEPS - 1 && (
        <StepProgress
          current={stepIndex}
          total={TOTAL_STEPS - 1}
          title={STEP_TITLES[stepIndex]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Step 0 — Service type ──────────────────────────── */}
          {stepIndex === 0 && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">What can we help you with?</h3>
              <p className="text-sm text-gray-500 mb-5">Pick the option that fits best — we&apos;ll tailor the next questions.</p>
              <div className="grid gap-3">
                <OptionCard
                  active={form.service_type === 'home'}
                  onClick={() => { update('service_type', 'home'); delayedNext() }}
                  label="Home cleaning"
                  helper="Houses, apartments, townhouses — regular or one-off."
                />
                <OptionCard
                  active={form.service_type === 'commercial'}
                  onClick={() => { update('service_type', 'commercial'); delayedNext() }}
                  label="Commercial cleaning"
                  helper="Offices, retail, medical, industrial, and more."
                />
              </div>
              <NavButtons isFirst onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 1 — Type of clean ─────────────────────────── */}
          {stepIndex === 1 && form.service_type === 'home' && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">What type of clean are you after?</h3>
              <p className="text-sm text-gray-500 mb-5">No need to be exact — we&apos;ll confirm the right service when we quote.</p>
              <div className="grid gap-3">
                {HOME_CLEAN_OPTIONS.map((o) => (
                  <OptionCard
                    key={o.value}
                    active={form.home_clean_type === o.value}
                    onClick={() => { update('home_clean_type', o.value); delayedNext() }}
                    label={o.label}
                    helper={o.helper}
                  />
                ))}
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}
          {stepIndex === 1 && form.service_type === 'commercial' && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">What type of space is it?</h3>
              <p className="text-sm text-gray-500 mb-5">Helps us match you with the right cleaning team.</p>
              <div className="grid gap-3">
                {COMMERCIAL_SPACE_OPTIONS.map((o) => (
                  <OptionCard
                    key={o.value}
                    active={form.commercial_space_type === o.value}
                    onClick={() => { update('commercial_space_type', o.value); delayedNext() }}
                    label={o.label}
                    helper={o.helper}
                  />
                ))}
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 2 — Location ──────────────────────────────── */}
          {stepIndex === 2 && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">Where is the property?</h3>
              <p className="text-sm text-gray-500 mb-5">We service all of Auckland.</p>
              <div className="space-y-4">
                <AddressAutocomplete
                  id="address"
                  label="Address"
                  value={form.address}
                  onChange={(v) => update('address', v)}
                  onSuburbResolved={(suburb) => {
                    // Only auto-populate when the user hasn't typed
                    // a suburb yet — never overwrite manual input.
                    if (!form.suburb.trim()) {
                      update('suburb', suburb)
                      setSuburbAutoFilled(true)
                    }
                  }}
                  placeholder="Start typing your street address"
                  required
                />
                <TextField
                  id="suburb"
                  label="Suburb"
                  value={form.suburb}
                  onChange={(v) => { setSuburbAutoFilled(false); update('suburb', v) }}
                  placeholder="e.g. Mt Eden"
                  required
                  autoComplete="address-level2"
                  helper={suburbAutoFilled ? 'Suburb auto-filled from address' : undefined}
                />
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 3 — Details (conditional) ─────────────────── */}
          {stepIndex === 3 && form.service_type === 'home' && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">Tell us about your home</h3>
              <p className="text-sm text-gray-500 mb-5">Rough numbers are fine — you can confirm later.</p>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="bedrooms"
                  label="Bedrooms"
                  value={form.bedrooms}
                  onChange={(v) => update('bedrooms', v)}
                  type="number"
                  placeholder="e.g. 3"
                  required
                />
                <TextField
                  id="bathrooms"
                  label="Bathrooms"
                  value={form.bathrooms}
                  onChange={(v) => update('bathrooms', v)}
                  type="number"
                  placeholder="e.g. 2"
                  required
                />
              </div>
              <div className="mt-4">
                <p className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-2">Property type</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt}
                      active={form.property_type === opt}
                      onClick={() => update('property_type', opt)}
                      label={opt}
                    />
                  ))}
                </div>
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}
          {stepIndex === 3 && form.service_type === 'commercial' && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">Tell us about the space</h3>
              <p className="text-sm text-gray-500 mb-5">Rough numbers are fine — we&apos;ll confirm before quoting.</p>
              <div className="space-y-4">
                <TextField
                  id="approx_size"
                  label="Approximate size"
                  value={form.approx_size}
                  onChange={(v) => update('approx_size', v)}
                  placeholder='e.g. ~150 m² or "not sure"'
                  helper="Square metres, room count, or just a description."
                />
                <div>
                  <p className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-2">Cleaning frequency</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMERCIAL_FREQUENCY_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt}
                        active={form.commercial_frequency === opt}
                        onClick={() => update('commercial_frequency', opt)}
                        label={opt}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 4 — Schedule ──────────────────────────────── */}
          {stepIndex === 4 && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">When were you thinking?</h3>
              <p className="text-sm text-gray-500 mb-5">Optional — leave blank if flexible.</p>
              <TextField
                id="preferred_date"
                label="Preferred date"
                value={form.preferred_date}
                onChange={(v) => update('preferred_date', v)}
                type="date"
                helper="We'll confirm a time when we quote."
              />
              {form.service_type === 'home' && (
                <div className="mt-5">
                  <p className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-2">Frequency (optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FREQUENCY_OPTIONS.map((o) => (
                      <OptionCard
                        key={o.value}
                        active={form.frequency === o.value}
                        onClick={() => update('frequency', form.frequency === o.value ? '' : o.value)}
                        label={o.label}
                      />
                    ))}
                  </div>
                </div>
              )}
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 5 — Extras ────────────────────────────────── */}
          {stepIndex === 5 && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">Anything to add?</h3>
              <p className="text-sm text-gray-500 mb-5">Pick any add-ons or share extra context.</p>
              <div className="grid gap-3 mb-5">
                {EXTRA_OPTIONS.map((o) => (
                  <CheckboxCard
                    key={o.value}
                    checked={form.extras.includes(o.value)}
                    onToggle={() => toggleExtra(o.value)}
                    label={o.label}
                    helper={o.helper}
                  />
                ))}
              </div>
              <div>
                <label htmlFor="notes" className="block text-xs uppercase tracking-wide font-semibold text-sage-700 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                  placeholder="Anything we should know — access, pets, special requests…"
                  className="w-full border border-sage-100 bg-white rounded-xl px-4 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-colors"
                />
              </div>
              <NavButtons isFirst={false} onBack={goBack} onNext={goNext} nextDisabled={nextDisabled()} />
            </div>
          )}

          {/* ── Step 6 — Contact ───────────────────────────────── */}
          {stepIndex === 6 && (
            <div>
              <h3 className="text-lg font-bold text-sage-800 mb-1">Last bit — how do we reach you?</h3>
              <p className="text-sm text-gray-500 mb-5">We&apos;ll come back with a quote within a few hours on business days.</p>
              <div className="space-y-4">
                <TextField
                  id="name"
                  label="Name"
                  value={form.name}
                  onChange={(v) => update('name', v)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                />
                <TextField
                  id="email"
                  label="Email"
                  value={form.email}
                  onChange={(v) => update('email', v)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <TextField
                  id="phone"
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => update('phone', v)}
                  type="tel"
                  placeholder="e.g. 021 123 4567"
                  required
                  autoComplete="tel"
                />
              </div>
              {status === 'error' && errorMessage && (
                <p className="text-sm text-red-600 mt-4">{errorMessage}</p>
              )}
              <NavButtons
                isFirst={false}
                onBack={goBack}
                onNext={submit}
                nextLabel="Send request"
                nextDisabled={nextDisabled()}
                status={status === 'success' ? 'idle' : status}
              />
            </div>
          )}

          {/* ── Step 7 — Confirmation ──────────────────────────── */}
          {stepIndex === 7 && (
            <div className="text-center py-8">
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-sage-50 mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 10.5L8 13.5L15 6.5" stroke="#3a7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-sage-800 mb-2">Thanks — we&apos;ve got your request.</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                We&apos;ll review the details and come back to you shortly with a quote.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto mt-3">
                If it&apos;s urgent, feel free to call us on <a href="tel:0800726686" className="text-sage-700 font-semibold underline-offset-2 hover:underline">0800 726 686</a>.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
