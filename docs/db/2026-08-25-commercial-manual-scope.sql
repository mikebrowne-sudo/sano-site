-- 2026-08-25 — Commercial quotes: manual scope sections.
--
-- The Scope of Works page is generated entirely from commercial_scope_items,
-- which are costed rows (quantity, unit minutes, production rate) that feed
-- pricing. Some scope is worth stating to the client but isn't costed that
-- way — extras on a one-off deep clean, or items on a recurring contract the
-- costed scope doesn't capture.
--
-- This adds free-text scope sections that render on the Scope of Works page
-- alongside the generated groups. Purely presentational: no pricing impact,
-- no hours impact, never fed back into the estimator.
--
-- Shape: an array of { title: string, items: string[] } objects.
--   [{"title": "Deep Clean Extras",
--     "items": ["Degrease kitchen extraction filters",
--               "Steam clean upholstered booth seating"]}]
--
-- Empty array = no manual sections = existing behaviour, so every existing
-- quote is unchanged.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.commercial_quote_details
  add column if not exists manual_scope_sections jsonb not null default '[]'::jsonb;

comment on column public.commercial_quote_details.manual_scope_sections is
  'Operator-written scope sections rendered on the proposal Scope of Works page alongside the generated groups. Array of {title, items[]}. Presentational only - never affects pricing or estimated hours. Empty array = none.';

commit;
