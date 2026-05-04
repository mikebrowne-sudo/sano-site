# Custom Invoice (Legacy / Manual Import) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only "Create custom invoice" flow that lets pre-portal / legacy invoices be reproduced inside the portal with full manual control over invoice number, dates, and wording — without touching the standard quote → job → invoice pipeline.

**Architecture:** Single migration extends `invoices.source` to allow `'custom'` and patches `generate_invoice_number()` so a manually-supplied number isn't overwritten. New isolated server action `createCustomInvoice` (separate file from existing invoice actions) does auth + server-side uniqueness check + insert with `quote_id = job_id = null` + audit log. New route `/portal/invoices/custom/new` hosts the form. A reusable `CustomInvoiceBadge` component is rendered on the list and detail views; the detail view also shows a non-blocking warning when editing a sent/paid custom invoice.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind · Supabase (`@/lib/supabase-server`) · Jest (for the validation lib only) · `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-05-04-custom-invoice-design.md` (committed `17c3bc3`).

**Branch:** `feat/custom-invoice` (already created off `main`).

---

## File Structure

**Created (7):**
- `docs/db/2026-05-04-custom-invoice-source.sql` — migration: source enum + trigger patch
- `src/lib/custom-invoice-validation.ts` — pure validation logic (Lean field set)
- `src/lib/__tests__/custom-invoice-validation.test.ts` — Jest tests for the validator
- `src/app/portal/invoices/_actions-custom.ts` — `createCustomInvoice` server action
- `src/app/portal/invoices/_components/CustomInvoiceForm.tsx` — client form
- `src/app/portal/invoices/_components/CustomInvoiceBadge.tsx` — sage chip with tooltip
- `src/app/portal/invoices/custom/new/page.tsx` — admin gate + form host

**Modified (2):**
- `src/app/portal/invoices/page.tsx` — header CTA + `source` in SELECT + badge in `cell()`
- `src/app/portal/invoices/[id]/page.tsx` — `source` in SELECT + badge near H1 + non-blocking edit warning

---

## Task 1: DB migration — extend source enum + patch invoice-number trigger

**Files:**
- Create: `docs/db/2026-05-04-custom-invoice-source.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Phase 5.5.X — Custom (legacy) invoices.
-- Two changes, both additive + backward-compatible:
--   1. Allow source = 'custom' on invoices.
--   2. Patch generate_invoice_number() so a manually-supplied
--      invoice_number isn't clobbered by nextval(). Existing call
--      sites never set the field, so they continue to auto-number.

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'invoices_source_check') then
    alter table public.invoices drop constraint invoices_source_check;
  end if;
  alter table public.invoices
    add constraint invoices_source_check
    check (source is null or source in ('job','manual','recurring','custom'));
end $$;

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $func$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$func$;
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "2026-05-04-custom-invoice-source"` and the file contents from Step 1.

- [ ] **Step 3: Verify the trigger patch landed correctly**

Run via `mcp__claude_ai_Supabase__execute_sql`:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'generate_invoice_number';
```

Expected: function body contains `if new.invoice_number is null or new.invoice_number = ''`.

- [ ] **Step 4: Verify the check constraint accepts 'custom'**

```sql
select pg_get_constraintdef(c.oid)
from pg_constraint c join pg_class t on t.oid = c.conrelid
where t.relname = 'invoices' and c.conname = 'invoices_source_check';
```

Expected: definition mentions `'custom'`.

- [ ] **Step 5: Commit**

```bash
git add docs/db/2026-05-04-custom-invoice-source.sql
git commit -m "feat(portal): custom-invoice migration — source 'custom' + trigger respects manual numbers

Backward-compatible: existing inserts never set invoice_number so the
nextval branch still fires for them. The new custom-invoice flow can
now write a legacy INV-XXXXX explicitly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: CustomInvoiceBadge component

Trivial reusable badge with tooltip. Verified visually in Task 9.

**Files:**
- Create: `src/app/portal/invoices/_components/CustomInvoiceBadge.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { FilePlus2 } from 'lucide-react'

const TOOLTIP = 'Custom (legacy / manual) invoice — created outside the standard quote → job → invoice flow.'

export function CustomInvoiceBadge({ size = 'sm' }: { size?: 'sm' | 'md' } = {}) {
  const cls = size === 'md'
    ? 'inline-flex items-center gap-1 text-xs uppercase tracking-wide font-semibold text-sage-700 bg-sage-100 rounded-full px-2 py-0.5'
    : 'inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-700 bg-sage-100 rounded-full px-1.5 py-0.5'
  const icon = size === 'md' ? 11 : 9
  return (
    <span className={cls} title={TOOLTIP} aria-label={TOOLTIP}>
      <FilePlus2 size={icon} />
      Custom
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/portal/invoices/_components/CustomInvoiceBadge.tsx
git commit -m "feat(portal): add CustomInvoiceBadge component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Validation library (TDD)

Pure validation function — testable without Supabase. Centralises the rules so the server action stays thin.

**Files:**
- Create: `src/lib/custom-invoice-validation.ts`
- Test: `src/lib/__tests__/custom-invoice-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/custom-invoice-validation.test.ts
import { validateCustomInvoiceForm } from '../custom-invoice-validation'

const valid = {
  invoice_number: 'INV-26001',
  client_id: '00000000-0000-0000-0000-000000000001',
  date_issued: '2026-01-15',
  due_date: '2026-01-29',
  service_address: '12 Test St',
  notes: 'Service rendered.',
  base_price: 450,
  gst_included: true,
  payment_type: 'on_account' as const,
}

describe('validateCustomInvoiceForm', () => {
  it('accepts a fully-valid input', () => {
    const result = validateCustomInvoiceForm(valid)
    expect(result.ok).toBe(true)
  })

  it('rejects when invoice_number is blank', () => {
    const result = validateCustomInvoiceForm({ ...valid, invoice_number: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.invoice_number).toMatch(/required/i)
  })

  it('rejects malformed invoice_number', () => {
    const result = validateCustomInvoiceForm({ ...valid, invoice_number: 'X-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.invoice_number).toMatch(/format/i)
  })

  it('rejects when client_id is blank', () => {
    const result = validateCustomInvoiceForm({ ...valid, client_id: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.client_id).toMatch(/required/i)
  })

  it('rejects when due_date is before date_issued', () => {
    const result = validateCustomInvoiceForm({ ...valid, date_issued: '2026-02-01', due_date: '2026-01-15' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.due_date).toMatch(/on or after/i)
  })

  it('rejects negative base_price', () => {
    const result = validateCustomInvoiceForm({ ...valid, base_price: -1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.base_price).toMatch(/zero or more/i)
  })

  it('rejects empty notes (dispute wording is the whole point)', () => {
    const result = validateCustomInvoiceForm({ ...valid, notes: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.notes).toMatch(/required/i)
  })

  it('rejects unknown payment_type', () => {
    // @ts-expect-error testing runtime guard
    const result = validateCustomInvoiceForm({ ...valid, payment_type: 'crypto' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.payment_type).toBeDefined()
  })

  it('rejects malformed date strings', () => {
    const result = validateCustomInvoiceForm({ ...valid, date_issued: '15/01/2026' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.date_issued).toMatch(/date/i)
  })
})
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
cd F:/Sano/01-Site && npx jest src/lib/__tests__/custom-invoice-validation.test.ts
```

Expected: `Cannot find module '../custom-invoice-validation'` — all tests fail.

- [ ] **Step 3: Implement the validator**

```ts
// src/lib/custom-invoice-validation.ts

export type CustomInvoicePaymentType = 'cash_sale' | 'on_account'

export interface CustomInvoiceFormInput {
  invoice_number: string
  client_id: string
  date_issued: string  // ISO yyyy-mm-dd
  due_date: string     // ISO yyyy-mm-dd
  service_address: string | null
  notes: string
  base_price: number
  gst_included: boolean
  payment_type: CustomInvoicePaymentType
}

export type ValidationResult =
  | { ok: true; value: CustomInvoiceFormInput }
  | { ok: false; errors: Partial<Record<keyof CustomInvoiceFormInput, string>> }

const INV_NUMBER_PATTERN = /^INV-\d{4,6}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const PAYMENT_TYPES: readonly string[] = ['cash_sale', 'on_account']

export function validateCustomInvoiceForm(raw: CustomInvoiceFormInput): ValidationResult {
  const errors: Partial<Record<keyof CustomInvoiceFormInput, string>> = {}

  const invNum = (raw.invoice_number ?? '').trim()
  if (!invNum) {
    errors.invoice_number = 'Invoice number is required.'
  } else if (!INV_NUMBER_PATTERN.test(invNum)) {
    errors.invoice_number = 'Invoice number format must be INV-XXXX (4–6 digits).'
  }

  if (!raw.client_id) {
    errors.client_id = 'Client is required.'
  }

  if (!ISO_DATE_PATTERN.test(raw.date_issued ?? '')) {
    errors.date_issued = 'Date issued must be a valid date (YYYY-MM-DD).'
  }
  if (!ISO_DATE_PATTERN.test(raw.due_date ?? '')) {
    errors.due_date = 'Due date must be a valid date (YYYY-MM-DD).'
  }
  if (!errors.date_issued && !errors.due_date && raw.due_date < raw.date_issued) {
    errors.due_date = 'Due date must be on or after the date issued.'
  }

  if (typeof raw.base_price !== 'number' || Number.isNaN(raw.base_price) || raw.base_price < 0) {
    errors.base_price = 'Base price must be zero or more.'
  }

  if (!(raw.notes ?? '').trim()) {
    errors.notes = 'Notes / description is required.'
  }

  if (!PAYMENT_TYPES.includes(raw.payment_type)) {
    errors.payment_type = 'Payment type must be cash_sale or on_account.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      ...raw,
      invoice_number: invNum,
      service_address: (raw.service_address ?? '').trim() || null,
      notes: raw.notes.trim(),
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd F:/Sano/01-Site && npx jest src/lib/__tests__/custom-invoice-validation.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/custom-invoice-validation.ts src/lib/__tests__/custom-invoice-validation.test.ts
git commit -m "feat(portal): add custom-invoice validation lib + tests

Pure validator covering format, required fields, date order,
non-negative price, and payment_type whitelist. Server action
will compose this with the auth + uniqueness pre-check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: createCustomInvoice server action

**Files:**
- Create: `src/app/portal/invoices/_actions-custom.ts`

- [ ] **Step 1: Write the server action**

```ts
'use server'

// Phase 5.5.X — Custom (legacy) invoice creation.
// Isolated from _actions.ts on purpose: the existing actions file
// covers send / mark-paid / archive flows that are well-trodden;
// keeping the new write path in its own file makes the diff small
// and revertible.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  validateCustomInvoiceForm,
  type CustomInvoiceFormInput,
} from '@/lib/custom-invoice-validation'

const ADMIN_EMAIL = 'michael@sano.nz'

type ActionResult = { error: string; fieldErrors?: Partial<Record<keyof CustomInvoiceFormInput, string>> }

export async function createCustomInvoice(input: CustomInvoiceFormInput): Promise<ActionResult | never> {
  const supabase = createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'Not authorised.' }
  }

  // 2. Server-side validation
  const validation = validateCustomInvoiceForm(input)
  if (!validation.ok) {
    return { error: 'Please fix the highlighted fields.', fieldErrors: validation.errors }
  }
  const v = validation.value

  // 3. Verify the client exists and isn't archived
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('id, is_archived')
    .eq('id', v.client_id)
    .maybeSingle()
  if (cErr || !client) {
    return { error: 'Selected client not found.' }
  }
  if (client.is_archived) {
    return { error: 'Selected client is archived. Restore the client first.' }
  }

  // 4. Server-side uniqueness pre-check (returns clean error before
  //    the DB unique index has to fire). User addition #1.
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('invoice_number', v.invoice_number)
    .maybeSingle()
  if (existing) {
    return {
      error: `Invoice number ${v.invoice_number} is already in use.`,
      fieldErrors: { invoice_number: `Invoice number ${v.invoice_number} is already in use.` },
    }
  }

  // 5. Resolve the client's primary contact (Phase 5.5.9 backfill
  //    guarantees one exists, but we tolerate absence).
  const { data: primaryContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('client_id', v.client_id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  // 6. Insert. quote_id = job_id = null on purpose — keeps the row
  //    invisible to every quote/job converter.
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number: v.invoice_number,
      source: 'custom',
      client_id: v.client_id,
      contact_id: primaryContact?.id ?? null,
      quote_id: null,
      job_id: null,
      status: 'draft',
      date_issued: v.date_issued,
      due_date: v.due_date,
      service_address: v.service_address,
      notes: v.notes,
      base_price: v.base_price,
      gst_included: v.gst_included,
      payment_type: v.payment_type,
    })
    .select('id, invoice_number')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message ?? 'unknown error'}` }
  }

  // 7. Audit log — actor_email goes in the `after` payload because
  //    the audit_log schema doesn't have a dedicated email column.
  //    User addition #2.
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'invoice.created_custom',
    entity_table: 'invoices',
    entity_id: invoice.id,
    before: null,
    after: {
      actor_email: user.email,
      invoice_number: invoice.invoice_number,
      client_id: v.client_id,
      base_price: v.base_price,
      gst_included: v.gst_included,
      payment_type: v.payment_type,
      date_issued: v.date_issued,
      due_date: v.due_date,
    },
  })

  redirect(`/portal/invoices/${invoice.id}`)
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/invoices/_actions-custom.ts
git commit -m "feat(portal): add createCustomInvoice server action

Admin-gated. Server-side uniqueness pre-check returns a clean
field-level error before the DB unique index has to fire.
quote_id and job_id are written as null on purpose — keeps the
row invisible to convertToInvoice / createInvoiceFromJob /
createJobAndInvoiceFromQuote and to the auto_create_job_on_invoice
side effect. Audit log row carries actor_email in the after payload.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: CustomInvoiceForm client component

**Files:**
- Create: `src/app/portal/invoices/_components/CustomInvoiceForm.tsx`

- [ ] **Step 1: Write the form**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createCustomInvoice } from '../_actions-custom'
import type { CustomInvoiceFormInput } from '@/lib/custom-invoice-validation'

interface ClientOption {
  id: string
  name: string
  company_name: string | null
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function plus14ISO(from: string): string {
  const d = new Date(from + 'T00:00:00')
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export function CustomInvoiceForm({ clients }: { clients: ClientOption[] }) {
  const today = todayISO()

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientId, setClientId] = useState('')
  const [dateIssued, setDateIssued] = useState(today)
  const [dueDate, setDueDate] = useState(plus14ISO(today))
  const [serviceAddress, setServiceAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [gstIncluded, setGstIncluded] = useState(true)
  const [paymentType, setPaymentType] = useState<'cash_sale' | 'on_account'>('on_account')

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomInvoiceFormInput, string>>>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const priceNum = parseFloat(basePrice)
    const input: CustomInvoiceFormInput = {
      invoice_number: invoiceNumber.trim(),
      client_id: clientId,
      date_issued: dateIssued,
      due_date: dueDate,
      service_address: serviceAddress.trim() || null,
      notes,
      base_price: Number.isFinite(priceNum) ? priceNum : NaN,
      gst_included: gstIncluded,
      payment_type: paymentType,
    }

    startTransition(async () => {
      const result = await createCustomInvoice(input)
      if (result?.error) {
        setError(result.error)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      }
      // Successful create redirects server-side; no client-side nav needed.
    })
  }

  const inputCls = 'w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage-500'
  const labelCls = 'block text-sm font-medium text-sage-800 mb-1'
  const errCls = 'text-xs text-red-700 mt-1'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor="invoice_number">Invoice number</label>
        <input
          id="invoice_number"
          className={inputCls}
          placeholder="INV-26001"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          autoComplete="off"
        />
        <p className="text-xs text-sage-600 mt-1">Format: INV-XXXX (4–6 digits). Must not already exist.</p>
        {fieldErrors.invoice_number && <p className={errCls}>{fieldErrors.invoice_number}</p>}
      </div>

      <div>
        <label className={labelCls} htmlFor="client_id">Client</label>
        <select
          id="client_id"
          className={inputCls}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">— Select client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name ? `${c.company_name} (${c.name})` : c.name}
            </option>
          ))}
        </select>
        {fieldErrors.client_id && <p className={errCls}>{fieldErrors.client_id}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="date_issued">Date issued</label>
          <input id="date_issued" type="date" className={inputCls} value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} />
          {fieldErrors.date_issued && <p className={errCls}>{fieldErrors.date_issued}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="due_date">Due date</label>
          <input id="due_date" type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <button
            type="button"
            onClick={() => setDueDate(plus14ISO(dateIssued))}
            className="text-xs text-sage-600 underline hover:text-sage-800 mt-1"
          >
            Use 14-day terms
          </button>
          {fieldErrors.due_date && <p className={errCls}>{fieldErrors.due_date}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="service_address">Service address (optional)</label>
        <input id="service_address" className={inputCls} value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} />
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">Description / notes</label>
        <textarea
          id="notes"
          className={inputCls + ' min-h-[140px]'}
          placeholder="Wording that will appear on the printed/sent invoice."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="text-xs text-sage-600 mt-1">Primary content field — this is where amended wording goes.</p>
        {fieldErrors.notes && <p className={errCls}>{fieldErrors.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="base_price">Base price (NZD)</label>
          <input
            id="base_price"
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />
          {fieldErrors.base_price && <p className={errCls}>{fieldErrors.base_price}</p>}
        </div>
        <div className="flex items-center pt-7">
          <label className="inline-flex items-center text-sm text-sage-800">
            <input type="checkbox" className="mr-2" checked={gstIncluded} onChange={(e) => setGstIncluded(e.target.checked)} />
            GST included in price
          </label>
        </div>
      </div>

      <div>
        <label className={labelCls}>Payment type</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              className="mr-2"
              checked={paymentType === 'on_account'}
              onChange={() => setPaymentType('on_account')}
            />
            On account
          </label>
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              className="mr-2"
              checked={paymentType === 'cash_sale'}
              onChange={() => setPaymentType('cash_sale')}
            />
            Cash sale
          </label>
        </div>
        {fieldErrors.payment_type && <p className={errCls}>{fieldErrors.payment_type}</p>}
      </div>

      <div className="pt-4 border-t border-sage-100 flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create custom invoice'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/invoices/_components/CustomInvoiceForm.tsx
git commit -m "feat(portal): add CustomInvoiceForm component

Single-page form, Lean field set, inline error rendering, 14-day
quick-fill button. Posts to createCustomInvoice; success redirects
server-side.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: New-invoice route

**Files:**
- Create: `src/app/portal/invoices/custom/new/page.tsx`

- [ ] **Step 1: Write the route**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { CustomInvoiceForm } from '../../_components/CustomInvoiceForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function NewCustomInvoicePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/portal/invoices')
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('is_archived', false)
    .order('name')

  return (
    <div>
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to invoices
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">New custom invoice</h1>
        <p className="text-sm text-sage-600 mt-1 max-w-2xl">
          For pre-portal / legacy cases. Use only when reproducing an invoice that was originally
          issued outside the portal. Standard quotes and jobs flow through the normal create paths.
        </p>
      </div>

      <CustomInvoiceForm clients={clients ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/portal/invoices/custom/new/page.tsx
git commit -m "feat(portal): add /portal/invoices/custom/new route

Admin-gated. Loads non-archived clients and renders CustomInvoiceForm.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: List page integration

**Files:**
- Modify: `src/app/portal/invoices/page.tsx`

- [ ] **Step 1: Add `source` to the SELECT**

In the existing invoices SELECT (around the columns list near the top of `getInvoices`/the page query), add `source` to the field list. Locate the `.select(` call that pulls invoice rows for the list view, and append `, source`.

Locate the row-shaping object (around line 200) and add:
```ts
source: (inv as { source?: string | null }).source ?? null,
```

Locate the type returned by `cell()` rows (where other fields like `isTest`, `isArchived` are added) and ensure the new `source` field rides along.

- [ ] **Step 2: Add the admin-only header CTA**

Replace the header block at line 313:

```tsx
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Invoices</h1>
        {isAdmin && (
          <Link
            href="/portal/invoices/custom/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <FilePlus2 size={16} />
            Create custom invoice
          </Link>
        )}
      </div>
```

Add the imports at the top of the file:
```tsx
import { Receipt, FlaskConical, Archive, FilePlus2 } from 'lucide-react'
import { CustomInvoiceBadge } from './_components/CustomInvoiceBadge'
```

Resolve `isAdmin` near the existing `cleanup` resolution (mirroring the detail page at line 31):
```tsx
const { data: { user } } = await supabase.auth.getUser()
const isAdmin = user?.email === 'michael@sano.nz'
```

- [ ] **Step 3: Render the badge in the `cell()` for `invoice_number`**

In the `case 'invoice_number':` branch (around line 245), append the badge alongside the existing Test/Archived chips. Replace the JSX returned in that branch with:

```tsx
        return (
          <Link
            href={`/portal/invoices/${row.id}`}
            className="font-medium text-sage-800 hover:underline inline-flex items-center gap-1.5"
          >
            {row.invoiceNumber}
            {row.source === 'custom' && <CustomInvoiceBadge />}
            {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
            {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
          </Link>
        )
```

- [ ] **Step 4: Verify TS compiles**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/portal/invoices/page.tsx
git commit -m "feat(portal): wire CustomInvoiceBadge + admin CTA into invoices list

Adds 'Create custom invoice' button (admin-only) to the page header
and a 'Custom' chip to the invoice-number cell when source = 'custom'.
SELECT extended to read the source column.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Detail page integration

**Files:**
- Modify: `src/app/portal/invoices/[id]/page.tsx`

- [ ] **Step 1: Add `source` to the SELECT**

In the invoice SELECT near the top of the page, append `source` to the comma-separated column list (around line 51):

```ts
        deleted_at,
        is_test,
        source,
        clients ( name, company_name )
```

- [ ] **Step 2: Render the badge near the H1**

Add the import at the top of the file:
```tsx
import { CustomInvoiceBadge } from './_components/CustomInvoiceBadge'
```

Locate the H1 (around line 167) and replace it with:

```tsx
        <div className="flex items-center gap-3">
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">{invoice.invoice_number}</h1>
          {(invoice as { source?: string | null }).source === 'custom' && <CustomInvoiceBadge size="md" />}
        </div>
```

- [ ] **Step 3: Add the non-blocking warning banner**

After the existing archived-invoice banner block (around line 213, just before the `<div className="max-w-2xl space-y-8">` line), insert:

```tsx
      {(invoice as { source?: string | null }).source === 'custom' && (displayStatus === 'sent' || displayStatus === 'paid' || displayStatus === 'overdue') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-amber-900 font-semibold">Custom invoice — already {displayStatus}.</p>
          <p className="text-xs text-amber-800 mt-0.5">
            This is a custom (legacy) invoice. Edits won&apos;t notify the customer automatically — confirm any wording changes are reflected in the next send.
          </p>
        </div>
      )}
```

- [ ] **Step 4: Verify TS compiles**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/portal/invoices/[id]/page.tsx
git commit -m "feat(portal): show CustomInvoiceBadge + edit warning on invoice detail

Detail page renders the badge next to the invoice number when source
is 'custom'. When a custom invoice is sent/paid/overdue, a small
non-blocking amber banner reminds the operator to confirm any wording
changes are reflected in the next send.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: End-to-end smoke verification + final cleanup

**Goal:** Walk the spec's 13 acceptance criteria in a real browser before declaring done.

- [ ] **Step 1: Start the dev server**

```bash
cd F:/Sano/01-Site && npm run dev
```

Expected: server boots on `http://localhost:3000` with no compile errors.

- [ ] **Step 2: Walk acceptance criteria 1–11**

In a browser logged in as `michael@sano.nz`:

1. `/portal/invoices` shows the **Create custom invoice** button in the header.
2. Logged in as a non-admin → button absent.
3. Click the button → form loads at `/portal/invoices/custom/new`.
4. Submit valid: `INV-26001`, an existing client, today, today+14, base 450, GST included, on_account, notes "Service rendered for tenancy: full clean and documentation." → redirects to detail.
5. Detail page shows the "Custom" badge next to the invoice number.
6. Back to `/portal/invoices` → "Custom" chip visible in the invoice-number cell.
7. Re-submit the form with the same `INV-26001` → clean error toast ("Invoice number INV-26001 is already in use."), no DB stack trace.
8. Submit the form with `invoice_number` blank → field-level error, no insert.
9. From the detail page, send via the existing panel → email arrives, status flips to `sent`.
10. Reload the detail page → non-blocking amber banner now appears (because status = sent on a custom invoice).
11. Click **Mark as paid** → status flips to `paid`, no errors.

- [ ] **Step 3: Audit-log spot check**

```sql
select action, actor_id, after
from public.audit_log
where action = 'invoice.created_custom'
order by created_at desc
limit 1;
```

Expected: one row, `after.actor_email = 'michael@sano.nz'`, `after.invoice_number = 'INV-26001'`.

- [ ] **Step 4: Standard-flow regression check**

Convert any in-progress quote to invoice via the existing **Convert to invoice** button.

Expected: invoice gets a normal sequential `INV-XXXX` number from the trigger; no breakage. The patched trigger is backward-compatible because existing inserts never set `invoice_number`.

- [ ] **Step 5: Print PDF smoke test**

From the new INV-26001 detail page → click **Print / PDF**. Confirm the page renders, the dispute wording shows in the Notes section, and no console errors.

- [ ] **Step 6: If any cleanup needed, commit**

If smoke testing surfaced any tweaks (copy, spacing, missing import), make the change and commit:

```bash
git add <changed files>
git commit -m "fix(portal): custom invoice — <specific fix>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If nothing surfaces, this step is a no-op.

- [ ] **Step 7: Final report to the user**

Summarise:
- Migration applied (one row in `pg_proc` patched, check constraint extended).
- 7 new files, 2 modified.
- All 11 browser-walked acceptance criteria passed (or list any that didn't).
- Audit row written.
- Standard-flow regression clean.

End the task with the standard 4-item Commands block (per memory rule):
1. Local run command (already running — `npm run dev`)
2. Git commit + push command
3. Suggested commit message (already used per-task)
4. Explicit "no further command" note for non-actionable items

---

## Self-Review

**Spec coverage:** Every requirement in the spec is implemented.
- §1 Purpose / §2 Scope — Tasks 4–8 cover the admin-only flow, Lean field set, full editability of the Lean fields.
- §3 Pre-flight — both verifications baked into Task 1 (trigger patch + idempotent constraint).
- §4 Data-model — Task 1.
- §5 Server action — Tasks 3 + 4 (validation lib + action).
- §6 UI changes — Tasks 2, 5, 6, 7, 8 (badge, form, route, list, detail).
- §7 Safety guarantees — Task 4 sets `quote_id = job_id = null` and uses `'custom'` source; nothing in Tasks 7/8 touches the converters.
- §8 Risks — addressed: Risk 1 in Task 1, Risk 4 covered by Task 9 step 5, Risk 7 in Task 4 step 1.
- §9 Acceptance criteria — Task 9.
- User addition #1 (server-side uniqueness with clean error) — Task 4 step 1, item 4.
- User addition #2 (audit includes created_by/email) — Task 4 step 1, item 7.
- User addition #3 (non-blocking warning when editing sent/paid) — Task 8 step 3.
- User addition #4 (tooltip on Custom badge) — Task 2.

**Placeholder scan:** No "TODO", "TBD", "fill in details" left. Every code step has full code. Every command has expected output.

**Type consistency:**
- `CustomInvoiceFormInput` defined in Task 3 → consumed by Tasks 4 (action) and 5 (form). Same shape.
- `CustomInvoicePaymentType` (`'cash_sale' | 'on_account'`) defined in Task 3 → consumed by form's `useState`. Consistent.
- `CustomInvoiceBadge` component takes optional `size` prop (`'sm' | 'md'`) — Task 7 calls with no arg (defaults `'sm'`); Task 8 calls with `size="md"`. Consistent with the definition.
- `source` typed as `string | null` everywhere it's read.

No issues found.
