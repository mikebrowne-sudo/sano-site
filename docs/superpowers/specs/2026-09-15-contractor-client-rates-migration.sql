-- Contractor client rates — per-client default pay rates
-- Spec: docs/superpowers/specs/2026-09-15-contractor-client-rates.md
-- Run by: Mike (Supabase SQL Editor, project rcfzlvablzehyawmrdqs)
--
-- Safe to re-run: every statement is IF NOT EXISTS / ON CONFLICT guarded.

-- 1. Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contractor_client_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id   uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_id         uuid NULL REFERENCES public.sites(id) ON DELETE SET NULL,
  hourly_rate     numeric(10,2) NOT NULL CHECK (hourly_rate > 0),
  effective_from  date NOT NULL,
  effective_to    date NULL,
  note            text NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded')),
  supersedes_id   uuid NULL REFERENCES public.contractor_client_rates(id) ON DELETE SET NULL,
  created_by      uuid NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_client_rates_date_order
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE public.contractor_client_rates IS
  'Per-client default pay rate for a worker. Effective-dated + superseding — a rate change closes the current row and inserts a new one; history is never overwritten. Resolved at JOB ASSIGNMENT time against the job''s scheduled_date. An existing positive job_workers.pay_rate snapshot always wins over this (historical pay never moves silently). Falls back to contractors.hourly_rate when no row applies. Sibling of contractor_service_schedules, which owns agreement terms/GST/withholding — this table owns only the assignment-time rate.';

-- 2. One current rate per worker+client --------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS contractor_client_rates_one_current
  ON public.contractor_client_rates (contractor_id, client_id)
  WHERE status = 'active' AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS contractor_client_rates_lookup
  ON public.contractor_client_rates (contractor_id, client_id, effective_from DESC);

-- 3. updated_at trigger ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contractor_client_rates_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS contractor_client_rates_touch_trg ON public.contractor_client_rates;
CREATE TRIGGER contractor_client_rates_touch_trg
  BEFORE UPDATE ON public.contractor_client_rates
  FOR EACH ROW EXECUTE FUNCTION public.contractor_client_rates_touch();

-- 4. RLS — staff only --------------------------------------------------------
ALTER TABLE public.contractor_client_rates ENABLE ROW LEVEL SECURITY;

-- Matches the existing `expenses` policy shape: the is_admin() / is_finance()
-- helpers, NOT an inline profiles.role check (the only role value in this DB is
-- 'staff', so an inline IN ('admin','staff') check would lock everyone out).
DROP POLICY IF EXISTS contractor_client_rates_admin_all ON public.contractor_client_rates;
CREATE POLICY contractor_client_rates_admin_all
  ON public.contractor_client_rates
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS contractor_client_rates_finance_read ON public.contractor_client_rates;
CREATE POLICY contractor_client_rates_finance_read
  ON public.contractor_client_rates
  FOR SELECT
  USING (is_finance());

-- 5. Seed — Upasni Devi ------------------------------------------------------
-- Oranga Tamariki $32.20/hr, NZCL $30.00/hr, both effective 2026-08-01.
-- Backdated so existing pending jobs resolve consistently if re-touched.
-- Existing job_workers.pay_rate snapshots are NOT changed by this (rule 1).
INSERT INTO public.contractor_client_rates
  (contractor_id, client_id, hourly_rate, effective_from, note)
SELECT ct.id, cl.id, v.rate, DATE '2026-08-01', v.note
FROM (VALUES
  ('Oranga Tamariki - Ministry For Children', 32.20, 'Agreed OT rate (confirmed 2026-09-15)'),
  ('NZCL',                                    30.00, 'Agreed NZCL rate (confirmed 2026-09-15)')
) AS v(client_name, rate, note)
JOIN public.clients cl ON cl.name = v.client_name
JOIN public.contractors ct ON ct.full_name ILIKE '%upasni%'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_client_rates r
  WHERE r.contractor_id = ct.id AND r.client_id = cl.id
    AND r.status = 'active' AND r.effective_to IS NULL
);

-- 6. Verify ------------------------------------------------------------------
SELECT ct.full_name, cl.name AS client, r.hourly_rate, r.effective_from, r.note
FROM public.contractor_client_rates r
JOIN public.contractors ct ON ct.id = r.contractor_id
JOIN public.clients cl ON cl.id = r.client_id
ORDER BY ct.full_name, cl.name;
-- Expect 2 rows: Upasni Devi / NZCL / 30.00, Upasni Devi / Oranga Tamariki / 32.20
