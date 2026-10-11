-- Sano Sunday lead burst 2026-10-11 - review, then run in the Supabase SQL editor
-- Each insert skips existing companies/emails.
--
-- SUMMARY (running totals, updated after each batch)
-- Total: 9 | A: 2 | B: 7
-- Sectors/suburbs covered: dental/orthodontic clinics (Newmarket), vet (Albany), physio (Mt Eden),
--   childcare/ECE (Takapuna, Browns Bay), gym/fitness studio (Ponsonby), kitchen showroom (Newmarket)

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Milk Orthodontics (Newmarket)', 'Orthodontics / dental specialist clinic', 'https://milkorthodontics.co.nz', '10-15', 'Suite 27, 2 Nuffield Street, Newmarket, Auckland 1023', 'Kaitlyn', 'Clinical Manager', 'hello@milkorthodontics.co.nz', '(09) 520 1880', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Award-winning specialist orthodontic clinic on the corner of Nuffield St/Remuera Rd, opposite Newmarket train station - real fitted-out premises needing presentation-level cleaning. Clinical Manager Kaitlyn named on Healthpoint staff listing (healthpoint.co.nz); official contact email hello@milkorthodontics.co.nz confirmed on milkorthodontics.co.nz/contact-us.html. No renewal/cleaning hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Milk Orthodontics (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@milkorthodontics.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Albany Veterinary Hospital', 'Veterinary clinic', 'https://www.vethospital.co.nz/vet-clinics/albany-veterinary-hospital', '10-15', '416 Albany Highway, Albany, Auckland 0632', 'Karen Huddleston', 'Clinic Manager', 'albany@vethospital.co.nz', '09 415 8909', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Established small-animal vet hospital, part of the Veterinary Hospital Group (14 NZ clinics, locally staffed not centrally procured per own site). Clinic Manager Karen Huddleston named with her own bio on the practice''s team page at vethospital.co.nz; clinic email albany@vethospital.co.nz published on the group contact page. 3 vets + 6 support staff named on team page. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Albany Veterinary Hospital'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('albany@vethospital.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Morrow Street Dental', 'Dental clinic', 'https://morrowstreetdental.co.nz', NULL, '18 Morrow Street, Newmarket, Auckland 1023', NULL, NULL, 'office@morrowstreetdental.co.nz', '(09) 524 8399', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic, offers urgent dental care, in own Newmarket premises. Office email office@morrowstreetdental.co.nz published on Healthpoint listing (healthpoint.co.nz) and matches the practice''s own domain. No named decision-maker found publicly - general office inbox. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Morrow Street Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@morrowstreetdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Institute of Dental Implants & Periodontics', 'Dental specialist clinic (implants/periodontics)', 'https://www.implantdentist.co.nz', NULL, 'Level 4, 142 Broadway, Newmarket, Auckland 1023', NULL, NULL, 'info@implantdentist.co.nz', '(09) 524 9002', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Specialist implant/periodontics clinic on a single Broadway floor. Email info@implantdentist.co.nz published on Healthpoint listing (healthpoint.co.nz) matching own domain. No verified named ops contact (a third-party directory names a "Dental Secretary" but that is unverified, so left out). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Institute of Dental Implants & Periodontics'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@implantdentist.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Takapuna Kids Early Childhood Centre', 'Early childhood education / childcare centre', NULL, NULL, '2 Tennyson Avenue, Takapuna, Auckland 0622', NULL, 'Director', 'director@takapunakids.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent (non-chain) ECE centre with own Takapuna premises. Published inbox is role-addressed director@takapunakids.co.nz per Education Counts profile (educationcounts.govt.nz), so it reaches the owner/director directly even without a personal name. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Takapuna Kids Early Childhood Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('director@takapunakids.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Browns Bay Preschool', 'Early childhood education / childcare centre', 'https://www.brownsbaypreschool.co.nz', NULL, '55 Browns Bay Road, Browns Bay, Auckland 0630', 'Yvonne', 'Centre Manager', 'info@brownsbaypreschool.co.nz', '022 438 3465', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent East Coast Bays preschool in own premises. Centre Manager Yvonne named on the practice''s own contact page (brownsbaypreschool.co.nz/contact), which gives her mobile directly but routes email via the general info@ inbox. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Browns Bay Preschool'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@brownsbaypreschool.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Functional Physio', 'Physiotherapy clinic', 'https://functionalphysio.co.nz', NULL, '12 Normanby Road, Mount Eden, Auckland 1024', NULL, NULL, 'info@functionalphysio.co.nz', '09 623 0787', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent Mt Eden physiotherapy clinic in its own clinic premises. Email info@functionalphysio.co.nz published on clinic''s own contact page (functionalphysio.co.nz/contact-us-mt-eden-auckland). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Functional Physio'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@functionalphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'ALLFIT Ponsonby', 'Gym / fitness studio', 'https://www.allfit.co.nz/ponsonby/', NULL, '308-312 Ponsonby Road, Ponsonby, Auckland 1011', NULL, NULL, 'ponsonby@allfit.co.nz', '0800 255 348', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Boutique strength/fitness studio in its own fitted-out Ponsonby Road premises (gym floor + changing rooms - good sweat/odour-control cleaning fit). Club-specific inbox ponsonby@allfit.co.nz published on allfit.co.nz. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('ALLFIT Ponsonby'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('ponsonby@allfit.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kitchens By Design (Newmarket)', 'Kitchen design showroom', 'https://www.kitchensbydesign.co.nz', NULL, '7 Melrose Street, Newmarket, Auckland 1023', NULL, NULL, 'hello@kitchensbydesign.co.nz', '(09) 379 3084', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] High-end kitchen design showroom with a street-front display floor needing presentation-level cleaning (glossy surfaces, showroom appliances). Email hello@kitchensbydesign.co.nz published on kitchensbydesign.co.nz/showroom. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kitchens By Design (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@kitchensbydesign.co.nz'));
