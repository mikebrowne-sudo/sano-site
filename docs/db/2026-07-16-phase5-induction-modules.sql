-- ════════════════════════════════════════════════════════════════════
--  Phase 5 — seeded, versioned contractor induction modules.
--
--  Extends the existing training_modules engine (no parallel system):
--    key         stable slug for idempotent seeding / lookup
--    version     module version (e.g. '1.0')
--    applies_to  'contractor' | 'employee' | 'both'
--    auto_assign auto-assigned during contractor onboarding
--    document_url / document_label  link to the finalised H&S PDF
--                (populated by staff later; nullable)
--
--  Seeds 4 contractor induction modules idempotently by `key`. Content is a
--  concise in-portal summary drawn from Sano's finalised H&S documents and the
--  signed agreement; the authoritative document is the linked PDF.
--
--  Idempotent + additive. Mike-run.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.training_modules add column if not exists key             text;
alter table public.training_modules add column if not exists version         text default '1.0';
alter table public.training_modules add column if not exists applies_to      text default 'both';
alter table public.training_modules add column if not exists auto_assign     boolean default false;
alter table public.training_modules add column if not exists document_url    text;
alter table public.training_modules add column if not exists document_label  text;

create unique index if not exists training_modules_key_uidx
  on public.training_modules(key) where key is not null;

insert into public.training_modules
  (key, title, category, description, content, status,
   requires_acknowledgement, requires_completion, sort_order,
   version, applies_to, auto_assign, document_label)
select v.* from (values
  (
    'hs_induction',
    'Health & Safety Induction',
    'health_and_safety',
    'Sano''s health & safety expectations under the Health and Safety at Work Act 2015 — your duties, hazard and incident reporting, and fitness for work.',
    E'Sano Property Services is a PCBU under the Health and Safety at Work Act 2015. This induction summarises how we keep everyone safe. The full Health & Safety Plan is linked below and is the authoritative document.\n\nYour duties on every job:\n- Take reasonable care for your own health and safety and that of others.\n- Follow Sano''s safety procedures and any site-specific instructions.\n- Do your own hazard check when you arrive at each site.\n- Use the correct PPE for the task.\n- Present fit for work — free from the effects of drugs, alcohol or fatigue.\n\nReporting:\n- Report every hazard, near miss, injury and incident to Sano immediately.\n- Sano notifies WorkSafe New Zealand of any notifiable event.\n\nContractors: hold current public liability insurance and do not subcontract work without Sano''s written approval.',
    'active', true, true, 10, '1.0', 'contractor', true, 'Sano Health & Safety Plan'
  ),
  (
    'hazardous_substances',
    'Hazardous Substances & Equipment',
    'health_and_safety',
    'Safe use, storage and handling of cleaning chemicals, Safety Data Sheet (SDS) awareness, PPE and equipment.',
    E'Sano manages cleaning chemicals under the Hazardous Substances register (linked below).\n\nChemicals:\n- Use only approved products, and follow the label and the Safety Data Sheet (SDS) for each one.\n- Never mix chemicals, and never decant into unlabelled containers.\n- Store and transport them safely, away from clients, children and pets.\n\nPPE & equipment:\n- Wear the correct PPE for the task.\n- Check equipment before use; tag out and report anything faulty.\n\nIf a chemical spills or someone is exposed, follow the SDS first-aid guidance and tell Sano immediately.',
    'active', true, true, 20, '1.0', 'contractor', true, 'Sano Hazardous Chemical Substance Register'
  ),
  (
    'security_property',
    'Security, Keys & Client Property',
    'policy',
    'Looking after client keys, alarms and property, and respecting client premises — as agreed in your contractor agreement.',
    E'This module confirms the security obligations in the agreement you signed.\n\n- Treat every client''s home and property with care and respect.\n- Keys, alarm codes and access details are confidential — never share, copy, or leave them unsecured, and return them on request.\n- Follow each site''s access and security instructions; lock up and reset alarms when you leave.\n- Do not photograph client premises or belongings unless Sano has authorised it for the job.\n- Report any loss, damage, or security concern to Sano immediately.',
    'active', true, true, 30, '1.0', 'contractor', true, null
  ),
  (
    'privacy_conduct',
    'Privacy, Confidentiality & Conduct',
    'policy',
    'Client privacy and confidentiality, and professional conduct on site — as agreed in your contractor agreement.',
    E'This module confirms the privacy and conduct obligations in the agreement you signed.\n\n- Keep all client and Sano information confidential, and use it only to do the work.\n- Respect client privacy — do not share, post, or discuss client details, homes, or belongings.\n- Behave professionally and courteously on every site, and follow reasonable client requests.\n- Present appropriately and work free from drugs and alcohol.\n- Raise any concern or complaint with Sano rather than the client.',
    'active', true, true, 40, '1.0', 'contractor', true, null
  )
) as v(key, title, category, description, content, status,
       requires_acknowledgement, requires_completion, sort_order,
       version, applies_to, auto_assign, document_label)
where not exists (
  select 1 from public.training_modules t where t.key = v.key
);

commit;
