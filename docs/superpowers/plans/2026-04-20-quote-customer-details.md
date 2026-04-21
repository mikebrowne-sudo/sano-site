# Quote Customer Details — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface customer contact info (name, phone, email, service address) in the portal's quotes UI — as a full card on the quote detail page and as a truncated Address column with native hover-tooltip on the quotes list page.

**Architecture:** Three focused edits. One new presentational component for the detail-page card. Two existing server components get their Supabase selects extended (one extra field each) and their JSX updated to render the new column / card. No schema changes. No new tests — the spec (2026-04-20-quote-customer-details-design.md) explicitly omits Jest tests for this change because the new component is purely presentational with no conditional logic beyond null-coalescing.

**Tech Stack:** Next.js 14 App Router (server components), TypeScript, Tailwind CSS, Supabase. Existing portal design tokens (sage palette).

**Spec:** [docs/superpowers/specs/2026-04-20-quote-customer-details-design.md](../specs/2026-04-20-quote-customer-details-design.md)

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx` | **Create** | Pure presentational card rendering name / phone / email / service address |
| `src/app/portal/quotes/[id]/page.tsx` | **Modify** | Extend `currentClient` select with `phone`; render the new card above `<EditQuoteForm>` |
| `src/app/portal/quotes/page.tsx` | **Modify** | Extend `quotes` select with `service_address`; add Address column to desktop table; append truncated address line under client name in mobile card |

No other files change. No migration.

---

## Task 1: Presentational Customer Details Component

**Files:**
- Create: `src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx`

- [ ] **Step 1: Create the component file**

Paste exactly:

```tsx
// src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx

interface QuoteCustomerDetailsProps {
  name: string | null
  phone: string | null
  email: string | null
  serviceAddress: string | null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-sage-500 font-semibold mb-1">{label}</div>
      <div className="text-sm text-sage-800">{children}</div>
    </div>
  )
}

const MUTED_DASH = <span className="text-sage-400">—</span>

export function QuoteCustomerDetails({ name, phone, email, serviceAddress }: QuoteCustomerDetailsProps) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-5 mb-6">
      <h2 className="text-sm uppercase tracking-wider text-sage-600 font-semibold mb-4">Customer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Row label="Name">{name ? name : MUTED_DASH}</Row>
        <Row label="Phone">
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-sage-800 hover:text-sage-500 transition-colors">
              {phone}
            </a>
          ) : (
            MUTED_DASH
          )}
        </Row>
        <Row label="Email">
          {email ? (
            <a href={`mailto:${email}`} className="text-sage-800 hover:text-sage-500 transition-colors break-all">
              {email}
            </a>
          ) : (
            MUTED_DASH
          )}
        </Row>
        <Row label="Service address">{serviceAddress ? serviceAddress : MUTED_DASH}</Row>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

Expected: no new errors. If the existing project has pre-existing TypeScript errors unrelated to this file, they should still match baseline (no new errors introduced).

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx
git commit -m "feat(quotes): add QuoteCustomerDetails presentational component"
```

---

## Task 2: Wire card into quote detail page

**Files:**
- Modify: `src/app/portal/quotes/[id]/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/app/portal/quotes/[id]/page.tsx`, next to the other `./_components/...` imports, add:

```tsx
import { QuoteCustomerDetails } from './_components/QuoteCustomerDetails'
```

- [ ] **Step 2: Extend the `currentClient` select to include phone**

Find this block:

```tsx
    supabase
      .from('clients')
      .select('name, email')
      .eq('id', quote.client_id)
      .single(),
```

Replace with:

```tsx
    supabase
      .from('clients')
      .select('name, phone, email')
      .eq('id', quote.client_id)
      .single(),
```

- [ ] **Step 3: Render the new card above `<EditQuoteForm>`**

Find this block:

```tsx
      <div className="flex justify-end mb-6">
        <RegenerateShareLink table="quotes" id={quote.id} />
        {isAdmin && <DeleteButton type="quote" id={quote.id} />}
      </div>

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
      />
```

Replace with:

```tsx
      <div className="flex justify-end mb-6">
        <RegenerateShareLink table="quotes" id={quote.id} />
        {isAdmin && <DeleteButton type="quote" id={quote.id} />}
      </div>

      <QuoteCustomerDetails
        name={currentClient?.name ?? null}
        phone={currentClient?.phone ?? null}
        email={currentClient?.email ?? null}
        serviceAddress={quote.service_address ?? null}
      />

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
      />
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`

Expected: no new errors. Pre-existing warnings (image in HeroSection.test.tsx, QuoteBuilder useEffect deps) remain unchanged.

- [ ] **Step 6: Smoke-test in dev**

Start the dev server if not already running:

```bash
npm run dev
```

Open `http://localhost:3000/portal/quotes/` and click any quote. Confirm:

- The "Customer" card appears directly above the edit form
- Name, phone, email, and service address render correctly
- Phone is a `tel:` link (hover shows `tel:...` in the status bar)
- Email is a `mailto:` link
- If any of those fields are missing on the test quote, they render a muted `—`

If any value looks wrong, check the `currentClient` query result in the page server log — the select may need to match the actual column names.

- [ ] **Step 7: Commit**

```bash
git add src/app/portal/quotes/[id]/page.tsx
git commit -m "feat(quotes): render QuoteCustomerDetails card on quote detail page"
```

---

## Task 3: Address column on quotes list page

**Files:**
- Modify: `src/app/portal/quotes/page.tsx`

- [ ] **Step 1: Extend the `quotes` select to include `service_address`**

Find this block:

```tsx
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      base_price,
      discount,
      date_issued,
      valid_until,
      created_at,
      clients ( name ),
      quote_items ( price )
    `)
    .order('created_at', { ascending: false })
```

Add `service_address,` after `created_at,`:

```tsx
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      base_price,
      discount,
      date_issued,
      valid_until,
      created_at,
      service_address,
      clients ( name ),
      quote_items ( price )
    `)
    .order('created_at', { ascending: false })
```

- [ ] **Step 2: Add `address` to the row mapping**

Find this block:

```tsx
    return {
      id: q.id,
      quoteNumber: q.quote_number,
      clientName: client?.name ?? 'No client',
      status: q.status ?? 'draft',
      dateIssued: q.date_issued,
      validUntil: q.valid_until,
      total,
    }
```

Replace with:

```tsx
    return {
      id: q.id,
      quoteNumber: q.quote_number,
      clientName: client?.name ?? 'No client',
      address: q.service_address ?? null,
      status: q.status ?? 'draft',
      dateIssued: q.date_issued,
      validUntil: q.valid_until,
      total,
    }
```

- [ ] **Step 3: Add the Address column header**

Find this block:

```tsx
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Quote #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Valid until</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
```

Insert `<th className="px-5 py-3 font-semibold">Address</th>` between Client and Status:

```tsx
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Quote #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Address</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Valid until</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
```

- [ ] **Step 4: Add the Address data cell**

Find this block (the desktop table row):

```tsx
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{row.quoteNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>{row.status}</span></Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{formatDate(row.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{formatDate(row.validUntil)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{formatCurrency(row.total)}</Link></td>
                  </tr>
                ))}
```

Insert the Address `<td>` between the Client cell and the Status cell:

```tsx
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{row.quoteNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0">
                      <Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">
                        {row.address ? (
                          <span className="block max-w-[180px] truncate" title={row.address}>{row.address}</span>
                        ) : (
                          <span className="text-sage-400">—</span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>{row.status}</span></Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{formatDate(row.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{formatDate(row.validUntil)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{formatCurrency(row.total)}</Link></td>
                  </tr>
                ))}
```

- [ ] **Step 5: Add the address line to the mobile card**

Find this block:

```tsx
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/quotes/${row.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.quoteNumber}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>
                    {row.status}
                  </span>
                </div>
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{formatDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{formatCurrency(row.total)}</span>
                </div>
              </Link>
            ))}
          </div>
```

Replace with (adds one line under `clientName`):

```tsx
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/quotes/${row.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.quoteNumber}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>
                    {row.status}
                  </span>
                </div>
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                {row.address && (
                  <div className="text-sage-500 text-xs truncate">{row.address}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{formatDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{formatCurrency(row.total)}</span>
                </div>
              </Link>
            ))}
          </div>
```

- [ ] **Step 6: Verify type-check passes**

Run: `npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 7: Verify lint passes**

Run: `npm run lint`

Expected: no new errors.

- [ ] **Step 8: Smoke-test in dev**

Open `http://localhost:3000/portal/quotes/` and verify:

- New Address column appears between Client and Status
- Long addresses show an ellipsis
- Hovering over a truncated address for ~1 second reveals the full text in a native browser tooltip
- Rows with no `service_address` show a muted `—` with no tooltip
- On narrow window (<768px), the mobile card view shows the address as a short line under the client name
- Clicking a row still navigates to the quote detail page

- [ ] **Step 9: Commit**

```bash
git add src/app/portal/quotes/page.tsx
git commit -m "feat(quotes): add truncated Address column with tooltip to quotes list"
```

---

## Task 4: End-to-end verification and push

- [ ] **Step 1: Run the full verification pass**

Start the dev server (if not already running) and walk through both surfaces one more time:

**Quote detail page** (`/portal/quotes/[any-id]`)
- Customer card appears above the edit form
- All four fields render, with `—` for any that are missing
- `tel:` and `mailto:` links clickable

**Quote list page** (`/portal/quotes`)
- Address column renders after Client
- Long addresses truncate with ellipsis
- Native tooltip appears after ~1s hover showing full address
- Mobile card view shows address line under client name

- [ ] **Step 2: Confirm no regressions**

Click through the existing quote flows once:
- Create new quote (`/portal/quotes/new`) — still works
- Open an existing quote — edit form still loads correctly
- Edit a quote and save — still persists
- Convert to invoice — still works

- [ ] **Step 3: Push**

```bash
git push -u origin feat/quote-customer-details
```

This publishes the branch to GitHub. Do **not** merge to main yet — wait for the user to review the deploy preview (if Netlify builds feature branches) or explicitly approve the merge.

- [ ] **Step 4: Report back**

Summarise to the user:
- Branch pushed: `feat/quote-customer-details`
- Three commits (Task 1 / 2 / 3 component + detail page + list page)
- Ready to merge to `main` on approval

---

## Self-Review

**Spec coverage:**
- ✅ Customer card on detail page (name/phone/email/address) — Task 2
- ✅ 2×2 grid desktop, stacked mobile — Task 1 (`grid-cols-1 md:grid-cols-2`)
- ✅ `tel:` and `mailto:` links — Task 1
- ✅ Missing values show `—` — Task 1 (MUTED_DASH)
- ✅ Address column on list page with truncation and native tooltip — Task 3
- ✅ Mobile card shows address line under client name — Task 3 Step 5
- ✅ Data fetches extended minimally (one field each) — Tasks 2 & 3
- ✅ No editable UI added, no schema migration — all tasks
- ✅ No new tests (spec explicitly excludes them) — plan honours spec

**Placeholder scan:** No TBDs, no "add appropriate error handling", every code step contains real code.

**Type consistency:** `QuoteCustomerDetailsProps` shape (`name | phone | email | serviceAddress`, all `string | null`) matches the props passed from the detail page in Task 2 Step 3 (`currentClient?.name ?? null`, etc).

**Scope:** Single plan, three focused tasks plus a verification task. Fits one commit group.
