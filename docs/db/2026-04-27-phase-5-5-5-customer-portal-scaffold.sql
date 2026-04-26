-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.5 — Customer portal scaffold (additive, idempotent).
--
--  Adds the auth-link + access-lifecycle columns to `clients` so the
--  customer portal can later mirror the staff (5.5.2) and contractor
--  (5.5.3) invite/disable flows. Scaffold only — no UI is wired to
--  these fields yet, and no existing clients are migrated into auth
--  users by this migration.
--
--  RLS deliberately left as-is in this phase. Note the pre-existing
--  `Public can read clients for shared docs` policy is `using true` —
--  we'll need to scope it (or add a `clients_self_read` policy and
--  drop the wide one) before any real customer-facing UI ships.
-- ════════════════════════════════════════════════════════════════════

alter table public.clients
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.clients
  add column if not exists invite_sent_at timestamptz;

alter table public.clients
  add column if not exists invite_accepted_at timestamptz;

alter table public.clients
  add column if not exists access_disabled_at timestamptz;

alter table public.clients
  add column if not exists access_disabled_reason text;

create index if not exists clients_auth_user_idx
  on public.clients(auth_user_id) where auth_user_id is not null;

create index if not exists clients_email_lower_idx
  on public.clients(lower(email)) where email is not null;
