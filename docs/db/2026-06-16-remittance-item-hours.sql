-- Remittance line items: optional snapshotted hours.
--
-- Display-only. Captured at batch-create time ONLY when the line is
-- genuinely hourly and the maths is clean — i.e. payable_hours × pay_rate
-- equals the paid amount. Fixed-price work (carpet/oven/fridge cleans,
-- adjustments, legacy rows with no rate) stays null so the remittance
-- never implies an hourly basis it didn't have. Never affects the paid
-- amount, which remains the single source of truth.
--
-- Idempotent + additive (nullable), safe to re-run.

alter table public.contractor_remittance_items
  add column if not exists hours numeric;
