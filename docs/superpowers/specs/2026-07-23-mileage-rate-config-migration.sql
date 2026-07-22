-- PR2a — dated mileage rate config + IRD 2025/26 seed.
-- Run in the Supabase SQL editor. Safe + idempotent.
-- Rates are the IRD 2025/26 kilometre rates, applied to 2026/27 reimbursements
-- (IRD had not published official 2026/27 rates at build time) — labelled as
-- such, NOT presented as official 2026/27 rates.

create table if not exists public.mileage_rate_config (
  id            uuid primary key default gen_random_uuid(),
  effective_from date not null,
  source_label  text not null,
  vehicle_type  text not null check (vehicle_type in ('petrol','diesel','petrol_hybrid','electric')),
  tier          smallint not null check (tier in (1, 2)),
  rate_per_km   numeric(6,2) not null check (rate_per_km > 0),
  created_at    timestamptz not null default now(),
  unique (effective_from, vehicle_type, tier)
);

insert into public.mileage_rate_config (effective_from, source_label, vehicle_type, tier, rate_per_km)
select
  '2025-04-01'::date,
  'IRD 2025/26 kilometre rates (applied to 2026/27 reimbursements pending official 2026/27 rates)',
  v.vehicle_type, v.tier, v.rate
from (values
  ('petrol',        1, 1.20), ('petrol',        2, 0.37),
  ('diesel',        1, 1.30), ('diesel',        2, 0.38),
  ('petrol_hybrid', 1, 0.90), ('petrol_hybrid', 2, 0.24),
  ('electric',      1, 1.22), ('electric',      2, 0.23)
) as v(vehicle_type, tier, rate)
on conflict (effective_from, vehicle_type, tier) do nothing;
