-- Sales campaigns foundation (commercial outreach first, residential later)
-- Tables: sales_leads, sales_campaigns, sales_campaign_recipients,
-- sales_lead_activities. Idempotent via IF NOT EXISTS.
-- Run in Supabase SQL editor as the postgres role.

-- ── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company          text NOT NULL,
  industry         text NULL,            -- law / accounting / architecture / office / other
  website          text NULL,
  staff_size       text NULL,            -- e.g. "20-50", "50-100", "100+"
  address          text NULL,
  contact_name     text NULL,
  contact_role     text NULL,            -- e.g. Practice Manager, Office Manager, GM Operations
  email            text NULL,
  phone            text NULL,
  linkedin_url     text NULL,
  source           text NULL,            -- where the lead came from (research note / referral / web)
  quality_rank     text NOT NULL DEFAULT 'C'
                     CHECK (quality_rank IN ('A','B','C')),
  status           text NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','contacted','responded','meeting','quoted','won','lost','do_not_contact')),
  notes            text NULL,
  next_follow_up   date NULL,
  unsubscribed_at  timestamptz NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON public.sales_leads (status);
CREATE INDEX IF NOT EXISTS idx_sales_leads_follow_up ON public.sales_leads (next_follow_up);

-- ── Campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NULL,
  template_key text NOT NULL DEFAULT 'commercial-intro',
  subject      text NOT NULL,
  from_name    text NOT NULL DEFAULT 'Michael from Sano',
  reply_to     text NOT NULL DEFAULT 'hello@sano.nz',
  status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','sending','sent','archived')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz NULL
);

-- ── Recipients (one row per lead per campaign; carries tracking state) ──────
CREATE TABLE IF NOT EXISTS public.sales_campaign_recipients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES public.sales_campaigns(id) ON DELETE CASCADE,
  lead_id          uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  token            uuid NOT NULL DEFAULT gen_random_uuid(),  -- open/click tracking token
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','failed','skipped')),
  sent_at          timestamptz NULL,
  opened_at        timestamptz NULL,
  first_clicked_at timestamptz NULL,
  click_count      integer NOT NULL DEFAULT 0,
  responded_at     timestamptz NULL,
  error            text NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_recipients_token
  ON public.sales_campaign_recipients (token);
CREATE INDEX IF NOT EXISTS idx_sales_recipients_campaign
  ON public.sales_campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_recipients_lead
  ON public.sales_campaign_recipients (lead_id);

-- ── Lead activity timeline (notes, calls, status changes, follow-ups) ───────
CREATE TABLE IF NOT EXISTS public.sales_lead_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'note'
                CHECK (kind IN ('note','call','email','follow_up','status_change')),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_activities_lead
  ON public.sales_lead_activities (lead_id, created_at DESC);

-- ── RLS: staff-only via authenticated role; tracking endpoints use the
--    service-role client so no anon policies are needed. ────────────────────
ALTER TABLE public.sales_leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_activities     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "staff all" ON public.sales_leads
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "staff all" ON public.sales_campaigns
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "staff all" ON public.sales_campaign_recipients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "staff all" ON public.sales_lead_activities
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
