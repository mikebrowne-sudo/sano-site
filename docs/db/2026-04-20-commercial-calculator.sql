-- Commercial pricing calculator
-- Adds commercial_calculations table + quotes.commercial_calc_id FK.
-- Idempotent via IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.commercial_calculations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inputs                   jsonb NOT NULL,
  pricing_mode             text NOT NULL,
  selected_pricing_view    text NULL,
  total_per_clean          numeric NOT NULL,
  monthly_value            numeric NOT NULL,
  extras_total             numeric NOT NULL DEFAULT 0,
  extras_breakdown         jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_hours          numeric NOT NULL,
  estimated_cost           numeric NOT NULL,
  profit                   numeric NOT NULL,
  margin                   numeric NOT NULL,
  effective_hourly_rate    numeric NOT NULL,
  below_target_margin      boolean NOT NULL DEFAULT false,
  suggested_price          numeric NULL,
  minimum_applied          boolean NOT NULL DEFAULT false,
  pricing_status           text NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commercial_calc_id uuid
    REFERENCES public.commercial_calculations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_commercial_calc_id
  ON public.quotes (commercial_calc_id) WHERE commercial_calc_id IS NOT NULL;

ALTER TABLE public.commercial_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users full access"
  ON public.commercial_calculations;

CREATE POLICY "authenticated users full access"
  ON public.commercial_calculations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
