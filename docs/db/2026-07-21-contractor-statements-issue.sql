-- 2026-07-21 — Contractor statements: issue + immutable snapshot + supersede
-- (Stage 1 PR B). Additive; applied via MCP. No existing rows modified.
--
-- Adds the issued snapshot + review deadline + supersession fields, a contractor
-- read-only RLS policy (snapshot-based), and an ATOMIC supersede RPC.

begin;

alter table public.contractor_statements
  add column if not exists issued_snapshot jsonb,            -- immutable contractor-facing statement as issued (written once)
  add column if not exists review_due_at timestamptz,        -- staff-chosen review deadline (default issue + 5 days)
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references auth.users(id) on delete set null,
  add column if not exists superseded_reason text,
  add column if not exists replacement_statement_id uuid references public.contractor_statements(id) on delete set null;

create index if not exists idx_contractor_statements_contractor_status
  on public.contractor_statements (contractor_id, status);

-- Contractors read only their OWN, non-draft statements. Views render from
-- issued_snapshot, so no contractor access to contractor_invoices is needed.
drop policy if exists "contractor_statements contractor read own" on public.contractor_statements;
create policy "contractor_statements contractor read own"
  on public.contractor_statements for select to authenticated
  using (
    status in ('issued','superseded','confirmed','paid')
    and contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
  );

-- Atomic supersession: verify issued, stamp supersede fields (snapshot preserved),
-- release linked CIs, audit — all in one transaction. Returns released CI ids.
create or replace function public.supersede_contractor_statement(
  p_statement_id uuid, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_status text; v_number text; v_contractor uuid; v_ci_ids uuid[];
begin
  if public.is_contractor() then raise exception 'Not authorised.'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A reason is required to supersede a statement.'; end if;

  select status, statement_number, contractor_id
    into v_status, v_number, v_contractor
    from public.contractor_statements where id = p_statement_id for update;
  if not found then raise exception 'Statement not found.'; end if;
  if v_status <> 'issued' then raise exception 'Only an issued statement can be superseded (current: %).', v_status; end if;

  with released as (
    update public.contractor_invoices set statement_id = null
      where statement_id = p_statement_id returning id
  )
  select coalesce(array_agg(id), '{}') into v_ci_ids from released;

  update public.contractor_statements
    set status = 'superseded', superseded_at = now(), superseded_by = v_actor,
        superseded_reason = p_reason, updated_at = now()
    where id = p_statement_id;

  insert into public.audit_log(actor_id, actor_role, action, entity_table, entity_id, before, after)
    values (v_actor, 'admin', 'contractor_statement.superseded', 'contractor_statements', p_statement_id,
      jsonb_build_object('status','issued'),
      jsonb_build_object('statement_number', v_number, 'contractor_id', v_contractor,
                         'reason', p_reason, 'released_ci_ids', to_jsonb(v_ci_ids)));

  return jsonb_build_object('statement_number', v_number, 'released_ci_ids', to_jsonb(v_ci_ids));
end $$;

revoke all on function public.supersede_contractor_statement(uuid, text) from anon;
grant execute on function public.supersede_contractor_statement(uuid, text) to authenticated;

commit;

-- Verified 2026-07-21 (rolled-back): supersede RPC → status=superseded,
-- superseded_at set, CI released, issued_snapshot preserved, audit row written,
-- released ids returned; all atomic, rolled back, production untouched.
