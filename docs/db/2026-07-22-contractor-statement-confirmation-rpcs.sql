-- 2026-07-22 — Contractor statement confirmation (Stage 1 PR C). FUNCTIONS ONLY
-- — no table changes (viewed_at / confirmed_* / review_due_at already exist from
-- PR B). Applied via MCP. No existing rows modified.
--
--   • statement_confirmation_block  — shared eligibility check + the SINGLE
--     Stage 2 extension point for the unresolved-query EXISTS.
--   • mark_statement_viewed         — first-view only (owner + non-draft),
--     idempotent, audits the first view; NO broad contractor UPDATE.
--   • confirm_statement_as_contractor — contractor confirms own issued statement;
--     confirmed_source set server-side.
--   • confirm_statement_on_behalf   — staff confirm after the deadline (reason +
--     email-sent-or-override required); never called by cron.
--
-- The reminder feature flag (enable_contractor_statement_reminders) lives in the
-- workforce_settings jsonb value with a code default of false — no schema here.

create or replace function public.statement_confirmation_block(p_statement_id uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare v_status text;
begin
  select status into v_status from public.contractor_statements where id = p_statement_id;
  if not found then return 'Statement not found.'; end if;
  if v_status = 'confirmed' then return 'This statement has already been confirmed.'; end if;
  if v_status = 'superseded' then return 'This statement has been superseded.'; end if;
  if v_status = 'paid' then return 'This statement has already been paid.'; end if;
  if v_status <> 'issued' then return 'Only an issued statement can be confirmed.'; end if;
  -- ── STAGE 2 EXTENSION POINT ── add the unresolved-query block here:
  --   if exists (select 1 from public.contractor_statement_queries q
  --              where q.statement_id = p_statement_id and q.status = 'open')
  --   then return 'Resolve the open query before confirming.'; end if;
  return null;
end $$;

create or replace function public.mark_statement_viewed(p_statement_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_updated int;
begin
  update public.contractor_statements set viewed_at = now()
    where id = p_statement_id and viewed_at is null
      and status in ('issued','superseded','confirmed','paid')
      and contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid());
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    insert into public.audit_log(actor_id, actor_role, action, entity_table, entity_id, before, after)
      values (auth.uid(), 'contractor', 'contractor_statement.viewed', 'contractor_statements', p_statement_id,
        null, jsonb_build_object('viewed_at', now()));
  end if;
end $$;

create or replace function public.confirm_statement_as_contractor(p_statement_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_owner boolean; v_block text; v_number text;
begin
  select exists(select 1 from public.contractor_statements s
                join public.contractors c on c.id = s.contractor_id
                where s.id = p_statement_id and c.auth_user_id = auth.uid()) into v_owner;
  if not v_owner then raise exception 'Not authorised.'; end if;
  v_block := public.statement_confirmation_block(p_statement_id);
  if v_block is not null then raise exception '%', v_block; end if;
  update public.contractor_statements
    set status='confirmed', confirmed_at=now(), confirmed_source='contractor', updated_at=now()
    where id = p_statement_id and status='issued' returning statement_number into v_number;
  if not found then raise exception 'This statement was changed — reload and try again.'; end if;
  insert into public.audit_log(actor_id, actor_role, action, entity_table, entity_id, before, after)
    values (auth.uid(), 'contractor', 'contractor_statement.confirmed', 'contractor_statements', p_statement_id,
      jsonb_build_object('status','issued'), jsonb_build_object('statement_number', v_number, 'confirmed_source','contractor'));
  return jsonb_build_object('statement_number', v_number, 'confirmed_source', 'contractor');
end $$;

create or replace function public.confirm_statement_on_behalf(p_statement_id uuid, p_reason text, p_email_override boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_actor uuid := auth.uid(); v_block text; v_number text; v_due timestamptz; v_email_sent boolean;
begin
  if public.is_contractor() then raise exception 'Not authorised.'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'A reason is required to confirm on the contractor''s behalf.'; end if;
  select review_due_at into v_due from public.contractor_statements where id = p_statement_id;
  v_block := public.statement_confirmation_block(p_statement_id);
  if v_block is not null then raise exception '%', v_block; end if;
  if v_due is null or now() <= v_due then raise exception 'The review deadline has not passed yet.'; end if;
  select exists(select 1 from public.notification_logs
                where type='contractor_statement_issued' and status='sent'
                  and payload->>'statement_id' = p_statement_id::text) into v_email_sent;
  if not v_email_sent and not coalesce(p_email_override, false) then
    raise exception 'The issue email was not sent to the contractor. Acknowledge and override to confirm on their behalf.';
  end if;
  update public.contractor_statements
    set status='confirmed', confirmed_at=now(), confirmed_source='sano', confirmed_by=v_actor, updated_at=now()
    where id = p_statement_id and status='issued' returning statement_number into v_number;
  if not found then raise exception 'This statement was changed — reload and try again.'; end if;
  insert into public.audit_log(actor_id, actor_role, action, entity_table, entity_id, before, after)
    values (v_actor, 'admin', 'contractor_statement.confirmed_by_sano', 'contractor_statements', p_statement_id,
      jsonb_build_object('status','issued'),
      jsonb_build_object('statement_number', v_number, 'confirmed_source','sano', 'reason', p_reason,
                         'email_override', coalesce(p_email_override,false), 'email_sent', v_email_sent));
  return jsonb_build_object('statement_number', v_number, 'confirmed_source', 'sano');
end $$;

revoke all on function public.statement_confirmation_block(uuid) from anon;
revoke all on function public.mark_statement_viewed(uuid) from anon;
revoke all on function public.confirm_statement_as_contractor(uuid) from anon;
revoke all on function public.confirm_statement_on_behalf(uuid, text, boolean) from anon;
grant execute on function public.mark_statement_viewed(uuid) to authenticated;
grant execute on function public.confirm_statement_as_contractor(uuid) to authenticated;
grant execute on function public.confirm_statement_on_behalf(uuid, text, boolean) to authenticated;

-- Verified 2026-07-22 (rolled-back impersonation): contractor confirms own issued
-- (source=contractor, snapshot preserved); draft/superseded/confirmed blocked;
-- cross-contractor blocked; Sano pre-deadline blocked; Sano post-deadline
-- email-not-sent blocked without override, confirmed (source=sano) with override.
