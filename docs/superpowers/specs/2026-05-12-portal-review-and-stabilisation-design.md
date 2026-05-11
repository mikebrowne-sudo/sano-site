# Sano Portal — Review and Stabilisation Plan

> Spec for a structured portal audit + phased stabilisation. **No code changes
> in this spec.** Output is a plan for the user to approve before any code
> phase begins. Honours `docs/AI/SANO_EXECUTION_MODE.md` ("Reuse existing
> patterns before creating new abstractions", "Do not rewrite working systems
> unless explicitly instructed", "Prefer incremental improvements over large
> rewrites").

- **Date:** 2026-05-12
- **Author:** Claude Code (audit pass)
- **Status:** Draft for review — awaiting user approval of the phased plan
- **Scope:** Portal CRM at `/portal`, contractor mobile views at `/contractor`, public share at `/share`, related API + lib code. Marketing site out of scope.
- **Sources:** `docs/PORTAL.md` (Phases 0–J shipped), `docs/AI/STATE.md`, `docs/AI/SANO_EXECUTION_MODE.md`, live codebase mapping via 4 parallel Explore agents

---

## TL;DR

The portal is **functional end-to-end** (quote → proposal → job → invoice → payment → payroll → recurring contracts → notifications) but has accumulated three classes of debt that explain the "clunky and over-developed" feel:

1. **List/detail UI is 70% consistent, 30% bespoke.** Jobs and Invoices use the shared `PortalListTable`. Quotes uses a hand-rolled inline table. Every entity has its own workflow bar, next-step panel, and status logic — three near-identical UI patterns implemented three times.
2. **Form layer is enormous and unstructured.** `NewQuoteForm.tsx` (1,057 lines), `EditQuoteForm.tsx` (1,043 lines), `CommercialDetailsSection.tsx` (806 lines), `JobSetupWizard.tsx` (517 lines). Each owns its own input markup, validation patterns, and state. No `FormField`/`FormSection` primitive shared.
3. **Architectural single-source-of-truth helpers exist but are partially adopted.** `is-admin.ts` exists but ~10 files still inline `user.email === 'michael@sano.nz'`. `quote-status.ts` is the source of truth for status labels/styles, but display-status computation is split across `quote-status.ts`, `job-status.ts`, and inline helpers in invoice page.tsx. Status pattern is right; coverage is incomplete.

**Recommendation:** Do NOT rewrite. The architecture is sound. Run a 7-phase stabilisation that lands a small shared design system, finishes the admin/status migrations already started, and folds the bloated forms into composable sections. Estimated work: 4–6 focused phases over the next 1–2 months, each shippable independently. Phase 1 (this spec + agreement) is the only "design" phase; everything after that is execution against the agreed pattern.

**Recommended starting point:** **Phase 2 — Low-risk cleanups** (admin-migration completion + format-helper extraction + `scope_snapshot` audit). All near-zero risk. Builds momentum and verifies the audit findings in code.

---

## 1. Current portal structure

### 1.1 Routes (high-level surface area)

96 routes total in the App Router tree:

| Area | Routes | Notes |
|---|---|---|
| `/portal/**` | 69 | Staff CRM; 66 server components, 3 client (login, new-client form, new-payroll form) |
| `/contractor/**` | 8 | Contractor mobile; 7 server, 1 client (login) |
| `/share/**` | 4 | Public token-keyed quote/invoice/service-agreement views; all server |
| `/proposals/**` | 1 | Proposal print route for Puppeteer; server |
| `/api/**` | 14 | PDF, Stripe, Twilio, submit-quote/application, cron |

Per-section route counts under `/portal/`:

| Section | Routes |
|---|---|
| `settings/` | 9 |
| `payroll/` | 7 |
| `quotes/` | 7 |
| `jobs/` | 6 |
| `invoices/` | 4 |
| `clients/` | 3 |
| `contractors/` | 4 |
| `contractor-invoices/` | 4 |
| `staff/` | 4 |
| `recurring-jobs/` | 4 |
| `training/` | 4 |
| Other (`alerts`, `applicants`, `cleanup`, `commercial-calculator`, `finance`, auth) | 13 |

**Architectural observation:** Heavy server-rendering (78/82 page routes). Good for performance + cohesion. Only 4 routes are client components — all are inherently interactive forms where SSR doesn't help.

### 1.2 Data model (live tables)

Per `docs/PORTAL.md` "Data structure". 21 tables, roughly grouped:

- **Sales:** `clients`, `quotes`, `commercial_quote_details` (1:1), `commercial_scope_items` (1:N)
- **Operations:** `jobs`, `job_workers`, `recurring_jobs`, `recurring_contract_reminders`
- **Billing:** `invoices`
- **Workforce:** `contractors`, `worker_documents`, `training_modules`, `worker_training_assignments`, `applicants`
- **Payroll:** `pay_runs`, `pay_run_lines` (employee), `pay_run_items` (contractor), `payslips`
- **Settings + audit:** `proposal_settings`, `job_settings`, `notification_settings`, `notification_templates`, `notification_logs`, `record_snapshots`, `audit_log`

**Soft-delete pattern is consistent** across the three high-stakes entities (quotes, invoices, jobs) — `deleted_at`/`deleted_by` columns + `record_snapshots` for full-row reversibility + `audit_log` entries. This is genuinely solid architecture.

### 1.3 Quote → Job → Invoice connections (live)

```
clients
  │
  └─► quotes ─────────────────────────────────────┐
        │ (version_number, parent_quote_id,      │
        │  is_latest_version)                    │
        │                                        │
        ├─► commercial_quote_details (1:1)      │
        │                                        │
        ├─► commercial_scope_items (1:N)        │
        │                                        │
        ├──► [Path A: createJobFromQuote] ──────┤
        │           snapshots scope to          │
        │           jobs.scope_snapshot jsonb   │
        │                                        ▼
        ├──► [Path B: convertToInvoice] ─────► invoices
        │           copies billing/contact     ▲
        │           override + pricing fields  │
        │                                        │
        └──► [Path C: createJobAndInvoiceFrom-  │
                  Quote] creates both, links  ▼
                  job.invoice_id ─────────► jobs
                                              │
                                              ├─► job_workers (1:N — contractor assignment + hours)
                                              │
                                              └──► [createInvoiceFromJob]
                                                          │
                                                          ▼
                                                       invoices (if Path A was used + invoicing later)
```

**Critical pattern observations:**

- `scope_snapshot` jsonb on jobs is a **deliberate point-in-time copy**. Job stays stable even if the source quote is edited (new version) or archived. Correct architectural decision.
- Invoice carries **~12 fields copied from quote** at conversion: billing contact name/email/phone, accounts contact, client reference, requires PO, price-override fields, calculated price. Snapshot pattern again — invoice is the source of truth for its own line, not the quote.
- Three conversion server actions exist:
  - `_actions-job.ts::createJobFromQuote()` — 202 lines
  - `_actions-invoice.ts::convertToInvoice()` — 159 lines
  - `_actions-job-and-invoice.ts::createJobAndInvoiceFromQuote()` — 276 lines (duplicates invoice-creation logic from `_actions-invoice.ts`)
- `createInvoiceFromJob()` exists separately in `jobs/[id]/_actions.ts` (within the 481-line job actions file) for the path where job ships before invoice.
- `createJobFromInvoice()` exists in `invoices/[id]/_actions-job.ts` (82 lines) for the reverse linkage.

**Net: 5 entry points that all produce or link the same {quote, job, invoice} graph** with subtly different defaults (payment_status, redirect target, audit-log action name).

### 1.4 Main components by category

| Layer | Component | Lines | Status |
|---|---|---|---|
| **Forms (quote)** | `NewQuoteForm.tsx` | 1,057 | Overgrown — residential + commercial branches in one file |
| | `EditQuoteForm.tsx` | 1,043 | Overgrown — same problem, plus in-place vs new-version branching |
| | `commercial/CommercialDetailsSection.tsx` | 806 | Large but cohesive (sector packs are config-driven) |
| | `commercial/CommercialScopeBuilder.tsx` | 526 | Table UI for task selection |
| | `commercial/CommercialProposalTemplate.tsx` | 602 | Legacy commercial print template (now superseded by shared proposal renderer but kept) |
| | `quotes/[id]/_components/JobSetupWizard.tsx` | 517 | Multi-step contractor assignment + scheduling |
| | `QuoteBuilder.tsx` | 446 | Residential wording builder (used by both New + Edit) |
| **Forms (job)** | `JobForm.tsx` | ~400 | Reasonable |
| **Forms (invoice)** | `CustomInvoiceForm.tsx` | ~280 | Reasonable |
| **Lists** | `PortalListTable.tsx` | ~280 | Shared primitive (used by Jobs + Invoices, NOT Quotes) |
| | `quotes/page.tsx` | 439 | Hand-rolled table inline; mobile + desktop markup duplicated |
| | `jobs/page.tsx` | 513 | Uses `PortalListTable` but still has 5 tab definitions + sort helpers inline |
| | `invoices/page.tsx` | 410 | Uses `PortalListTable`; similar tab + sort inline |
| **Detail action bars** | `quotes/[id]/_components/QuoteWorkflowBar.tsx` | ~150 | Quote-only |
| | `jobs/[id]/_components/JobWorkflowBar.tsx` | 169 | Job-only |
| | `invoices/[id]/_components/SendInvoicePanel.tsx` | ~200 | Invoice-only |
| **Status helpers** | `src/lib/quote-status.ts` | 155 | Source of truth for quote+invoice+job labels/styles (good) |
| | `src/lib/job-status.ts` | ~80 | Derived `getJobStatus()` (5-status DB → 7-stage visual) |
| | `src/lib/attention-rules.ts` | ~150 | Shared `needsAttention` rules for all 3 entities |
| **Admin gate** | `src/lib/is-admin.ts` | ~30 | Helper exists but ~10 files still inline `michael@sano.nz` |

---

## 2. Current UX issues

These are the issues a staff user would notice. Cited specifically rather than asserted; speculative items flagged as such.

### 2.1 What feels clunky

1. **The quote detail page has at least 5 distinct panels stacked.** Workflow bar + status message + main detail + version history + next-step panel + sticky action bar. Each was added in a phase (A, B, D, F) without an integrated layout pass. Result: a lot of vertical scroll on long quotes.
2. **Three different list table interactions across quotes/jobs/invoices.** Jobs and Invoices share `PortalListTable` with consistent sort/mobile-card behaviour; Quotes is hand-rolled with its own sort function (`applyQuoteSort()`) and duplicated mobile/desktop markup. A staff member moving between Quotes and Jobs gets subtly different sorting + selection patterns.
3. **The "Needs attention" tab is the first tab in all three lists but uses different rule shapes per entity.** `getQuoteAttention()`, `getJobAttention()`, `getInvoiceAttention()` each return `{ needsAttention, reasons[], nextStep }` but the rule sets and the explanatory copy are independently maintained.
4. **No global toast.** Per `PORTAL.md` "Next priorities" #8: *"global toast primitive to unify the inline-flash feedback across actions"*. Currently each action surfaces its own inline flash (or nothing). Staff don't get consistent confirmation feedback.

### 2.2 Where staff may get confused

1. **Status display is correct but inconsistent in derivation.**
   - Quote: shown directly from `quote.status` DB enum + locked/converted helpers.
   - Job: shown from a *derived* `getJobStatus()` that maps 5 DB values into 7 visual stages (e.g. `draft + has scheduled_date` → "Scheduled"; `invoiced + reviewed_at null` → "Reviewed" placeholder).
   - Invoice: shown from a *computed* `computeInvoiceDisplayStatus()` (wraps `status` + `due_date` to surface "overdue" without storing it).
   The three are correct individually, but a staff member can't predict from one entity how status will behave on another.
2. **Job has both `status` (DB enum) and `payment_status` (DB enum) as independent pills.** Workflow advances via `status`; billing advances via `payment_status`. Documented; still cognitively heavy on the detail page.
3. **Three paths from accepted quote to operational record** (Create Job · Create Invoice · Create Job + Invoice). Each path has different consequences (payment_status default, redirect, audit-log action). The recommended-path highlight per service category helps; the underlying difference is still subtle.
4. **Quote versions vs quote archive vs quote convert.** Three distinct "what happens next" states for a quote. Documented in copy on the workflow bar; still surfaces a lot of state on one screen.

### 2.3 Where too much information is shown

- **Quote detail page** (per 2.1).
- **Job detail page** (614 lines of `page.tsx`) renders: workflow bar, status pills, payment-status pill, scheduling card, assignment modal trigger, actual-hours editor, mark-reviewed action, notifications panel, next-step card, archive button, duplicate button, create-recurring button, link-back-to-quote banner. Each useful in isolation; together overwhelming.
- **List "needs attention"** chips show reasons + next-step text. Useful, but can chain 2–3 chips per row, which reads as visual noise on dense list views.

### 2.4 Where key information is hard to find

- **`scope_snapshot` data on jobs is written but never consumed by UI** (per the Explore agent's findings on `_actions.ts`). The agreed scope at job-creation time is in `jobs.scope_snapshot` jsonb, but the job detail page derives display from the live `quote_id`/`commercial_scope_items` link. If the quote is later edited or a new version supersedes, the original agreed scope is **technically preserved** but **not shown**. This is a silent gap — could matter for disputes.
- **Audit log is not surfaced in the UI**. `audit_log` rows are written for sensitive actions; the only consumer is the Archive page's restore flow. A "history" timeline per entity would be valuable but doesn't exist.
- **`record_snapshots`** (full-row pre-mutation copies) — same story. They power restore but aren't visible.

### 2.5 Where actions are unclear

- **Quote action bar copy is good** ("Send Proposal", "Mark as Accepted", "Send Reminder") on draft/sent/viewed states. After accepted, the next-step panel takes over and copy is again clear.
- **Job action set is denser.** Assign Only vs Assign + Notify; Mark Reviewed; Create Invoice From Job; Duplicate; Archive. Could be grouped into a single primary CTA + overflow menu pattern.
- **Invoice has fewer competing actions** (Send Email + Pay Link + Mark Paid + Archive). Cleanest of the three by accident — fewer features were added on the invoice detail page.

---

## 3. Quote → Job → Invoice flow review

### 3.1 What happens when a quote is created

**Residential path:**

1. User opens `/portal/quotes/new` (server component, 64 lines) which renders `NewQuoteForm` (client, 1,057 lines).
2. User selects `service_category` + `service_type_code`, fills `property_type`, `bedrooms`, `bathrooms`, `site_type`, `frequency`, `areas_included[]`, `condition_tags[]`, `addons_wording[]`. Live preview of `generated_scope` renders via `generateQuoteScope()` from `src/lib/quote-wording.ts` (569 lines, pure functions).
3. Pricing engine (`src/lib/quote-pricing.ts`, 381 lines) computes `calculated_price` from structured inputs + admin-editable pricing settings; override is available but gated.
4. `createQuote()` server action (in `_actions.ts`, 376 lines) inserts the quote row, generates `quote_number`, persists `generated_scope`, redirects to `/portal/quotes/[id]`.

**Commercial path:**

1. Same entry; `service_category === 'commercial'` switches the form to render `CommercialDetailsSection` (806 lines) + `CommercialScopeBuilder` (526 lines) + `CommercialPricingPreview`.
2. User picks `sector_category` + fills sector-specific fields from `SECTOR_FIELD_PACKS` config; adds scope rows; selects margin tier.
3. `computeCommercialPreview()` calculates per-visit/weekly/monthly hours + sell price; staff can "Apply to base price".
4. `createQuote()` inserts the quote row + inline-writes `commercial_quote_details` + `commercial_scope_items[]` before redirect.

**Risk flag:** Two parallel scope systems (residential structured items vs commercial scope rows) means scope-related changes touch both. Acceptable trade-off given how different the UX needs are, but worth noting.

### 3.2 What happens when a quote is accepted

1. Customer opens `/share/quote/[token]` (no auth). Server-rendered page calls `acceptQuote()` via the AcceptQuote client component.
2. `_actions.ts::acceptQuote()` (114 lines) marks `status='accepted'`, sets `accepted_at`, writes audit row, increments share view counts.
3. The original quote row is *not* changed beyond status. No data is copied yet — that happens at conversion.
4. Staff sees the accepted state on the quote detail page. The `QuoteNextStepPanel` renders three conversion cards.

### 3.3 How job details are created or carried across

Three conversion paths, all originating from an accepted, `is_latest_version=true` quote:

| Path | Server action | Lines | Default `payment_status` | Redirect | Audit action |
|---|---|---|---|---|---|
| Create Job | `createJobFromQuote()` | 202 | `on_account` (or `default_payment_status` from `job_settings`) | `/portal/jobs/[id]` | `quote.converted_to_job` |
| Create Invoice | `convertToInvoice()` | 159 | n/a (no job yet) | `/portal/invoices/[id]` | `quote.converted_to_invoice` |
| Create Job + Invoice | `createJobAndInvoiceFromQuote()` | 276 | `payment_pending` | `/portal/jobs/[id]` | `quote.converted_to_job_and_invoice` |

**What's carried into the job (Path A or C):**

- `scope_snapshot` jsonb: snapshot of residential items or commercial scope items at time of conversion
- `quote_id` (FK link back)
- `service_address`, `scheduled_clean_date`, `client_id`
- `job_price` from quote's `calculated_price` (or override)
- `allowed_hours` from quote's `estimated_hours`
- `contractor_price` defaulted from contractor's `hourly_rate` × `allowed_hours` (set during assignment, not at conversion)

**What's carried into the invoice (Path B or C):**

- All universal billing fields: `contact_name/email/phone`, `accounts_contact_name/email`, `client_reference`, `requires_po`
- Pricing fields: `base_price`, `discount`, `gst_included`, `payment_type`, `calculated_price`
- Override snapshot: `is_price_overridden`, `override_price`, `override_reason`, `override_confirmed`, `override_confirmed_by`, `override_confirmed_at`
- `service_address`, `scheduled_clean_date`, `notes`
- Due date computed by `computeInvoiceDueDate()` from `src/lib/invoice-dates` based on `payment_type` + service date
- `quote_id` (FK link back)
- `invoice_number` (generated)

### 3.4 How invoices are created

Four entry points:

1. **From an accepted quote** — `convertToInvoice()` action; uses snapshot pattern above.
2. **From a completed job** — `createInvoiceFromJob()` action (in `jobs/[id]/_actions.ts`, ~482 lines total). Uses `completed_at` (preferred) or `scheduled_date` for the service date, pulls billing fields from `client` and `quote` (if linked), computes due date.
3. **Combined with job from quote** — `createJobAndInvoiceFromQuote()` action; same logic as #1 but writes invoice first, then job linked to it.
4. **Custom (admin)** — `/portal/invoices/custom/new` route → `createCustomInvoice()` action (`_actions-custom.ts`, 127 lines). Standalone invoice not linked to any quote/job. Admin-only.

**Duplication flag:** Paths #1 and #3 both run essentially the same invoice-insert logic. The duplication is intentional (different redirect, different audit action, different `payment_status` default on the paired job) — but `~40 lines of the invoice-insert sequence is repeated`. An extracted helper would let both call the same write path with different callbacks.

### 3.5 What data is duplicated

| Field | Quote | Job | Invoice | Notes |
|---|---|---|---|---|
| Billing contact (name/email/phone) | ✓ | — | ✓ (copied at conversion) | Snapshot pattern — correct |
| Accounts contact (name/email) | ✓ | — | ✓ | Snapshot |
| Client reference / requires_po | ✓ | — | ✓ | Snapshot |
| Override fields (price/reason/confirmer) | ✓ | — | ✓ | Snapshot |
| `service_address` | ✓ | ✓ | ✓ | Snapshot — present on each because each can be edited independently |
| `scheduled_clean_date` / `scheduled_date` | ✓ | ✓ | ✓ | Same — operational records can drift |
| `base_price` / `job_price` | ✓ | ✓ | ✓ | Snapshot |
| Scope | structured (items) | `scope_snapshot` jsonb | — | Job has point-in-time copy |
| Status enum | `quote.status` | `jobs.status` + `jobs.payment_status` | `invoices.status` | Independent per entity (correct) |
| Soft-delete (`deleted_at` / `deleted_by`) | ✓ | ✓ | ✓ | Consistent reversibility pattern |

**Architectural verdict:** The duplication is mostly *intentional snapshot pattern*, which is correct for an operational system where each record needs to be the source of truth for its own line. The risk is not the duplication itself — it's that field-level edits don't propagate. Example: if a staff member updates the customer's email on the client, the invoice and quote already-issued don't update. This is correct, but should be obvious in the UI.

**Genuine duplication concerns:**

- Three places ask "what is the service date for this entity" — `quotes.scheduled_clean_date`, `jobs.scheduled_date`, `invoices.scheduled_clean_date`. `src/lib/invoice-dates.ts::resolveServiceDate()` exists but call sites haven't all been migrated.
- Invoice-creation logic duplicated between two server actions (per 3.4).

### 3.6 What is the source of truth?

- **Customer contact details:** `clients` table — but each downstream record snapshots at issue time. Live edits to client don't retroactively update issued docs. This is correct (legally and operationally) but is *implicit* — there's no UI cue to staff that an edit will only affect new records.
- **Service address / date:** Operational records (job, invoice) are authoritative once created. Quote remains the original commitment.
- **Agreed scope:** Quote latest-version (`is_latest_version=true`). After conversion: `jobs.scope_snapshot` is the authoritative record of what was agreed (but isn't surfaced in UI).
- **Pricing:** Invoice's `base_price` + `calculated_price` are the source of truth for what the customer owes. Quote remains historical.

### 3.7 What is missing or risky

| Item | Severity | Notes |
|---|---|---|
| `scope_snapshot` not surfaced in UI | **Medium** | Data preserved but invisible. Dispute risk: "the customer says we agreed X; the quote was edited; nobody can easily see what was originally agreed without reading jsonb manually." Could add a `<ScopeSnapshotPanel>` to job detail. |
| Audit log not surfaced | **Low** | Power-user feature; not staff-blocking. |
| Invoice-creation duplication | **Low** | Maintainability cost only — functionally correct. |
| Inline `michael@sano.nz` checks | **Medium** | Per PORTAL "Next priorities" #4. Security and maintainability — if email ever needs to change (e.g. role-based admin), 10+ files need patching. |
| Bloated form components | **Medium** | EditQuoteForm + NewQuoteForm = 2,100 lines. Tiny UX change → meaningful regression risk. Test coverage doesn't compensate (baseline is 3 pre-existing failing suites; tests around these forms aren't comprehensive). |
| `auto_create_job_on_invoice` setting not wired | **Low** | Per PORTAL "Next priorities" #5 — wiring branch was prepared but not merged. |

---

## 4. Visual / UI review

### 4.1 Current layout patterns

The portal **does** have a coherent visual identity — Sano sage palette, Inter typeface, generous padding, clear card boundaries, badge-driven status. The premium-CRM feel is there. The inconsistency is structural, not visual:

- **Detail pages** all use a card-grid layout with sticky action bar at bottom, but the action-bar component is implemented three times.
- **List pages** are 90% visually identical (tabs, search/filter, table, pagination) but quotes' implementation is independent.
- **Forms** all use the same Tailwind class conventions, but no shared `<FormField>` / `<FormSection>` primitives, so consistency is enforced by manual class repetition.

### 4.2 Table / list consistency

| Section | Table | Sort | Mobile | Tabs |
|---|---|---|---|---|
| Quotes | Inline hand-rolled | `applyQuoteSort()` | Duplicated mobile card markup inline | 4 hard-wired tabs in page.tsx |
| Jobs | `PortalListTable` | `applyJobSort()` + `urlSortToSettings()` | Delegated to `PortalListTable` | 5 hard-wired tabs in page.tsx |
| Invoices | `PortalListTable` | `applyInvoiceSort()` | Delegated to `PortalListTable` | 5 hard-wired tabs in page.tsx |

Recommendation: migrate Quotes to `PortalListTable`. Extract tab definitions into a shared shape (e.g. `LifecycleTabConfig`).

### 4.3 Card / detail-page consistency

Three detail pages, three workflow bars, three next-step panels, three sets of action buttons. The visual *appearance* converges (same Tailwind, same badge component) but the underlying components are independent files.

Candidates for a small design system:

- `<DetailActionBar>` — sticky bottom bar with primary CTA + overflow
- `<DetailWorkflowBar>` — stage indicator + status message
- `<DetailNextStepCard>` — full-width panel with recommended actions
- `<DetailLinkedRecords>` — already exists in 3 forms (quote/job/invoice) — converge

### 4.4 Form consistency

All forms use Tailwind classes directly. No `<Input>`, `<Select>`, `<Textarea>`, `<FormField>` primitives. Consistency holds by convention (developer discipline). When forms exceed 500 lines, that convention breaks down.

Candidates for a tiny form primitives layer:

- `<FormField label="..." hint="..." error={...}><input ... /></FormField>` — wraps label + hint + error in standard markup
- `<FormSection title="..." description="...">` — wraps grouped fields with consistent spacing

Not React Hook Form, not Formik — just markup primitives. The portal's state model is fine as-is (server actions + minimal client state); the problem is markup repetition.

### 4.5 Navigation issues

- Portal nav (sidebar) is consistent and well-structured. Not a complaint area.
- Within-entity navigation (back buttons, breadcrumbs) varies. Some pages have a "Back to {list}" link, some don't.
- The `/portal/commercial-calculator` route still exists but is no longer linked from the commercial flow (per PORTAL.md Phase 2). Dead route worth removing.
- `/portal/cleanup` and `/portal/settings/cleanup-mode` overlap conceptually — one is the action, one is the toggle.

### 4.6 What should become a shared design system

Minimum viable shared layer (not a full design system — just the things that are demonstrably duplicated):

1. **Form primitives:** `<FormField>`, `<FormSection>`, `<FormActions>` (= submit + cancel)
2. **Detail page primitives:** `<DetailActionBar>`, `<DetailWorkflowBar>`, `<DetailNextStepCard>`
3. **Toast/feedback:** Global toast primitive (already in `Next priorities` #8)
4. **List page shell:** `<PortalListPageShell>` that takes `tabs`, `sortConfig`, `attentionRule`, `renderRow` — so Quotes can migrate cleanly
5. **Format helpers:** `formatCurrency()`, `formatDate()`, `formatDateRange()` in `src/lib/format.ts` (scattered today)

That's it. Five small additions. Not a UI library.

---

## 5. Technical architecture review

### 5.1 Repeated components / logic

Already enumerated in §4 and §1.4. Summary of the **9 priority duplications**:

| # | Duplication | Files | Severity |
|---|---|---|---|
| 1 | Hand-rolled quote list vs PortalListTable | `quotes/page.tsx` vs `PortalListTable.tsx` | M |
| 2 | Invoice-creation in two server actions | `_actions-invoice.ts`, `_actions-job-and-invoice.ts` | L |
| 3 | Status display computation (job derived, invoice computed, quote DB-direct) | 3 lib files + inline page logic | M |
| 4 | Admin email inline check | 10+ files | M (security/maintenance) |
| 5 | Format helpers (`formatCurrency`, `formatDate`) | Repeated per page.tsx | L |
| 6 | Detail-page action bars (3 implementations) | `QuoteWorkflowBar`, `JobWorkflowBar`, `SendInvoicePanel` | L |
| 7 | Next-step cards (quotes, jobs; invoices missing) | 2 separate components | L |
| 8 | Service-date resolution (`resolveServiceDate` helper exists, not all call sites use it) | `invoice-dates.ts` + several callers | L |
| 9 | Filter components per section (JobFilters, InvoiceFilters) | Independent files | L |

### 5.2 Status logic

The pattern is right; coverage is incomplete:

- `src/lib/quote-status.ts` exports labels/styles for **all three** entities (quote, invoice, job). Single file, ~155 lines. Good.
- Display-status computation is split: `getJobStatus()` (separate file), `computeInvoiceDisplayStatus()` (page-level inline), quotes use DB status directly.
- `is-admin.ts` exists; not all call sites migrated (per `PORTAL.md` "Next priorities" #4).

**Recommendation:** Add one helper `src/lib/display-status.ts` that exposes `displayQuoteStatus()`, `displayJobStatus()`, `displayInvoiceStatus()` — each returning `{ label, tone, hint }`. Centralises the derivation logic without changing the DB schema or the existing label/style file.

### 5.3 Data-fetching patterns

- All page.tsx files are server components that fetch via the Supabase server client.
- Parallel-load pattern used consistently (e.g. quote detail loads quote + commercial details + commercial scope + clients + recent versions in parallel).
- No N+1 issues detected via the agent maps — joins are explicit; FK includes are used where needed.

### 5.4 Server / client component split

- Heavy server-rendering (94/96 routes). Correct.
- Client components used where they need to be (forms, login). Boundary is clean.
- One pattern question: large client forms (`NewQuoteForm`, `EditQuoteForm`) re-fetch some context client-side. This is fine but exacerbates the form-bloat issue. Splitting forms into sections would also let some sections stay server-rendered.

### 5.5 Areas that are fragile or hard to maintain

| Area | Why fragile | Risk |
|---|---|---|
| `NewQuoteForm.tsx` + `EditQuoteForm.tsx` (2,100 lines combined) | Two forms with 50+ fields each, branching for residential vs commercial, in-place vs new-version | UX changes touch one of two giant files; test coverage thin |
| `jobs/[id]/_actions.ts` (481 lines) | Eight server actions in one file (markJobReviewed, createInvoiceFromJob, startJob, completeJob, updateWorkerActualHours, assignJob, plus helpers) | Action signature changes cascade; assignJob alone is 200 lines |
| `CommercialProposalTemplate.tsx` (602 lines) | Legacy commercial print template, superseded by the shared proposal renderer but kept in service | Risk of divergence between the two paths |
| Inline `michael@sano.nz` | Auth changes require touching 10+ files | Security maintenance |
| `scope_snapshot` jsonb written but never read | Data exists; no UI; future feature additions might re-derive scope from quote unaware of the snapshot | Drift risk |

---

## 6. Recommended rebuild / refinement approach

### 6.1 Core stance

**Do not rewrite the portal.** The architecture is sound: server actions, snapshot pattern, soft-delete + audit, RLS-aware contractor portal, centralised pricing engine, shared status helpers, deployment parity. The portal is "clunky" because:

1. A handful of shared primitives are missing (form fields, action bars, toast).
2. A handful of migrations are partial (admin gate, list-table adoption, status display).
3. A handful of files are too big (the forms, one server-action bundle).

Fixing all three is incremental, low-risk, and produces visible quality improvement.

### 6.2 What should be fixed first

In order of leverage (small-change, large-relief):

1. **Migrate inline `michael@sano.nz` to `isAdminUser()`** — 10 file edits, near-zero risk, completes a started migration.
2. **Extract `formatCurrency` / `formatDate`** to `src/lib/format.ts` and update callers — small, hygiene.
3. **Surface `scope_snapshot`** in a read-only panel on job detail — one new component, no schema change. De-risks dispute scenarios.
4. **Extract invoice-creation helper** called by both single-path and combined-path actions — internal refactor, behaviour-preserving.
5. **Build the form primitives** (`FormField`, `FormSection`, `FormActions`).
6. **Split `NewQuoteForm` + `EditQuoteForm`** into composable sections using the new primitives. The single largest UX risk-surface in the portal.
7. **Migrate Quotes list** to `PortalListTable`. Brings the three list views into parity.
8. **Design-system pass on detail pages** (`DetailActionBar`, `DetailNextStepCard`, `DetailWorkflowBar`).
9. **Global toast primitive** + migrate inline flashes.

### 6.3 What should be left alone

- The pricing engine (`src/lib/quote-pricing.ts`, `commercialQuote.ts`). Working, tested, settings-driven.
- The status enums + label/style central file. The pattern is right.
- The proposal renderer + Puppeteer PDF pipeline (Phase J + the proposal template phases). Recently shipped; verified; stable.
- The contractor portal architecture (role logic, security rules). Robust.
- The notifications engine (Phase H). Schema + send path are good; only triggers are missing (already in `Next priorities`).
- The payroll architecture. Two distinct paths (employee salary, contractor hours-approved); both work.
- The recurring contracts layer (Phase F). Just shipped; let it bed in.

### 6.4 What should be redesigned visually

Limited scope:

- Quote detail page — consolidate the 5+ panels into a cleaner hierarchy. *Not redesigning the workflow; redesigning the layout density.*
- Job detail page — group secondary actions into an overflow menu; promote a primary CTA per state.
- List "needs attention" — limit chips to 1 primary reason + "+N more" pattern.

These should follow, not precede, the design-system pass (Phase 4 below).

### 6.5 What should be simplified

- The 4-pricing-mode display (live / RFQ / coming_soon / hidden) is documented elsewhere as planned — n/a here; this is the *Insulation Direct* model.
- The 7-stage visual job workflow could be reduced to 5 stages matching the DB (drop Scheduled + Reviewed as visual-only states; surface them as status sub-labels instead). Optional and low-priority.
- The standalone `/portal/commercial-calculator` route — remove if no longer referenced.

### 6.6 What should become shared components

Reiterating §4.6:

- `<FormField>`, `<FormSection>`, `<FormActions>`
- `<DetailActionBar>`, `<DetailWorkflowBar>`, `<DetailNextStepCard>`
- `<Toast>` + `toast()` helper
- `<PortalListPageShell>` (parameterised list page wrapper)
- `src/lib/format.ts`
- `src/lib/display-status.ts`

### 6.7 What should be handled by settings later

These shouldn't drive Phase 1–6 work:

- Per-staff display preferences (column visibility — partially exists)
- Notification trigger toggles (Phase H next priorities)
- Pricing engine sliders (already in admin settings)
- Recurring contracts auto-generation (cron — Phase F next priorities)
- Contractor onboarding compliance enforcement (`PORTAL.md` planned Phase 2)

---

## 7. Proposed phased plan

Each phase is independently shippable. Stop after any phase if priorities shift. None of these phases require schema migrations (one optional `scope_snapshot` panel is read-only).

### Phase 1 — Audit + structure (this spec)

**Status:** Draft for review.
**Output:** This document. Agreement on the phased plan.
**Risk:** Zero.

### Phase 2 — Low-risk cleanups

**Goal:** Pay off the easiest debt and build momentum.

**In scope:**

- Migrate all inline `michael@sano.nz` checks to `isAdminUser()` from `src/lib/is-admin.ts`. Per PORTAL "Next priorities" #4 (~10 files).
- Extract `formatCurrency()`, `formatDate()`, `formatDateRange()` into `src/lib/format.ts`. Migrate callers.
- Add a read-only `<ScopeSnapshotPanel>` to job detail that renders the agreed scope from `jobs.scope_snapshot`. No schema change.
- Remove dead `/portal/commercial-calculator` route (or keep, but explicitly mark as legacy in PORTAL.md).
- Wire `auto_create_job_on_invoice` setting if the prepared branch can be re-landed (PORTAL "Next priorities" #5). If not, defer.

**Out of scope:** Anything touching forms, list tables, or detail-page layout.

**Exit criteria:** Lint clean, baseline tests, manual smoke per existing patterns, Netlify preview verified.

**Estimated effort:** 1 short phase (~1–2 sessions).

### Phase 3 — Format + status + small lib hygiene

**Goal:** Centralise display-status derivation.

**In scope:**

- Create `src/lib/display-status.ts` exporting `displayQuoteStatus()`, `displayJobStatus()`, `displayInvoiceStatus()`. Move the derivation logic from `getJobStatus()`, `computeInvoiceDisplayStatus()`, and inline page code into this file.
- Migrate page-level callers to use the new helper.
- Extract `<InvoiceFilters>` and `<JobFilters>` shared shape into a `<ListFilters>` primitive — only if the diff between the two is < 100 lines; otherwise defer.

**Risk:** Low. Behaviour-preserving refactor.

**Estimated effort:** 1 short phase.

### Phase 4 — Design system primitives

**Goal:** Build the shared layer that Phases 5–7 will use.

**In scope:**

- `<FormField>`, `<FormSection>`, `<FormActions>` primitives. Minimal wrapper — label + hint + error markup + consistent spacing.
- `<DetailActionBar>` — primary CTA + overflow menu + status context. Single component, three call sites later.
- `<DetailWorkflowBar>` — stage-indicator + status-message wrapper. Single component.
- `<DetailNextStepCard>` — full-width action card. Single component.
- `<Toast>` + `toast()` helper. Per PORTAL "Next priorities" #8.

**Out of scope:** Migrating existing pages to use any of these. That's Phases 5–7.

**Risk:** Low (new components, no existing call sites yet).

**Estimated effort:** 1 phase.

### Phase 5 — Quote form decomposition

**Goal:** Break the 2,100-line quote-form complex into composable sections.

**In scope:**

- Extract `<QuoteServiceSection>`, `<QuoteScopeSection>`, `<QuotePricingSection>`, `<QuoteBillingSection>`, `<QuoteOverrideSection>` from `NewQuoteForm` and `EditQuoteForm`. Share between both.
- Replace inline markup with the `<FormField>` + `<FormSection>` primitives from Phase 4.
- Move the residential vs commercial branching into a single `<CommercialScopeSection>` that conditionally renders.
- Goal: each section ≤ 200 lines; the orchestrating form ≤ 300 lines.

**Risk:** **Highest risk phase** of the plan. The quote forms are load-bearing for revenue. Mitigations:

- Snapshot tests on `generated_scope` output before refactor (already exist per PORTAL.md).
- Manual smoke covering residential + commercial + override + new-version-on-edit.
- Ship in 2–3 small PRs — one per section pair (New + Edit together).
- Keep the old monolithic file in place via a feature flag if needed, decommission once shippability proven.

**Out of scope:** Changing form behaviour or validation rules. Pure refactor.

**Estimated effort:** 2 phases (large enough to split into two ship cycles).

### Phase 6 — List consistency + Quotes migration

**Goal:** All three list views use the same primitives.

**In scope:**

- Build `<PortalListPageShell>` (parameterised wrapper around `PortalListTable`).
- Migrate `quotes/page.tsx` to use `<PortalListPageShell>` + `PortalListTable`. Removes the hand-rolled mobile/desktop markup.
- Migrate `jobs/page.tsx` and `invoices/page.tsx` to use `<PortalListPageShell>` for tab + sort + filter wiring (the table itself is already `PortalListTable`).
- Standardise the "Needs attention" chip pattern across all three.

**Risk:** Medium. Quote list is the heaviest change; jobs/invoices migrate trivially.

**Estimated effort:** 1 phase.

### Phase 7 — Detail page consistency

**Goal:** Apply the design-system primitives to quote, job, invoice detail pages.

**In scope:**

- Replace `QuoteWorkflowBar`, `JobWorkflowBar`, and the inline invoice header with `<DetailWorkflowBar>`.
- Replace the three sticky action bars with `<DetailActionBar>`.
- Replace `QuoteNextStepPanel` and `JobNextStepCard` with `<DetailNextStepCard>`. Add the invoice equivalent.
- Apply `toast()` to existing inline flash sites.
- Layout pass on quote detail and job detail — reduce panel count, group secondary actions into overflow menus.

**Risk:** Medium (UI-visible). Each entity in its own PR.

**Estimated effort:** 2 phases (one per entity if needed, or quote+invoice / job split).

### Phase 8 — Internal action layer cleanup

**Goal:** Pay off remaining maintainability debt.

**In scope:**

- Extract shared invoice-insert helper called by both `convertToInvoice()` and `createJobAndInvoiceFromQuote()`.
- Split `jobs/[id]/_actions.ts` (481 lines) into focused files (`_actions-assign.ts`, `_actions-lifecycle.ts`, `_actions-hours.ts`).
- Decommission `CommercialProposalTemplate.tsx` if the new proposal renderer fully covers its use cases (verify).

**Risk:** Low (server-action refactor, behaviour-preserving).

**Estimated effort:** 1 short phase.

### Phase summary

| Phase | Scope | Effort | Risk |
|---|---|---|---|
| 1. Audit + plan | This doc | 1 session | None |
| 2. Low-risk cleanups | Admin migration + format helpers + scope_snapshot panel + dead-route cleanup | 1–2 sessions | Near-zero |
| 3. Display-status hygiene | New `display-status.ts` + caller migration | 1 session | Low |
| 4. Design-system primitives | 5 new shared components | 1 session | Low (no migrations) |
| 5. Quote form decomposition | Break 2,100-line forms into sections | 2 ship cycles | **Highest** |
| 6. List consistency | Migrate Quotes to PortalListTable + shared shell | 1 phase | Medium |
| 7. Detail page pass | Apply design-system to quote/job/invoice detail pages | 2 ship cycles | Medium (UI-visible) |
| 8. Action layer cleanup | Extract invoice helper, split jobs actions, decom legacy commercial template | 1 phase | Low |

**Total: 9–11 short phases / ship cycles.** None requires schema changes. Two require careful regression coverage (Phase 5, Phase 7).

---

## Risks before changing code

1. **Phase 5 (quote form refactor) carries real revenue risk.** Recommend explicit user sign-off on the section breakdown before code starts. Mitigation: snapshot tests, manual smoke matrix, optional feature flag for the new form scaffold.
2. **`scope_snapshot` UI panel** in Phase 2 might surface disagreement between snapshot and live quote scope — if any existing jobs have outdated snapshots because of historical bugs. Recommend a brief data audit before exposing.
3. **Design-system migration** (Phases 4 + 7) is the kind of work where "consistency" can become a perfectionism trap. Recommend treating each component as good-enough-for-3-call-sites and resisting further generalisation.
4. **Test suite baseline** is 3 pre-existing failing suites (per SANO_EXECUTION_MODE.md). Phase 5 is the most likely to surface new test fragility. Acceptance criterion: baseline remains 3, not regressed.
5. **No schema migrations.** This is a feature of the plan — keeps the work reversible. If any phase reveals a schema gap, surface as a separate ADR before changing the plan.
6. **PORTAL.md drift.** This audit reflects state as of `docs/PORTAL.md` last updated 2026-05-09 + 4 parallel agent passes. Quick re-verification recommended before Phase 5 begins (in case work shipped between now and then).

---

## What screenshots / examples would help

Most useful for confirming the audit and prioritising work:

1. **Screenshot of the quote detail page** at "accepted" status, showing the workflow bar + next-step panel + main detail + action bar together. Confirms the panel-count concern.
2. **Screenshot of the job detail page** for an in-progress job. Confirms the action-density concern.
3. **Screenshot of the quotes list and invoices list side-by-side** on the same device. Confirms the list-inconsistency feel.
4. **A specific quote ID** that you feel exhibits the "clunky" feel particularly badly — so the Phase 5 design discussion can use it as a reference case.
5. **(Optional) The PR / branch where the `auto_create_job_on_invoice` wiring was prepared** (from Phase D.3) — if it can be re-landed cleanly, that's a free Phase 2 win.
6. **(Optional) Recent CSV / PDF examples** of an issued quote and its converted invoice — so we can verify the snapshot pattern is delivering correct historicals.

Not blocking. The audit can move to Phase 2 without these; they sharpen Phases 5 and 7.

---

## Recommended starting phase

**Start with Phase 2 — Low-risk cleanups.**

Reasons:

1. Every item in Phase 2 already appears in `PORTAL.md` "Next priorities" or is a near-zero-risk hygiene fix — none of it is "new strategy".
2. It verifies the audit findings in code (e.g. the admin migration count, the format-helper proliferation).
3. It builds shipping momentum without committing to the design-system direction.
4. It surfaces the `scope_snapshot` data quality question (Risk #2 above) cheaply.

Phase 2 can ship in 1–2 small PRs and should generate visible improvement to PORTAL.md "Next priorities" without changing UI behaviour.

After Phase 2 ships and we've verified the assumptions, Phase 3 → 4 → 5 → 6 → 7 → 8 in order. Each phase is a separate spec + plan in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

---

## Open questions for the user

1. Is `auto_create_job_on_invoice` wiring (Phase D.3) still wanted? The branch was prepared but not merged; if priorities have moved, drop it from Phase 2.
2. Is decommissioning `/portal/commercial-calculator` safe (no staff still using it)?
3. For Phase 5: do you want the option of keeping the old monolithic `EditQuoteForm.tsx` behind a feature flag during migration, or is a hard cutover acceptable?
4. For Phase 7: any specific UX pain in quote / job detail layouts that should drive the redesign brief? (See "screenshots that would help" above.)
5. Is there a deadline / external event (e.g. onboarding new staff, increasing job volume) that should compress or reorder the phases?

---

## Appendix — files of interest

**Largest components (priority targets):**

- `src/app/portal/quotes/new/_components/NewQuoteForm.tsx` (1,057 lines)
- `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx` (1,043 lines)
- `src/app/portal/quotes/_components/commercial/CommercialDetailsSection.tsx` (806 lines)
- `src/app/portal/quotes/_components/commercial/CommercialProposalTemplate.tsx` (602 lines)
- `src/app/portal/jobs/[id]/page.tsx` (614 lines)
- `src/app/portal/quotes/_components/commercial/CommercialScopeBuilder.tsx` (526 lines)
- `src/app/portal/jobs/page.tsx` (513 lines)
- `src/app/portal/quotes/[id]/_components/JobSetupWizard.tsx` (517 lines)
- `src/app/portal/jobs/[id]/_actions.ts` (481 lines)
- `src/app/portal/quotes/page.tsx` (439 lines)
- `src/app/portal/quotes/_components/QuoteBuilder.tsx` (446 lines)
- `src/app/portal/invoices/page.tsx` (410 lines)
- `src/app/portal/quotes/[id]/page.tsx` (371 lines)

**Shared lib helpers (already in use):**

- `src/lib/quote-status.ts` (155) — labels/styles for all 3 entities
- `src/lib/quote-pricing.ts` (381)
- `src/lib/quote-wording.ts` (569)
- `src/lib/job-status.ts` (~80) — derived
- `src/lib/attention-rules.ts` (~150)
- `src/lib/invoice-dates.ts`
- `src/lib/is-admin.ts` — exists but partially adopted
- `src/lib/commercialQuote.ts` — pricing engine for commercial

**Shared components (already in use):**

- `src/app/portal/_components/StatusBadge.tsx` — universal
- `src/app/portal/_components/PortalListTable.tsx` — used by jobs + invoices, not quotes
- `src/app/portal/_components/ListLifecycleTabs.tsx`
- `src/app/portal/_components/AttentionChips.tsx`
- `src/app/portal/_components/BulkSelect.tsx`

**Bespoke action bars (consolidation targets):**

- `src/app/portal/quotes/[id]/_components/QuoteWorkflowBar.tsx`
- `src/app/portal/jobs/[id]/_components/JobWorkflowBar.tsx`
- `src/app/portal/invoices/[id]/_components/SendInvoicePanel.tsx`

---

## Sign-off

Approval required from the user before Phase 2 begins. If approved, the next session opens with:

```
Phase 2 of the portal stabilisation plan
(per docs/superpowers/specs/2026-05-12-portal-review-and-stabilisation-design.md).

Read:
- docs/PORTAL.md
- docs/AI/SANO_EXECUTION_MODE.md
- docs/superpowers/specs/2026-05-12-portal-review-and-stabilisation-design.md

Then propose a Phase 2 implementation plan. No code changes until I approve.
```
