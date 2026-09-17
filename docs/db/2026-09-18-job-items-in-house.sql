-- 2026-09-18 — Record that an extra was DELIBERATELY left with no contractor.
--
-- The Extras panel nudges an operator with an amber "Needs contractor" badge on
-- any extra that has nobody on it, because an unassigned extra is usually one
-- someone started and did not finish. But an extra can legitimately have no
-- contractor: work done in-house, where nobody is separately paid.
--
-- Without somewhere to record that answer, the badge cannot tell the two apart
-- and nags forever on an extra the operator already confirmed. That trains staff
-- to ignore the badge, which is worse than not having it — the extras that
-- genuinely ARE unfinished stop standing out.
--
-- `in_house` is the operator's explicit "yes, nobody is being paid for this".
-- It is set only when they confirm the prompt, and cleared the moment a
-- contractor is chosen.
--
-- Additive + idempotent. Existing rows default to false, which is correct: an
-- extra created before this column existed was never explicitly confirmed.

begin;

alter table public.job_items
  add column if not exists in_house boolean not null default false;

comment on column public.job_items.in_house is
  'True when the operator explicitly confirmed this extra has no contractor (done in-house, nobody separately paid). Distinguishes a deliberate answer from an unfinished entry, so the "Needs contractor" prompt does not nag forever.';

-- An extra cannot be both in-house and assigned to someone.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_items_in_house_chk') then
    alter table public.job_items
      add constraint job_items_in_house_chk
      check (not (in_house and contractor_id is not null));
  end if;
end $$;

commit;
