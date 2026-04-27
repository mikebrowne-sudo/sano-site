-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.12 — Residential scope expansion (additive, idempotent).
--
--  Adds operational scope hints to quotes + jobs. None of these feed
--  the pricing engine — they're captured in the new Job-Setup wizard
--  and surfaced on the job detail page so the contractor / scheduler
--  has the context they need.
--
--  All columns nullable text. Existing `quotes.condition_tags` (text[])
--  and `quotes.frequency` are unchanged.
--
--  Suggested values (enforced in UI, not at DB level):
--    occupancy        : 'occupied' | 'vacant'
--    pets             : free text ("None", "1 cat", "2 dogs — friendly")
--    parking          : 'on_site' | 'street' | 'paid_nearby' | 'difficult'
--    stairs           : 'none' | 'one_flight' | 'multi_level'
--    condition_level  : 'tidy' | 'lived_in' | 'dirty' | 'extreme'
--    access_notes     : free text (keys, alarm code, gate code, etc.)
-- ════════════════════════════════════════════════════════════════════

alter table public.quotes add column if not exists occupancy text;
alter table public.quotes add column if not exists pets text;
alter table public.quotes add column if not exists parking text;
alter table public.quotes add column if not exists stairs text;
alter table public.quotes add column if not exists condition_level text;
alter table public.quotes add column if not exists access_notes text;

alter table public.jobs add column if not exists occupancy text;
alter table public.jobs add column if not exists pets text;
alter table public.jobs add column if not exists parking text;
alter table public.jobs add column if not exists stairs text;
alter table public.jobs add column if not exists condition_level text;
