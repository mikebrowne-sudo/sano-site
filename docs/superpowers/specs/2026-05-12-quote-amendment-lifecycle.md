# Quote Amendment Lifecycle — Phase 5 design spec (simplified)

> **Status:** locked direction. Code follows once business signs off
> on the two open questions in §11.
> **Date:** 2026-05-12 (revised — supersedes earlier longer exploration)
> **Owner:** Phase 5
> **Cross-references:**
> - [`docs/PORTAL.md`](../../PORTAL.md) — master brief
> - [`docs/AI/SANO_EXECUTION_MODE.md`](../../AI/SANO_EXECUTION_MODE.md) — operating mode
> - [`docs/superpowers/specs/sano-portal-design-system.md`](./sano-portal-design-system.md) — visual contract

---

## 1. The business rule

> This is a small operational business and staff need flexibility.
>
> Until an invoice is generated, staff can freely amend:
> quote details, job details, descriptions, services, scope, pricing,
> frequency, hours, operational notes.
>
> Once an invoice exists:
> - normal staff can no longer materially edit pricing / scope / details
> - admin override only
> - all admin edits logged
> - invoice snapshot/history preserved

### Explicit non-goals

The portal **is not** building (now or in Phase 5):

- Quote approval chains
- Automated quote v2 flows on amendment
- Customer-facing amendment workflows
- Operational publish states (no "draft vs published" mode)
- Complex revision systems beyond what already exists

Phase 5 is the smallest change that delivers the operational rule above.

---

## 2. The simplified architecture

One concept, one lock point.

> **Invoice existence is the lock point.** Until any invoice exists
> on the chain (quote → job → invoice), staff edit freely. Once an
> invoice exists, the chain is locked for material edits. Admin can
> override with an explicit audit-logged action.

That's it. Three artefacts, one rule.

### What changes from today

| Today | Phase 5 |
|---|---|
| Quote locks at `accepted` / `declined` / `converted` via `isQuoteLocked()` | Quote locks **only** when an invoice exists on its chain |
| Job is editable until status = `invoiced` (partial; some fields always locked, others always editable) | Job is editable until an invoice exists; lock applies to material fields |
| Admin can soft-delete/archive but not amend a converted quote | Admin can amend a locked record via explicit override modal |
| `audit_log` captures lifecycle events | `audit_log` captures every material amendment + every override |

The lock test is **invoice existence**, not status string. Status strings (`accepted`, `converted`, `invoiced`) are unchanged.

---

## 3. Lock semantics

### Single source

A new helper in `src/lib/quote-status.ts` (or a small new module) — pseudo-code:

```ts
function isLockedByInvoice(linkedInvoiceId: string | null): boolean {
  return linkedInvoiceId != null
}
```

The function takes whatever the page already has on hand to know whether an invoice exists. For a quote: the invoice linked to its job. For a job: `jobs.invoice_id`. For an invoice itself: always locked once sent (existing semantics).

### Edit-affordance gate

Wherever the codebase currently calls `isQuoteLocked()` to decide whether to show the edit form / hide the convert button / etc., the call site routes through the new lock helper instead. Specifically:

| Caller | Today | After Phase 5 |
|---|---|---|
| `quotes/[id]/page.tsx` rendering EditQuoteForm | gated by `isQuoteLocked(status)` | gated by `isLockedByInvoice(linkedInvoice?.id)` |
| `quotes/[id]` action-bar showing Send / Accept / Convert buttons | gated on status semantics | unchanged (those are workflow actions, not material edits) |
| `jobs/[id]/edit/page.tsx` job edit form | currently allows edits on any non-archived job | also gated by `isLockedByInvoice(job.invoice_id)` |
| `_actions-job.ts` server actions writing to jobs | minimal guard | guard via `assertNotLockedOrAdmin(job, user)` helper |

Server-side enforcement is the load-bearing piece. UI gating is the affordance; server gating is the safety net.

### Admin override

For the post-invoice case, an admin (per existing `isAdminUser()` helper) can amend a locked record. The override is **explicit** — same shape as the existing `cleanup-mode` flow:

1. Admin sees an "Edit anyway" affordance with a destructive-styled warning.
2. Modal: "Editing a locked record. The invoice has already been generated. Your change will be logged. Are you sure?"
3. Confirming writes:
   - The amended fields to the record
   - One `audit_log` row with `action: 'X.amended_after_invoice'`, `actor_id`, `actor_role: 'admin'`, `before / after` payloads
4. Server actions reject the write unless `actor` passes the admin check.

This is **operational discretion, not a workflow primitive.** Admin override is the safety valve for "I need to fix something the customer disputed after invoicing". It's not a feature staff should use in normal flow.

---

## 4. Material vs non-material fields

Not all fields lock. **Operational fields stay editable always** — the lock applies only to fields that affect billing or scope of work.

### Material fields (locked when an invoice exists)

Editing these post-invoice requires admin override:

**On the quote:**
- `base_price`, `discount`, `gst_included`, `payment_type`
- `calculated_price`, override fields
- `quote_items` (the line-item table)
- `service_category`, `service_type_code`, `property_type`, `bedrooms`, `bathrooms`
- `areas_included`, `condition_tags`, `addons_wording`
- `generated_scope`, `description_edited`
- `frequency`, `scope_size`
- `commercial_quote_details.*`, `commercial_scope_items.*`

**On the job:**
- `job_price`
- `allowed_hours`
- `description` (where it carries operational scope)
- `address` (the service location)
- `scope_snapshot` (already immutable; stated here for clarity)

### Non-material fields (always editable)

These don't affect billing; staff edit freely regardless of lock state:

- `scheduled_date`, `scheduled_time`, `duration_estimate`
- `contractor_id`, `assigned_to`
- `access_instructions`
- `internal_notes`, `contractor_notes`
- `payment_status` (operational, not billing — orthogonal)
- `reviewed_at` / `reviewed_by`
- `started_at`, `completed_at`, `actual_hours` (operational truth)

### The boundary

The two lists keep this question simple: **does changing this field change what we billed?** If yes, lock. If no, always editable.

---

## 5. Minimum schema changes

**None required.**

- Lock function reads `invoice_id` (already on `jobs`) or the linked-invoice presence (already loaded on `quotes/[id]/page.tsx` per Phase 3).
- `audit_log` already exists; new action verbs are just strings.
- `scope_snapshot` on jobs is already immutable by convention (kept as historical reference).
- Existing `record_snapshots` table (used by archive/restore) provides the rollback paper trail.

**Optional, can be deferred indefinitely:**

- `jobs.amended_at TIMESTAMPTZ` + `jobs.amended_by UUID` — for fast "this job has been amended after acceptance" queries / list-page badges. Adds value to UI later; not required for the lock semantics.
- `quotes.amended_at` / `quotes.amended_by` — same.

Recommendation: ship Phase 5 **without** these columns. Add them only when a future phase wants the badge or a list-page filter. The decision can be deferred.

---

## 6. Minimum UI changes

### Quote detail page (`/portal/quotes/[id]`)

- The existing "Edit" affordance becomes available on `accepted` / `converted` quotes when no invoice exists on the linked job. The EditQuoteForm is already implemented; the change is purely the lock-function call.
- When an invoice exists, a sage-100 banner replaces the edit affordance: **"Locked by INV-1234. Material edits require admin override."** with an "Open invoice" link to the right.
- Admin sees an additional "Edit anyway" affordance next to the banner; clicking opens the override warning modal.

### Job detail page (`/portal/jobs/[id]`) and edit page

- The existing "Edit Job" button is available until an invoice exists. After that, same banner pattern with the admin override.
- The existing "Mark as Reviewed" / "Mark In Progress" / "Mark Completed" buttons stay — these are workflow actions on non-material fields and aren't locked.

### Admin override modal

Single shared component (e.g., `<AmendmentOverrideModal>`):

```
┌─────────────────────────────────────────────────────────┐
│ Edit a locked record                                    │
│                                                         │
│ This quote/job has already been invoiced (INV-1234).    │
│ Editing will change the operational record but will     │
│ NOT change the invoice itself. The change will be       │
│ logged.                                                 │
│                                                         │
│ Continue?                                               │
│                                                         │
│                                  [Cancel] [Edit anyway] │
└─────────────────────────────────────────────────────────┘
```

The modal posts to the relevant edit action with a `force: true` flag that the server-action accepts only if the caller is admin. The action writes the audit_log row inside the same transaction as the edit.

### Audit-timeline visibility

The per-entity audit timeline already exists on `/portal/clients/[id]` from Phase 4B. Phase 5 extends the same panel to `/portal/quotes/[id]` and `/portal/jobs/[id]` (last 10 events by default, "Show all" expands). Each entry: actor name · action label · time-ago. Existing pattern, no new chrome.

This is the "what changed?" answer for any staff member looking at a locked record.

---

## 7. Rollout — single phase

The whole change ships in **one focused PR** (call it Phase 5B since 5A was the spec). Three commits inside that PR:

### Commit 1: lock helper + server-side enforcement

- `src/lib/quote-status.ts` — add `isLockedByInvoice(linkedInvoiceId)` helper.
- Server actions for quote-edit, job-edit, line-item-edit get a `force?: boolean` arg and an `assertCanAmend(record, user, force)` guard. Without `force` they reject when an invoice exists; with `force` they accept only if `isAdminUser(user)` returns true.
- Every accepted edit writes an `audit_log` row (`quote.amended` or `job.amended`). Existing edits that already wrote audit rows are unchanged.
- Override-path edits write a distinct action verb (`quote.amended_after_invoice` / `job.amended_after_invoice`) so the audit timeline can flag them.

### Commit 2: page-level affordances + lock banner + override modal

- `quotes/[id]/page.tsx` routes the existing edit-gate through the new lock helper. The action bar's "Edit" button hides for non-admin when invoice exists; admin sees the override-warning version.
- `jobs/[id]/page.tsx` + `jobs/[id]/edit/page.tsx` same.
- New `<AmendmentOverrideModal>` client component, single shared definition. Posts to the relevant action with `force: true`.

### Commit 3: audit timeline on quote + job detail pages

- Lift the existing `/portal/clients/[id]` audit-timeline section into a shared `<AuditTimelinePanel>` component.
- Mount on `quotes/[id]` and `jobs/[id]`.
- Filter on `entity_table = 'quotes'` / `'jobs'` respectively.

That's the whole phase. No new tables, no schema migration, no new state machine.

---

## 8. Files likely touched

| File | Change |
|---|---|
| `src/lib/quote-status.ts` | Add `isLockedByInvoice()`. Optionally deprecate `isQuoteLocked()` once all callers migrate. |
| `src/app/portal/quotes/[id]/page.tsx` | Route the edit-gate through the new helper. Render lock banner / override affordance. |
| `src/app/portal/quotes/[id]/_actions.ts` (and related) | Add `assertCanAmend()` guard on write paths. Accept optional `force` flag (admin-only). Write audit row. |
| `src/app/portal/jobs/[id]/page.tsx` + `jobs/[id]/edit/page.tsx` | Same lock + override + audit. |
| `src/app/portal/jobs/[id]/_actions*.ts` | Guard write paths. |
| `src/app/portal/_components/AmendmentOverrideModal.tsx` | New shared client component. |
| `src/app/portal/_components/AuditTimelinePanel.tsx` | Extract from `clients/[id]/page.tsx`; mount on quotes/[id] + jobs/[id]. |
| `src/app/portal/_components/LockBanner.tsx` (optional) | Reusable lock banner with override-CTA slot. |

No supabase migration. No new table. No new column. No backfill.

---

## 9. Cleanest lock/unlock logic

```ts
// src/lib/quote-status.ts — single helper, one rule
export function isLockedByInvoice(linkedInvoiceId: string | null | undefined): boolean {
  return !!linkedInvoiceId
}

// Server-action guard pattern (pseudo-code)
async function assertCanAmend(opts: {
  linkedInvoiceId: string | null
  user: { email?: string | null } | null
  force?: boolean
}): Promise<{ ok: true; overridden: boolean } | { error: string }> {
  if (!isLockedByInvoice(opts.linkedInvoiceId)) return { ok: true, overridden: false }
  if (opts.force && isAdminUser(opts.user)) return { ok: true, overridden: true }
  return { error: 'This record is locked by an invoice. Admin override required.' }
}

// Usage inside e.g. updateQuote()
const guard = await assertCanAmend({ linkedInvoiceId, user, force: input.force })
if ('error' in guard) return guard
// ... perform write ...
await supabase.from('audit_log').insert({
  actor_id: user.id,
  actor_role: guard.overridden ? 'admin' : 'staff',
  action: guard.overridden ? 'quote.amended_after_invoice' : 'quote.amended',
  entity_table: 'quotes',
  entity_id: quoteId,
  before: beforeDiff,
  after:  afterDiff,
})
```

Lock state has **two outcomes**: editable, or editable-by-admin-with-override. There's no third state, no soft-lock, no partial-lock. The material/non-material distinction is handled by **which fields the edit form exposes** — non-material fields on the job have their own edit affordances (assign contractor, mark reviewed, etc.) that don't route through `assertCanAmend`.

---

## 10. Risks

### Financial integrity

- **Risk:** an admin override changes pricing on a quote/job after the invoice was sent. The invoice itself is untouched, but the operational record diverges.
- **Mitigation:** the override modal is explicit ("will NOT change the invoice itself"). Staff training: amend the operational record only when reconciling — e.g., the customer disputed a line item. The invoice stays as the billing record of truth.
- **Defence in depth:** Phase 5 doesn't touch `invoice_items` from the override path. Those are reachable only via the existing invoice edit flow which has its own admin gating.

### Sent customer documents

- **Risk:** an amendment lands AFTER the invoice was sent. Customer's emailed PDF doesn't match what the portal now shows.
- **Mitigation:** the invoice PDF is generated from the invoice snapshot, which is frozen at send. The portal's quote/job pages now show the amendment; the invoice page still shows the original billed state. Operator can re-send if appropriate.

### Audit visibility

- **Risk:** staff don't realise their edits are creating audit rows.
- **Mitigation:** the audit timeline panel on detail pages makes the trail visible. The override modal explicitly says "will be logged".

### Confusion between locked and editable

- **Risk:** staff click Edit, see locked banner, think the system is broken.
- **Mitigation:** the banner explains WHY ("Locked by INV-1234") and shows the admin-only override affordance. If they're admin, the path is one click away. If not, they ask the admin.

### Over-use of admin override

- **Risk:** admin override becomes the default path because staff give up on the regular flow.
- **Mitigation:** track override actions in the audit log; review during operational retros. This is a process discipline issue, not a code issue. The audit makes it visible.

### Existing `isQuoteLocked()` callers

- **Risk:** callers we miss continue to gate on the old function and block legitimate edits.
- **Mitigation:** the deprecation path keeps `isQuoteLocked()` exported with a JSDoc note pointing to the new helper. Phase 5B audit walks every caller and migrates them. Grep coverage is straightforward.

---

## 11. Open questions for business

Down to two:

1. **Admin override on `invoice_items` / `invoice.base_price`?** Phase 5 keeps the invoice itself untouched by the amendment flow — admin override only affects the quote/job. If business wants the override to ALSO be able to amend the invoice (e.g., genuine billing-error correction), that's a separate path: extending the existing custom-invoice flow's edit semantics, with its own audit verb. Out of scope unless requested.

2. **Audit timeline visibility to non-admin staff?** Phase 5 mounts the audit-timeline panel on quote / job detail pages for all staff. The panel shows actor + action + time. Should it: (a) show every audit event including override edits, or (b) hide override events from non-admin viewers? Recommendation: (a) — transparency aids trust.

---

## 12. Recommended next step

Get sign-off on §11, then implement Phase 5B as **one PR with three commits** (per §7). Estimated effort: half a day to a day, primary risk is callsite coverage on `isQuoteLocked()`.

After Phase 5B ships and we have operational data on real amendments, evaluate whether to introduce `jobs.amended_at` / `jobs.amended_by` columns for surfacing in lists (Phase 5C, additive migration only). That decision can be deferred — Phase 5B works fully without it.

---

## 13. Appendix — earlier exploration

A longer version of this spec (now superseded) considered two paths:

- **Option A — lift the quote lock** (what's now §2-§9 of this revised doc, with refinements).
- **Option B — `jobs.operational_scope jsonb` as a separate live editable scope** distinct from the quote and from `scope_snapshot`. Cleaner three-artefact model. Required one additive migration and a new UI panel.

Business chose the simpler path. The reasons against Option B for this scale:

- Adds a second scope structure on the job. UI must explain "agreed scope vs live scope" to staff. Operationally heavier.
- Schema migration for a model the team may not need at current volume.
- Quote-versioning already exists for the customer-facing record. The operator doesn't need a second versioning mechanism.

If the business grows to where amendments are frequent enough to warrant a structured operational scope (e.g., recurring contracts that change weekly), Option B remains the natural next step. For now: simpler wins.
