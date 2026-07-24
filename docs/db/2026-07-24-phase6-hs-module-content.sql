-- ============================================================================
-- Phase 6 — lean H&S module content + supporting-document labels. Mike-run.
-- CONTENT SEED (upsert). ADDITIVE + IDEMPOTENT. Preserves existing assignments
-- and completions (touches only training_modules, never worker_training_*).
-- ============================================================================
-- Six CORE modules (auto-assigned to every employee + contractor) refreshed /
-- created with practical, cleaning-specific content, plus two role-specific
-- modules (manual-assign; Phase 7 will auto-target them).
--
-- Version is set to '2026.07'. There are no existing acknowledgements, so this
-- content refresh triggers no re-acknowledgement. Future content changes should
-- bump the version and use the staff "Require re-acknowledgement" action.
--
-- document_url is left NULL — supporting PDFs are uploaded by staff later; the
-- module is completed from the PORTAL CONTENT, PDF optional. The content does
-- NOT claim a document is "linked below" while none is uploaded, and does NOT
-- invent Sano-specific procedures — it references documents / the responsible
-- Sano manager where specifics are needed.
--
-- Run PREFLIGHT first, then MIGRATION (seed).
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select key, title, applies_to, auto_assign, version from public.training_modules order by sort_order;
-- Assignments/acks that must be preserved (expect the content update to change neither):
select count(*) as assignments from public.worker_training_assignments;
select count(*) as acknowledgements from public.worker_training_acknowledgements;


-- ---- MIGRATION (content seed) -----------------------------------------------
begin;

insert into public.training_modules
  (key, title, category, description, content, status,
   requires_acknowledgement, requires_completion, sort_order,
   version, applies_to, auto_assign, document_label)
values
-- 1 --------------------------------------------------------------------------
('hs_induction',
 'Sano Health & Safety Induction',
 'health_and_safety',
 'How we keep everyone safe on the job — your responsibilities, our shared duties under the Health and Safety at Work Act 2015, and what to do before and during every clean.',
 E'Your safety, and everyone else''s, comes first — always.\n\nUnder the Health and Safety at Work Act 2015 we all share responsibility for a safe workplace. Sano provides safe systems of work; you take reasonable care of yourself and others and follow those systems.\n\nYour everyday responsibilities:\n- Take reasonable care of your own health and safety.\n- Take reasonable care that what you do (or don''t do) doesn''t harm others — clients, the public, or other cleaners.\n- Follow safe work practices, instructions and training.\n- Use the PPE required for the task and make sure it is available, suitable and in good condition before starting.\n- Report every hazard, near miss, injury or unsafe situation to Sano straight away.\n\nBefore you start at any site:\n- Do a quick check of the area for hazards — wet floors, trip hazards, damaged equipment, pets, unsafe access.\n- Keep walkways and exits clear while you work.\n- If something isn''t safe, stop and contact Sano before continuing.\n\nFitness for work:\n- Never work while unwell, impaired by alcohol or drugs, or too fatigued to work safely.\n- Tell Sano if an illness, injury, medication or other condition may affect your ability to work safely, or if you need an adjustment. You do not need to provide more personal medical information than is reasonably required to manage the safety risk.\n\nIf something goes wrong:\n- Make the area safe if you can do so without risk to yourself.\n- Get help for anyone injured; call 111 in an emergency.\n- Report it to Sano as soon as possible so we can support you and prevent it happening again.\n\nThe full Sano Health & Safety Plan will be available here once it has been uploaded. This module is the summary you need before starting work.',
 'active', true, true, 10, '2026.07', 'both', true, 'Sano Health & Safety Plan'),

-- 2 --------------------------------------------------------------------------
('hazardous_substances',
 'Chemicals & Hazardous Substances',
 'health_and_safety',
 'Safe use, storage and handling of cleaning chemicals, Safety Data Sheet (SDS) awareness, PPE, and what to do about spills or exposure.',
 E'Cleaning chemicals are useful tools — and hazardous if misused. Treat them with respect.\n\nGolden rules:\n- Use only the products Sano has approved for the job.\n- NEVER mix chemicals — especially never mix bleach with ammonia or acid-based products. This can create toxic gas.\n- Always read the label and follow the dilution and usage instructions.\n- Keep products in their original, labelled containers — never decant into an unlabelled bottle.\n- Store chemicals securely, away from food, children and pets.\n\nProtect yourself:\n- Read the product label and SDS and wear the PPE they require. This may include gloves, eye protection or other protection depending on the product and how it is being used.\n- Work in a ventilated space; open a window or door when using strong products.\n- Avoid breathing in sprays, mists or fumes.\n- Wash your hands after handling chemicals and before eating.\n\nSafety Data Sheets (SDS):\n- Every hazardous product has a Safety Data Sheet explaining its hazards, safe handling and first aid.\n- Know where to find the SDS for the products you use (see the Sano Hazardous Substances Register — this will be available here once it has been uploaded).\n\nSpills and exposure:\n- Keep people away from the spill. Follow the product label, SDS and Sano instructions. Only contain or clean up the spill if you have been trained, have the right PPE and can do so safely.\n- For skin or eye contact, rinse with plenty of water and follow the SDS first-aid advice.\n- If someone is unconscious, having difficulty breathing or in immediate danger, call 111. For any other actual or suspected poisoning or chemical exposure, call the National Poisons Centre on 0800 764 766 and follow its advice. Report the event to Sano as soon as possible.\n\nEquipment for chemicals:\n- Check spray bottles and dispensers are working and labelled before use.\n- Don''t use damaged or leaking containers — set them aside and tell Sano.',
 'active', true, true, 20, '2026.07', 'both', true, 'Sano Hazardous Substances Register (SDS)'),

-- 3 --------------------------------------------------------------------------
('safe_work_practices',
 'Safe Work Practices & Equipment',
 'health_and_safety',
 'Practical habits that prevent the most common cleaning injuries — safe lifting, slips and trips, equipment and electrical safety.',
 E'Most cleaning injuries are preventable. A few simple habits keep you safe.\n\nLifting and manual handling:\n- Plan the lift — is it too heavy or awkward? Get help or split the load.\n- Bend your knees, keep your back straight, hold the load close, and lift smoothly.\n- Don''t twist while lifting — move your feet instead.\n- Push rather than pull where you can; use a trolley for heavy or bulky items.\n\nRepetitive work and posture:\n- Vary your tasks and take short breaks to avoid strain.\n- Use extension poles and the right tools to avoid overreaching.\n\nSlips, trips and falls:\n- Use wet-floor signs or another suitable warning when mopping or leaving a surface wet. Work in sections where practical so people have a safe route through the area.\n- Keep cords, hoses and equipment out of walkways.\n- Clean up spills straight away.\n\nEquipment:\n- Check equipment before use — no damaged cords, plugs or parts.\n- Use equipment only for its intended purpose and as trained.\n- Switch off and unplug before clearing blockages or changing parts.\n- Stop using faulty equipment, unplug it where safe, clearly separate or label it so no one else uses it, and report it to Sano.\n\nElectrical safety:\n- Keep electrical equipment and cords away from water.\n- Don''t use equipment with damaged cords or plugs, and don''t overload power points.\n- If you get a shock or see damage, stop, unplug at the wall if safe, and report it.\n\nWorking at height:\n- Do not use a ladder or step platform unless the task has been approved, you have completed the relevant training, and the equipment is suitable and safe. See the working-at-height module if your role includes this.\n- Never stand on chairs, benches or other furniture to reach.',
 'active', true, true, 30, '2026.07', 'both', true, null),

-- 4 --------------------------------------------------------------------------
('hazard_incident_reporting',
 'Hazard, Incident & Emergency Reporting',
 'health_and_safety',
 'What to report and how — hazards, near misses, injuries and emergencies — so problems get fixed before they cause harm.',
 E'Reporting keeps everyone safe — it''s how we fix problems before they cause harm.\n\nWhat to report:\n- Hazards — anything that could cause harm (a broken step, exposed wiring, an aggressive dog, a slippery surface).\n- Near misses — something that could have caused harm but didn''t. These are early warnings; report them.\n- Injuries or illness — any harm to you or someone else, however minor.\n- Incidents — chemical spills or exposure, property damage, security issues, or anything unsafe.\n\nReport every one of these to Sano as soon as it''s safe to do so.\n\nIn an emergency:\n- Your safety comes first — get yourself and others to safety.\n- Call 111 for fire, serious injury, or immediate danger.\n- Give first aid only within your training.\n- Make the area safe if you can do so without risk.\n- Then report it to Sano.\n\nAfter a serious injury or incident:\n- Do not clean up, move equipment or disturb the area more than is necessary to help an injured person, remove an immediate danger or prevent further harm. Wait for instructions from Sano.\n\nWhen you report, tell us:\n- What happened, where and when.\n- Who was involved and whether anyone was hurt.\n- What you did about it.\n- Anything that would stop it happening again.\n\nWhy it matters:\n- Reporting isn''t about blame — it''s about preventing the next injury.\n- Some events must be notified to WorkSafe New Zealand; Sano manages that decision and any notification, so tell us promptly.\n\nReport hazards, near misses, injuries and incidents by calling or messaging the Sano manager or supervisor responsible for your work. If you cannot reach them and the matter is urgent, contact another Sano manager. Direct reporting through the portal will be added shortly.',
 'active', true, true, 40, '2026.07', 'both', true, 'Sano hazard & incident reporting procedure'),

-- 5 --------------------------------------------------------------------------
('security_property',
 'Lone Working, Client Property, Keys & Security',
 'policy',
 'Working safely on your own, and looking after clients'' homes, keys, alarms and belongings with care and confidentiality.',
 E'You often work alone and in clients'' homes and businesses. Trust and care matter.\n\nLone working:\n- Make sure Sano knows where you are working and your expected finish time. Contact your Sano manager if the job runs significantly late or you feel unsafe.\n- Keep your phone charged and on you.\n- Trust your instincts — if a situation feels unsafe, leave and contact Sano.\n- Be aware of your surroundings, entries and exits.\n- Take extra care with slips, trips and manual handling when no one else is around to help.\n\nClient property:\n- Treat every home and workplace with respect and care.\n- Only access the areas you''re there to clean.\n- Move items carefully and put everything back where you found it.\n- If you damage something, report it to Sano straight away — honesty is expected and protects you.\n- Don''t use clients'' equipment, food or facilities beyond what the job needs, unless permitted.\n\nKeys and access:\n- Look after any keys or access cards as if they were your own home''s.\n- Never label a key with the address, copy a key, or share access with anyone.\n- Report a lost key or access card to Sano immediately.\n- Lock up and secure the property when you leave, as instructed for that site.\n\nAlarms:\n- Only use alarm codes for sites you''re authorised for, and keep them confidential.\n- If you set off an alarm by mistake, follow the site instructions and contact Sano.\n\nPersonal safety:\n- If someone is on site unexpectedly, stay calm and polite, and contact Sano if you''re unsure.\n- Never confront anyone over security — your safety comes first.',
 'active', true, true, 50, '2026.07', 'both', true, null),

-- 6 --------------------------------------------------------------------------
('privacy_conduct',
 'Privacy, Confidentiality & Professional Conduct',
 'policy',
 'How we protect client trust — keeping what we see private, respecting privacy, and behaving professionally on every job.',
 E'Clients trust us in their private spaces. How we behave protects that trust — and our reputation.\n\nConfidentiality:\n- Keep what you see in a client''s home or business private. Don''t discuss clients, their homes, or their belongings with others.\n- Don''t share client information, addresses, or access details with anyone.\n- Only take job-related photos when Sano has instructed or authorised you to do so, and only through the approved Sano process. Do not take or keep client photos for personal use, and never share them outside Sano.\n\nPrivacy:\n- Handle any personal information respectfully; don''t read, move, or go through personal documents or belongings.\n- Respect clients'' privacy and space.\n- Do not save client addresses, access codes, documents or other private information in personal notes, messages or contacts unless Sano has specifically authorised the method.\n\nProfessional conduct:\n- Be punctual and reliable, and let Sano know if plans change.\n- Be polite and respectful to clients, the public, and your team.\n- Present yourself tidily and wear your Sano identification where provided.\n- Don''t smoke or vape on the job, and never work under the influence of alcohol or drugs.\n- Don''t bring guests, children or pets to a job.\n- Do the job to the standard you''d want in your own home.\n\nSocial media:\n- Don''t post about clients, their homes, or jobs, and never identify clients or locations online.\n\nIf you''re ever unsure what''s appropriate, ask Sano before acting.',
 'active', true, true, 60, '2026.07', 'both', true, null),

-- ROLE-SPECIFIC (manual-assign; Phase 7 will auto-target) ---------------------
('working_at_height',
 'Working at Height & Ladder Safety',
 'health_and_safety',
 'For roles that use ladders or steps — how to work at height safely and avoid falls.',
 E'Falls from height are a leading cause of serious injury. Only work at height when you''ve been trained and it''s the safest option. Ordinary ladder or step use covered by this module is for low-risk, short-duration tasks.\n\nThis module does not authorise you to undertake every type of work at height. Only use the ladder or step equipment approved for your role and the particular job. Do not access roofs or use extension ladders unless Sano has specifically assessed and authorised the work.\n\nBefore you climb:\n- Ask: can the job be done from the ground with an extension pole? If so, do that.\n- Use the right equipment for the task — a suitable ladder or step platform, not furniture.\n- Check the ladder: no damage, feet in good condition, correct height for the job.\n- Set up on firm, level ground, clear of doors, walkways and wet areas.\n\nOn the ladder:\n- Maintain three points of contact and face the ladder.\n- Keep your body within the ladder''s side rails — don''t overreach; move the ladder instead.\n- Keep both hands available for climbing. Do not carry heavy or awkward items while climbing.\n- One person on a ladder at a time.\n- Do not stand on the top step, or above the manufacturer''s marked safe standing level.\n\nStop if:\n- The ladder is damaged or unstable, the surface is unsuitable, or weather (wind or wet) makes it unsafe.\n- You feel unwell or unsteady.\n\nIf in doubt, don''t — contact Sano and we''ll find a safe way to do the job.',
 'active', true, true, 70, '2026.07', 'both', false, null),

('team_leader',
 'Team Leader & Supervisor Responsibilities',
 'health_and_safety',
 'For anyone leading or supervising others on site — your added health & safety responsibilities.',
 E'When you lead a job, you help keep the whole team safe.\n\nBefore the job:\n- Make sure everyone knows the task, the site, and any hazards.\n- Check the team has the right PPE and equipment, in good condition.\n- Check that everyone is ready to work safely and has raised any illness, injury, fatigue or other issue that may affect the work.\n\nDuring the job:\n- Set a good example — follow every safe work practice yourself.\n- Watch for hazards and unsafe behaviour, and step in early.\n- Make sure new or less experienced team members are supported.\n- Keep walkways, exits and work areas safe as the job progresses.\n- Stop or change the work if a serious risk cannot be controlled. Contact Sano before allowing the task to continue.\n\nIf something goes wrong:\n- Look after anyone injured first; call 111 in an emergency.\n- Make the area safe, then report the hazard or incident to Sano promptly.\n\nCommunication:\n- Encourage the team to speak up about hazards and near misses — no blame.\n- Pass concerns and reports to Sano so they can be acted on.\n\nTeam leaders support Sano''s health and safety process but are not expected to make legal notification decisions. Escalate serious events and unresolved risks to Sano immediately.',
 'active', true, true, 80, '2026.07', 'both', false, null)

on conflict (key) where key is not null do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  content = excluded.content,
  status = excluded.status,
  requires_acknowledgement = excluded.requires_acknowledgement,
  requires_completion = excluded.requires_completion,
  sort_order = excluded.sort_order,
  version = excluded.version,
  applies_to = excluded.applies_to,
  auto_assign = excluded.auto_assign,
  document_label = excluded.document_label,
  updated_at = now();

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- Eight modules; six core auto-assign 'both'; two role modules manual-assign:
select key, title, applies_to, auto_assign, requires_acknowledgement, version, document_label
from public.training_modules order by sort_order;
select count(*) filter (where auto_assign) as core_auto_assign,
       count(*) filter (where not auto_assign) as role_manual
from public.training_modules where version = '2026.07';
-- Assignments + acknowledgements UNCHANGED by the content seed:
select count(*) as assignments from public.worker_training_assignments;
select count(*) as acknowledgements from public.worker_training_acknowledgements;


-- ---- ROLLBACK ---------------------------------------------------------------
-- Content-only seed. To revert the NEW modules (safe_work_practices,
-- hazard_incident_reporting, working_at_height, team_leader) if they have no
-- assignments:
-- begin;
--   delete from public.training_modules
--   where key in ('safe_work_practices','hazard_incident_reporting','working_at_height','team_leader')
--     and not exists (select 1 from public.worker_training_assignments a where a.training_module_id = training_modules.id);
--   -- The four refreshed modules keep their new content; restore prior text from
--   -- docs/db/2026-07-16-phase5-induction-modules.sql if a full revert is needed.
-- commit;
