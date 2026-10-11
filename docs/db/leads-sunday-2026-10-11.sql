-- Sano Sunday lead burst 2026-10-11 - review, then run in the Supabase SQL editor
-- Each insert skips existing companies/emails.
--
-- SUMMARY (running totals, updated after each batch)
-- Total: 52 | A: 13 | B: 39
-- Sectors/suburbs covered: dental/orthodontic clinics (Newmarket, Takapuna, Remuera, St Heliers,
--   Mission Bay, New Lynn, Avondale), vet (Albany, Howick, Henderson, Point Chevalier, Balmoral,
--   St Lukes/Sandringham), physio (Mt Eden, Botany, Ponsonby, Newmarket x2, Ellerslie x2), medical/GP
--   clinics (Grey Lynn), childcare/ECE (Takapuna, Browns Bay, Epsom, Mt Albert, Pakuranga),
--   gym/fitness/yoga/pilates studio (Ponsonby, Newmarket x2, Morningside, Parnell x2, Mission Bay,
--   Mt Eden), showrooms (kitchen - Newmarket, furniture - Parnell, tile/bathroom - Ellerslie/Mt Wellington x3)

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

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pet Doctors Howick', 'Veterinary clinic', 'https://petdoctorshowick.co.nz', NULL, '48 Ridge Road, Howick, Auckland 2014', 'Anthony', 'Practice Manager', 'howick@nzpetdoctors.co.nz', '(09) 537 1002', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own East Auckland premises. Practice Manager Anthony named on the clinic''s own team page (petdoctorshowick.co.nz); clinic email howick@nzpetdoctors.co.nz confirmed via the NZ Pet Doctors group contact structure. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pet Doctors Howick'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('howick@nzpetdoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Sweat Yoga (Newmarket)', 'Yoga studio', 'https://www.sweatyoga.co.nz', NULL, '12 Morgan Street, Newmarket, Auckland 1023', 'Bruce Simons', 'Studio Manager', 'info@sweatyoga.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Hot-yoga studio with its own practice-room premises (heated studio floors, mats, showers - specialist hygiene/odour-control cleaning fit). Studio Manager Bruce Simons named on the studio''s own teachers page (sweatyoga.co.nz/teachers); contact routes to the published info@sweatyoga.co.nz inbox. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Sweat Yoga (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@sweatyoga.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Takapuna Dentists', 'Dental clinic', 'https://takapunadentists.co.nz', NULL, '431 Lake Road, Takapuna, Auckland 0622', NULL, NULL, 'office@takapunadentists.co.nz', '09 489 7574', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in own Lake Road premises. Office email office@takapunadentists.co.nz published on the clinic''s own site (takapunadentists.co.nz/contact-us). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Takapuna Dentists'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@takapunadentists.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'White Smile Dental', 'Dental clinic', 'https://www.whitesmiledental.co.nz', NULL, '15-17 Hurstmere Road, Takapuna, Auckland 0622', NULL, NULL, 'info@whitesmiledental.co.nz', '0800 433 777', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic on Hurstmere Road, Takapuna. Email info@whitesmiledental.co.nz published on the clinic''s own site (whitesmiledental.co.nz/contact-us). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('White Smile Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@whitesmiledental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Dental Care (Takapuna)', 'Dental clinic', 'https://akldentalcare.co.nz', NULL, '9 Anzac Street, Takapuna, Auckland 0622', NULL, NULL, 'info@akldentalcare.co.nz', '09 869 3500', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic on Anzac Street, Takapuna. Email info@akldentalcare.co.nz published on the clinic''s own site (akldentalcare.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Dental Care (Takapuna)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@akldentalcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Howick Village Vets', 'Veterinary clinic', 'https://www.howickvillagevets.co.nz', NULL, '14 Moore Street, Howick, Auckland 2014', NULL, NULL, 'reception@howickvillagevets.co.nz', '09-242-4324', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Howick village premises. Email reception@howickvillagevets.co.nz published on the clinic''s own site (howickvillagevets.co.nz/contact). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Howick Village Vets'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@howickvillagevets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'KX Pilates (Newmarket)', 'Pilates studio', 'https://kxpilates.com/nz/studio/newmarket-pilates-studio', NULL, '9/29 Nuffield Street, Newmarket, Auckland 1023', NULL, NULL, 'newmarket@kxpilates.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Reformer Pilates studio in its own fitted-out Newmarket premises. Studio inbox newmarket@kxpilates.co.nz published on kxpilates.com. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('KX Pilates (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('newmarket@kxpilates.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'City Kickboxing', 'Gym / martial arts training facility', 'https://citykickboxing.net.nz', NULL, '1 Gordon Street, Morningside, Auckland 1025', NULL, NULL, 'info@citykickboxing.net.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Well-known MMA/kickboxing training facility with its own mat space, changing rooms and showers in Morningside - high-traffic premises with real hygiene-cleaning need. Email info@citykickboxing.net.nz published on the gym''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('City Kickboxing'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@citykickboxing.net.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'St Andrews Epsom Early Childhood Centre (Little Dinosaurs)', 'Early childhood education / childcare centre', 'https://standrewsepsom.co.nz', NULL, '87 Onslow Avenue, Epsom, Auckland 1023', 'Margarita Sampayo', 'Owner & Centre Manager', 'margarita@littledinosaurs.co.nz', '09 623 8454', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small, independent, privately-owned ECE centre in its own quiet Epsom premises. Owner & Centre Manager Margarita Sampayo named on the centre''s own team page (standrewsepsom.co.nz/who-we-are-2); her direct email margarita@littledinosaurs.co.nz published on the same domain''s enquiries page. Owner-operator = fast decision on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('St Andrews Epsom Early Childhood Centre (Little Dinosaurs)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('margarita@littledinosaurs.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Dentistry for Chickens', 'Dental clinic', 'https://www.dentistryforchickens.co.nz', NULL, '29A Peach Parade, Remuera, Auckland 1050', 'Leslie Robinson', 'Practice Manager', 'reception@dentistryforchickens.co.nz', '09 520 0292', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Remuera premises. Practice Manager Leslie Robinson named on the clinic''s own site (dentistryforchickens.co.nz); published reception@dentistryforchickens.co.nz inbox reaches the practice directly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Dentistry for Chickens'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@dentistryforchickens.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Noble Dental Specialists (Remuera)', 'Dental specialist clinic (periodontics/implants)', 'https://www.nobledental.co.nz/remuera', NULL, '31 Peach Parade, Remuera, Auckland 1050', 'Penny Hood', 'Administrator', 'reception@nobledental.co.nz', '09 524 2855', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Specialist periodontics/dental implant clinic in its own Remuera premises (also has a Takapuna site - potential two-site contract, flagged for a later batch). Administrator Penny Hood named on the clinic''s own contact page (nobledental.co.nz/contact-us); published reception@nobledental.co.nz inbox reaches the Remuera clinic. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Noble Dental Specialists (Remuera)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@nobledental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'MARC Early Learning Centre', 'Early childhood education / childcare centre', NULL, NULL, '122 Mt Albert Road, Mount Albert, Auckland 1025', NULL, 'Manager', 'manager@marcelc.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own Mt Albert premises. Role-addressed inbox manager@marcelc.co.nz published on the Education Counts profile (educationcounts.govt.nz) reaches the centre manager directly even without a personal name. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('MARC Early Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('manager@marcelc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Peak Physio Botany', 'Physiotherapy clinic', 'https://www.peakphysioauckland.co.nz/physio-botany', NULL, '318 Ti Rakau Drive, Burswood, Auckland 2013', NULL, NULL, 'botany@peakpilates.co.nz', '09 274 6000', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Large open-plan physio clinic next to The Doctors Ti Rakau Medical Centre in East Auckland. Email botany@peakpilates.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Peak Physio Botany'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('botany@peakpilates.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Oral Care Company', 'Dental clinic', 'https://www.oralcare.co.nz', NULL, '120 Remuera Road, Remuera, Auckland 1050', NULL, NULL, 'info@oralcare.co.nz', '(09) 524 2494', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic on Remuera Road. Email info@oralcare.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Oral Care Company'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@oralcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'OneHealth Dental (Remuera)', 'Dental clinic', 'https://onehealthdental.co.nz', NULL, '122 Remuera Road, Remuera, Auckland 1050', NULL, NULL, 'info@onehealthdental.co.nz', '09 524 8834', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic on Remuera Road, next door to Oral Care Company (same street pair - worth pairing the outreach). Email info@onehealthdental.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('OneHealth Dental (Remuera)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@onehealthdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Smile Boutique (Remuera)', 'Dental clinic', 'https://smileboutique.co.nz/locations/remuera/', NULL, '118 Remuera Road, Remuera, Auckland 1050', NULL, NULL, 'info@smileboutique.co.nz', '09 200 0267', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic on Remuera Road, part of the same small Remuera Road dental cluster as Oral Care Company and OneHealth Dental (three clinics, one street). Email info@smileboutique.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Smile Boutique (Remuera)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@smileboutique.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Natural Smile EastMed Dental (St Heliers)', 'Dental clinic', 'https://naturalsmile.co.nz', NULL, '188 St Heliers Bay Road, St Heliers, Auckland 1071', 'Dr Dave Richards', 'Owner / Dentist', 'info@naturalsmile.co.nz', '09 585 0205', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own St Heliers premises. Owner-dentist Dr Dave Richards named on the clinic''s own site (naturalsmile.co.nz); published info@naturalsmile.co.nz reaches the practice directly - owner-operator means fast decisions on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Natural Smile EastMed Dental (St Heliers)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@naturalsmile.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Swanson Road Veterinary Clinic', 'Veterinary clinic', 'https://swansonroadvet.co.nz', NULL, '269 Swanson Road, Henderson, Auckland 0610', 'Alison', 'Practice Manager / Nurse', 'reception@swansonroadvet.co.nz', '(09) 833 7794', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises. Practice Manager/Nurse Alison named on the clinic''s own team page (swansonroadvet.co.nz); reception@swansonroadvet.co.nz published on the same site. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Swanson Road Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@swansonroadvet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mission Bay Fitness', 'Gym / fitness studio', 'https://www.missionbayfitness.co.nz', NULL, '2/95 Rukutai Street, Mission Bay, Auckland 1071', 'Dave Maegaard', 'Owner', 'missionbayfitness@gmail.com', '+64 21 397 379', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Private gym in its own Mission Bay premises (opened 2021). Owner Dave Maegaard named on the gym''s own site/Facebook page; published contact email missionbayfitness@gmail.com reaches him directly. Owner-operator = fast decision on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mission Bay Fitness'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('missionbayfitness@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Cocohills (Parnell)', 'Furniture / homeware showroom', 'https://www.cocohills.co.nz', NULL, '55 The Strand, Parnell, Auckland 1052', 'Heather Walker', 'Owner', 'heather@cocohills.co.nz', '09 302 8882', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Curated furniture/homeware showroom with a street-front display floor (presentation-critical premises). Owner Heather Walker named across multiple design-industry profiles (archipro.co.nz, vervemagazine.co.nz); her direct email heather@cocohills.co.nz published on the showroom''s own contact page. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Cocohills (Parnell)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('heather@cocohills.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Tooth Company Eastridge', 'Dental clinic', 'https://thetoothcompany.co.nz/contact-us/eastridge/', NULL, 'Eastridge Shopping Centre, 215 Kepa Road, Mission Bay, Auckland 1071', NULL, NULL, 'eastridge@thetoothcompany.co.nz', '(09) 521 2021', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic inside Eastridge Shopping Centre, Mission Bay. Branch email eastridge@thetoothcompany.co.nz published on the company''s own contact page. The site names a "Practice Manager" role but not a person, so no name used. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Tooth Company Eastridge'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('eastridge@thetoothcompany.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Henderson Vets', 'Veterinary clinic', 'https://www.hendersonvets.co.nz', NULL, '12 Lincoln Road, Henderson, Auckland 0610', NULL, NULL, 'reception@hendersonvets.co.nz', '09 838 8550', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises. Email reception@hendersonvets.co.nz published on the clinic''s own site. A practice manager is mentioned in third-party listings but not reliably named on the clinic''s own pages, so left out. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Henderson Vets'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@hendersonvets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ponsonby Doctors', 'Medical centre / GP clinic', 'https://www.ponsonbydoctors.co.nz', NULL, '582 Karangahape Road, Grey Lynn, Auckland 1021', NULL, NULL, 'info@ponsonbydoctors.co.nz', '(09) 280 2923', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP/accident & medical clinic in its own premises. Email info@ponsonbydoctors.co.nz published on the clinic''s own contact page (ponsonbydoctors.co.nz/contact). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ponsonby Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@ponsonbydoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Doctors Richmond Road', 'Medical centre / GP clinic', 'https://www.richmondroadmedical.co.nz', NULL, '452 Richmond Road, Grey Lynn, Auckland 1021', NULL, NULL, 'admin@rr.thedoctors.co.nz', '09 376 5621', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP medical centre in its own Grey Lynn premises. Admin inbox admin@rr.thedoctors.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Doctors Richmond Road'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@rr.thedoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Reform Fitness (Parnell)', 'Gym / fitness studio', 'https://www.reformfitness.co.nz/studios/parnell', NULL, '79a Saint Georges Bay Road, Parnell, Auckland 1052', NULL, NULL, 'parnell@reformfitness.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Boutique fitness studio in its own Parnell premises. Studio inbox parnell@reformfitness.co.nz published on the studio''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Reform Fitness (Parnell)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('parnell@reformfitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Exercise Room (Parnell)', 'Gym / fitness studio', 'https://www.theexerciseroom.co.nz', NULL, '100 Parnell Road, Parnell, Auckland 1052', NULL, NULL, 'info@theexerciseroom.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Boutique gym on Parnell Road. Email info@theexerciseroom.co.nz published on the studio''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Exercise Room (Parnell)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@theexerciseroom.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ponsonby Physio', 'Physiotherapy clinic', 'https://www.ponsonbyphysio.co.nz', NULL, '45 Mackelvie Street, Ponsonby, Auckland 1011', 'Toni Strong', 'Proprietor', 'toni@ponsonbyphysio.co.nz', '(09) 378 6890', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independent physiotherapy clinic in its own Ponsonby premises. Proprietor Toni Strong named on the clinic''s own contact page (ponsonbyphysio.co.nz/contact) with a direct email; owner-operator = fast decision on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ponsonby Physio'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('toni@ponsonbyphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Family Dental (New Lynn)', 'Dental clinic', 'https://www.aucklandfamilydental.co.nz', NULL, '14 Delta Avenue, New Lynn, Auckland 0600', NULL, NULL, 'newlynn@aucklandfamilydental.co.nz', '09 827 1664', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in own West Auckland premises. Branch email newlynn@aucklandfamilydental.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Family Dental (New Lynn)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('newlynn@aucklandfamilydental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Quality Dental (New Lynn)', 'Dental clinic', 'https://qualitydental.co.nz', NULL, '3D Delta Avenue, New Lynn, Auckland 0600', NULL, NULL, 'qualitydental@xtra.co.nz', '09 827 0078', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in own West Auckland premises (same street as Auckland Family Dental - pair the outreach). Email qualitydental@xtra.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Quality Dental (New Lynn)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('qualitydental@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Avondale Dental', 'Dental clinic', 'http://www.avondaledental.co.nz', NULL, '1875 Great North Road, Avondale, Auckland 1026', NULL, NULL, 'reception@avondaledental.co.nz', '09 828 5786', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in own West Auckland premises. Email reception@avondaledental.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Avondale Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@avondaledental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pakuranga Learning Centre', 'Early childhood education / childcare centre', 'https://www.pakurangalearningcentre.co.nz', NULL, '33B Ben Lomond Crescent, Pakuranga, Auckland 2010', NULL, 'Centre Director', 'info@pakurangalearningcentre.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Privately-owned ECE centre (licensed for up to 80 children) in its own East Auckland premises - littlies.nz directory confirms private ownership. Email info@pakurangalearningcentre.co.nz published on the centre''s own site; directory names a Centre Director role but not a person. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pakuranga Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@pakurangalearningcentre.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Physio360 (Newmarket)', 'Physiotherapy clinic', 'https://physio360.co.nz', NULL, '7 Morrow Street, Newmarket, Auckland 1023', NULL, NULL, 'reception@physio360.co.nz', '0800 360 749', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic in own Newmarket premises. Email reception@physio360.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Physio360 (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@physio360.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'WYLD Physiotherapy (Newmarket)', 'Physiotherapy / chiropractic clinic', 'https://wyldchiropractic.co.nz', NULL, '2a Railway Street, Newmarket, Auckland 1023', NULL, NULL, 'newmarket@wyld.nz', '09 218 6886', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Multidisciplinary physio/chiro clinic in its own Newmarket premises. Branch email newmarket@wyld.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('WYLD Physiotherapy (Newmarket)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('newmarket@wyld.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'WYLD Physiotherapy (Ponsonby)', 'Physiotherapy / chiropractic clinic', 'https://wyldchiropractic.co.nz/ponsonby-physiotherapy', NULL, '20 Jervois Road, Ponsonby, Auckland 1011', NULL, NULL, 'ponsonby@wyld.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Multidisciplinary physio/chiro clinic in its own Ponsonby premises (sister branch to the Newmarket WYLD clinic in this same batch). Branch email ponsonby@wyld.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('WYLD Physiotherapy (Ponsonby)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('ponsonby@wyld.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Point Chevalier Veterinary Care', 'Veterinary clinic', 'https://www.veterinarycare.co.nz/pt-chevalier', NULL, '67 Point Chevalier Road, Point Chevalier, Auckland 1022', NULL, NULL, 'pointchev@veterinarycare.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Point Chevalier premises (part of a small 3-clinic local group with Balmoral and Royal Oak - locally run, not national). Email pointchev@veterinarycare.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Point Chevalier Veterinary Care'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('pointchev@veterinarycare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Tile Space Ellerslie', 'Tile / bathroomware showroom', 'https://tiles.co.nz/tile-space-ellerslie', NULL, '218a Marua Road, Ellerslie, Auckland 1051', 'Ellen Ransfield', 'Branch Manager', 'ellerslie@tiles.co.nz', '09 270 7990', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Tile/bathroomware showroom with a street-front display floor (glossy tile and fixture displays - presentation-critical premises). Branch Manager Ellen Ransfield named on the store''s own branch page (tiles.co.nz/tile-space-ellerslie); published ellerslie@tiles.co.nz reaches the branch directly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Tile Space Ellerslie'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('ellerslie@tiles.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'MedStrength Gym (Mt Eden)', 'Gym / fitness studio (physio-led)', 'https://www.medstrength.co.nz', NULL, 'Eden 5, 12 Normanby Road, Mount Eden, Auckland 1024', NULL, NULL, 'admin@medstrength.co.nz', '09 623 0045', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Boutique physio-led gym in its own Mt Eden premises (same Eden 5 building as Functional Physio, seed batch 1 - pair the visit). Email admin@medstrength.co.nz published on the gym''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('MedStrength Gym (Mt Eden)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@medstrength.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Balmoral Veterinary Care', 'Veterinary clinic', 'https://www.veterinarycare.co.nz/balmoral', NULL, '482 Dominion Road, Balmoral, Auckland 1041', NULL, NULL, 'balmoral@veterinarycare.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Balmoral premises (small local 3-clinic group, locally run). Email balmoral@veterinarycare.co.nz published on the clinic''s own site. Dr Mike Sanders named as a vet but ownership not confirmed, so no name used. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Balmoral Veterinary Care'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('balmoral@veterinarycare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'St Lukes Veterinary Centre', 'Veterinary clinic', 'https://www.stlukesvet.co.nz', NULL, '13 Morningside Drive, St Lukes, Auckland 1025', NULL, NULL, 'pets@stlukesvet.co.nz', '09 845 5573', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own premises (registered as Vets and Pets Ltd). Email pets@stlukesvet.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('St Lukes Veterinary Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('pets@stlukesvet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Toptile Bathrooms (Mt Wellington)', 'Tile / bathroomware showroom', 'https://www.toptilebathrooms.co.nz', NULL, '58 Lunn Avenue, Mount Wellington, Auckland 1060', NULL, NULL, 'sales@toptileandbathroom.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Tile/bathroomware showroom with a display floor. Email sales@toptileandbathroom.co.nz published on the showroom''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Toptile Bathrooms (Mt Wellington)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('sales@toptileandbathroom.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Tile Depot (Mt Wellington)', 'Tile showroom', 'https://www.tiledepot.co.nz/stores/mt-wellington', NULL, '1/47 Lunn Avenue, Mount Wellington, Auckland 1060', NULL, NULL, 'lunnave@tiledepot.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Tile showroom with a display floor (same street as Toptile Bathrooms in this batch - pair the visit). Branch email lunnave@tiledepot.co.nz published on the company''s own store-locator page. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Tile Depot (Mt Wellington)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('lunnave@tiledepot.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'About Faces Physiotherapy (Ellerslie)', 'Physiotherapy clinic', 'https://www.aboutfaces.co.nz', NULL, '1/298 Ellerslie-Panmure Highway, Ellerslie, Auckland 1051', NULL, NULL, 'info@aboutfaces.co.nz', '+64 9 5800 590', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic in its own Ellerslie premises. Email info@aboutfaces.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('About Faces Physiotherapy (Ellerslie)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@aboutfaces.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Physiologic (Ellerslie)', 'Physiotherapy clinic', 'https://physiologic.co.nz', NULL, '17 Kalmia Street, Ellerslie, Auckland 1051', NULL, NULL, 'info@physiologic.co.nz', '0800 756 750', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic in its own Ellerslie premises. Email info@physiologic.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Physiologic (Ellerslie)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@physiologic.co.nz'));
