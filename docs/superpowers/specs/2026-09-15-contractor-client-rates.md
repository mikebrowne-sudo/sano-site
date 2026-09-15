# Contractor client rates — per-client default pay rates

**Date:** 2026-09-15
**Status:** Spec — approved to build
**Origin:** Upasni Devi is paid $32.20/hr at Oranga Tamariki and $30.00/hr at
NZCL, but her contractor profile carries a single flat `hourly_rate` of $35.00.
Every job assignment stamped $35.00, so the rate had to be corrected by hand on
every job before each pay run. 15 pending rows were corrected manually on
2026-09-15; without a durable fix the drift recurs on the next job created.

---

## Problem

`job_workers.pay_rate` is snapshotted at assignment time from exactly one
source: `contractors.hourly_rate` (see `loadContractorRates` in
`src/app/portal/jobs/_actions.ts`). There is no concept of "this worker's rate
at this client", so:

- Ongoing work at a negotiated rate silently defaults to the profile rate.
- Staff must remember and re-key the correct rate per job, forever.
- A missed correction overpays the contractor and is only caught (if at all)
  at pay-run time.

`contractor_service_schedules` already models per-arrangement rates, but it
resolves at **contractor-invoice** time, not **job-assignment** time, and both
existing rows are still `draft`. It is the right long-term home for commercial
agreement terms; it is heavier than what job assignment needs (agreement
lifecycle, insurance, tax treatment, supersession). This spec adds a focused
per-client rate table that job assignment reads directly, and leaves schedules
to own agreement terms.

---

## Goals

1. Set a default pay rate for a worker at a client once; every future job at
   that client uses it automatically.
2. Make it easy to set and change from the portal — no SQL.
3. Never silently change what an already-snapshotted job pays.
4. Keep a rate history so a change does not rewrite what past jobs paid.

## Non-goals

- Replacing `contractor_service_schedules`. Schedules keep owning agreement
  terms, GST and withholding treatment.
- Per-site rates. Client-level only for now; `site_id` is reserved in the
  schema for a later pass but is not resolved against in v1.
- Changing the flat `contractors.hourly_rate`. It remains the fallback.

---

## Data model

New table `public.contractor_client_rates`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `contractor_id` | uuid NOT NULL → contractors(id) | |
| `client_id` | uuid NOT NULL → clients(id) | |
| `site_id` | uuid NULL → sites(id) | reserved, unused in v1 resolution |
| `hourly_rate` | numeric(10,2) NOT NULL CHECK (> 0) | |
| `effective_from` | date NOT NULL | |
| `effective_to` | date NULL | NULL = open-ended (current) |
| `note` | text NULL | e.g. "Agreed with OT Aug 2026" |
| `status` | text NOT NULL DEFAULT 'active' | `active` \| `superseded` |
| `supersedes_id` | uuid NULL → self | audit chain |
| `created_by` / `created_at` / `updated_at` | | |

**Effective-dating, not overwriting.** Changing a rate closes the current row
(`effective_to` = day before the new `effective_from`, `status='superseded'`)
and inserts a new one. History stays explainable — the same principle the
schedule and GST tables already use.

**Partial unique index** guaranteeing one current rate per worker+client:

```sql
CREATE UNIQUE INDEX contractor_client_rates_one_current
  ON contractor_client_rates (contractor_id, client_id)
  WHERE status = 'active' AND effective_to IS NULL;
```

RLS: staff-only read/write, matching the `expenses` table policy shape.

---

## Resolution rule

New pure module `src/lib/contractor-client-rate.ts`:

```
resolveWorkerRate({ clientRate, contractorRate }) -> { rate, source }
```

Order:

1. **Existing positive snapshot on the row** → always preserved. Unchanged
   behaviour from `pickSnapshotRate`; historical pay never moves silently.
2. **Client rate** applicable on the job's `scheduled_date` → use it.
   `source: 'client'`
3. **Contractor profile `hourly_rate`** → use it. `source: 'contractor'`
4. Neither usable → `null`, `source: 'none'` (existing legacy behaviour:
   job-cost falls back to the live rate and the UI shows an "est." badge).

**Decision — fall back, do not block.** The earlier discussion raised blocking
when no client rate matches. Rejected: a hard block would stop job creation for
every one-off residential client, which is most of the book. The profile rate
stays the fallback; the UI makes the source visible instead (below), so a wrong
rate is *seen* rather than silently applied. Blocking is the wrong tool for a
rate that is merely unconfigured.

**Date basis:** the job's `scheduled_date`, falling back to today when absent.
The rate that applies is the one in force on the day the work happens, not the
day the record is created.

---

## Behaviour changes

`loadContractorRates` is extended to a client-aware loader that takes the job's
`client_id` and returns both candidate rates per contractor. Four call sites
stamp rates today and all must resolve identically:

| File | Site |
|---|---|
| `src/app/portal/jobs/_actions.ts:129` | job create |
| `src/app/portal/jobs/_actions.ts:493` | job edit, workers added |
| `src/app/portal/jobs/[id]/_actions-workers.ts:126` | assign worker |
| `src/lib/recurring-worker.ts:33` | recurring job generation |

The recurring path matters most — recurring OT/NZCL jobs are exactly where the
drift compounds.

Rule 1 (preserve existing snapshot) is unchanged at every site, so no already-
assigned job silently repays. A deliberate change still goes through the
existing audited `setJobWorkerPayRate`.

---

## UI

**Rate management — `/portal/contractors/[id]/rates`**

A table of the worker's client rates: client, rate, effective from, note, and
an edit action. "Add client rate" takes client (dropdown), rate,
effective-from (defaults today), optional note. Editing an existing rate
prompts for the new effective-from and supersedes rather than overwrites.

Per the portal UX rules: full-page form, large labels, dropdown over typing,
no modal.

**Visibility at the job**

Where a worker's rate shows on the job page, label its source: "$32.20/hr
(Oranga Tamariki rate)" vs "$35.00/hr (profile default)". This is what makes a
wrong rate catchable at a glance — the thing that was missing when the $35
rows accumulated.

**Client-side convenience**

On the client page, a small "Worker rates" panel listing workers with a rate
set at this client, so an ongoing project's rates can be set from the client
rather than worker-by-worker. This is the "easy to set a default rate for an
ongoing project" path.

---

## Seed data

Upasni Devi (`e76356f4-8bab-46e6-82b6-06d30364a4a6`):

| Client | Rate | Effective from |
|---|---|---|
| Oranga Tamariki - Ministry For Children | $32.20 | 2026-08-01 |
| NZCL | $30.00 | 2026-08-01 |

Seeded by migration, run by Mike. Backdated to 1 Aug so the existing pending
jobs resolve consistently if re-touched.

---

## Testing

Unit (`src/__tests__/lib/contractor-client-rate.test.ts`):

- existing positive snapshot wins over both client and contractor rate
- client rate wins over contractor rate
- contractor rate used when no client rate
- null when neither usable
- rate effective-dated in the future is not applied to an earlier job
- rate with `effective_to` in the past is not applied to a later job
- zero / negative / non-numeric rates rejected by `toPositiveRate`
- boundary: job exactly on `effective_from` uses the new rate

Integration: create a job for Upasni at OT → `pay_rate` is 32.20; at NZCL →
30.00; at a residential client with no client rate → 35.00.

---

## Verification path

1. Migration applied; seed rows present.
2. New job, Upasni + Oranga Tamariki, future date → job page shows $32.20/hr
   labelled as the OT rate.
3. New job, Upasni + NZCL → $30.00/hr.
4. New job, Upasni + any residential client → $35.00/hr labelled profile
   default.
5. Recurring OT job generates at $32.20.
6. An existing assigned job's rate is unchanged by adding a client rate.
7. Gauntlet clean: `npm test` at baseline (3 failures), `npx next lint` zero
   errors, `npx tsc --noEmit` clean.

---

## Risks

- **Four call sites must agree.** A missed one reintroduces the drift silently.
  Mitigated by routing all four through the single resolver and asserting each
  in tests.
- **Backdated seed.** Effective-from 2026-08-01 is before some existing jobs.
  Rule 1 protects their snapshots, so this is inert for existing rows — but it
  must be verified, not assumed.
- **Migration is Mike-run** per standing rule. No schema change is applied by
  Claude.
