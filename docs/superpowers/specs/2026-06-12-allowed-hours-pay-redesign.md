# Spec — Allowed-hours labour model + contractor pay statement

> **Status:** Draft for Mike's review — do NOT build until the open questions (§7) are answered.
> **Date:** 2026-06-12 · Supersedes the earlier "contractor submits hours" idea.

## 1. Why
Today, labour cost / margin / contractor pay are driven by **actual hours** captured from
contractor Start/Finish timestamps, then **manually approved** per worker in Labour & Margin.
In practice the allowed hours are right almost every time — **only ~2 jobs ever needed extra
hours.** So the timestamp tracking + manual approval is friction for ~zero benefit, and the
common path should be zero-touch.

## 2. The new model (target)
1. **Allowed hours are the default basis** for labour cost, margin, and contractor pay. They're
   already on the job (`jobs.allowed_hours`, from the quote). No entry, no approval for the
   normal case.
2. **Start/Finish time tracking is archived** on both the contractor and staff/admin sides
   (see §7 Q1 on how "job done" is still signalled).
3. **Extra hours are the exception** — when a job genuinely ran over, someone records the extra
   hours + a reason, and an **admin signs off**. Only then do the extra hours flow into margin
   and pay. No sign-off → no change; allowed hours stand.
4. **Contractor pay statement** — a clean, professional contractor-facing view: a running total,
   one line per job with the amount due, grouped/dated by pay run, with a total.

## 3. Pay-run schedule (confirmed)
- Jobs completed **1st–15th** → paid on the **30th** (same month).
- Jobs completed **16th–end of month** → paid on the **15th** (following month).
- The statement groups each job into its pay-run period and shows the pay date.

## 4. Labour & margin (staff side)
- The Labour & Margin section **defaults to allowed hours** (no manual actual-hours entry).
- Margin = `job_price − (allowed_hours + approved_extra_hours) × contractor_rate` *(rate basis — see §7 Q3)*.
- An **"Add extra hours"** action (admin) captures `extra_hours` + reason → recomputes true margin.
- The existing per-worker approve-hours modal is replaced by this lighter flow.

## 5. Contractor side
- Job detail shows the contractor their **allowed hours** clearly (and their pay for the job).
- If a job ran over, a **"Request extra hours"** action (reason required) → goes to admin sign-off
  *(see §7 Q2 on who initiates)*.
- A **Pay statement** screen: running total + per-job lines (job, date, hours, amount) grouped by
  pay-run period with the pay date and a grand total. Designed to look clean/professional.

## 6. Data / schema (proposed)
- Extend `job_workers` (or `jobs` for single-contractor jobs):
  - `extra_hours numeric default 0`
  - `extra_hours_reason text`
  - `extra_hours_status text` (`none` | `requested` | `approved` | `rejected`)
  - `extra_hours_approved_by uuid`, `extra_hours_approved_at timestamptz`
- Pay basis shifts from `actual_hours` → `allowed_hours + approved extra_hours`.
- **Archive** (not delete) the Start/Finish actions + `actual_start_time/actual_end_time` writes —
  keep the columns for history; stop using them as the pay basis.
- Pay statement is a **computed view** over completed jobs + the pay-run date rule — no heavy new
  tables; reuses `job_workers` / contractor identity.
- Migration applied via `docs/db/` SQL (run in Supabase), same as our other migrations.

## 7. DECISIONS (confirmed by Mike 2026-06-12)
1. **Job completion:** one **"Mark complete"** tap (status + completion date, no start/finish
   timers). Contractor or staff can tap it.
2. **Extra hours:** **staff/admin only** record them — contractors do NOT request extra hours.
   An admin must **sign off** before extra hours affect margin/pay. (So the contractor side has
   no extra-hours UI; it's a staff/admin Labour-&-Margin action requiring admin approval.)
3. **Contractor pay basis:** **`allowed_hours × contractor hourly_rate`** (+ approved extra
   hours × rate). This is what the pay statement shows.
4. **Existing jobs:** **leave as history.** New model applies going forward only.
5. **Pay statement:** contractors see only their OWN statement (RLS-scoped).

## 8. Build order (once §7 is settled)
1. Schema migration (extra-hours fields).
2. Archive Start/Finish (contractor + staff) → "Mark complete".
3. Labour & margin → allowed-hours default + extra-hours sign-off.
4. Contractor pay statement (computed) + pay-run dates.
5. Tests on the pay-period date rule + margin math.
