-- Sano Sunday lead burst 2026-10-11 - review, then run in the Supabase SQL editor
-- Each insert skips existing companies/emails.
--
-- SUMMARY (running totals, updated after each batch)
-- Total: 231 | A: 74 | B: 157
-- Sectors/suburbs covered: dental/orthodontic clinics (Newmarket, Takapuna, Remuera, St Heliers,
--   Mission Bay, New Lynn, Avondale, Blockhouse Bay, Panmure, Glen Innes, Otahuhu, Flat Bush x3,
--   Howick, Onehunga, Royal Oak, Henderson, Herne Bay, Ponsonby, Kohimarama, Pt Chevalier x2,
--   Titirangi x2, Epsom, Browns Bay, Albany, Pakuranga, Manurewa, Three Kings, Forrest Hill/Sunnynook,
--   Mt Wellington, Otahuhu),
--   audiology/hearing (Rosedale), vet (Albany, Howick, Henderson, Point Chevalier, Balmoral,
--   St Lukes/Sandringham, Manukau, Papatoetoe, Mt Roskill, Glenfield, Mt Eden x2, Ellerslie,
--   Glen Eden x2, Takanini, Papakura x3 (incl. Franklin Vets), Grey Lynn, Blockhouse Bay, Te Atatu,
--   Birkenhead, Pukekohe (Franklin Vets), Mangere Bridge, Karaka (Franklin Vets)), physio (Mt Eden, Botany, Ponsonby,
--   Newmarket x2, Ellerslie x2, Birkenhead, Devonport, Half Moon Bay, Kingsland, Papakura, Howick,
--   Clendon Park/Manurewa, Mangere East), optometry (Onehunga), law firms (Epsom - fresh vertical this batch),
--   medical/GP clinics (Grey Lynn, Three Kings, Henderson x2, Manurewa x2, Te Atatu Peninsula,
--   Botany x3, Browns Bay, Mangere East, Otara, Glenfield, Remuera, St Heliers, Orakei,
--   Hobsonville x2, West Harbour, Flat Bush, Howick x1, Papatoetoe x4, Mt Roskill x2, Titirangi,
--   Royal Oak, Onehunga x3, Epsom x2, Highland Park, Mt Roskill x3, Te Atatu South x3, Howick,
--   Meadowbank x2, Mangere Bridge x2, Drury, Forrest Hill, Birkenhead, Devonport x2, Takapuna x2,
--   Swanson, Mt Eden, Freemans Bay, Hobsonville x3, Point Chevalier, Parnell, Avondale, Manukau x2,
--   Waiuku, Te Atatu), osteopathy (Westmere, Pukekohe), chiropractic (Glenfield),
--   acupuncture/Chinese medicine (Remuera),
--   pilates/yoga (Hobsonville Point x3), training centres/PTEs (Onehunga - first aid/workplace,
--   Albany - NZQA college, Grafton - tech bootcamp),
--   childcare/ECE (Takapuna, Browns Bay, Epsom, Mt Albert,
--   Pakuranga, Birkdale, Glenfield x2, Otara/Flat Bush, Botany x2, Onehunga x2, Kingsland,
--   Te Atatu South x2, Whitford, Mangere Bridge x2, Papatoetoe x2, Panmure, Glen Eden), gym/fitness/yoga/pilates/dance studio
--   (Ponsonby, Newmarket x2, Morningside, Parnell x2, Mission Bay, Mt Eden, St Johns, New Lynn x3,
--   Rosedale, Albany x3, Henderson x2, Remuera x2, Auckland CBD x3, Panmure), showrooms (kitchen -
--   Newmarket, furniture - Parnell, tile/bathroom - Ellerslie/Mt Wellington x3,
--   lighting - North Shore/Takapuna x2, furniture - Albany/Wairau Valley, blinds - East Tamaki,
--   print shop - Glen Eden), childcare/ECE also Karaka
-- Attempted this batch with thin/no results: accountants (Pukekohe, Botany, Howick), law firms
--   (Birkenhead, Takapuna/Albany - already well covered by earlier seed files, e.g. Turner Hopkins/
--   Gaze Burt/Inder Lynch are duplicates - check docs/db/2026-07-*-sales-leads-seed*.sql before adding
--   any law/accounting/insurance firm), body corporate managers, podiatry, audiology (further
--   suburbs), dermatology/skin, counselling/psychology, real estate branches (Barfoot/Harcourts),
--   medical/GP (Pakuranga-Tend chain skipped, Mangere, Mt Wellington, Three Kings, Otahuhu, Pukekohe,
--   Papakura - named managers found but no visible email), vet (Pakuranga, Half Moon Bay/Highland
--   Park, Mt Wellington), gyms (Papatoetoe, Birkenhead/Northcote, Flat Bush/Highland Park, Mt
--   Wellington - CityFitness/BFT are chains), martial arts/dance/yoga studios (Auckland-wide),
--   chiropractors/optometrists (further suburbs, most redacted) - mostly directory noise or
--   redacted email fields, no verifiable named contact + email found; skipped rather than guessed.
--   Note: Barnardos/Lumino/Tend/Kindercare/Little Earth Montessori/CurtainStudio-branded locations
--   skipped as likely centrally procured chains even where a named contact or branch email was found.

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

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Blockhouse Bay Dental Centre', 'Dental clinic', 'https://www.bhbdental.co.nz', NULL, '3A Heaphy Street, Blockhouse Bay, Auckland 0600', 'Dr Peter Raymond', 'Owner / Principal Dentist', 'admin@bhbdental.co.nz', '09 627 9970', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic (3 dentists) in its own West Auckland premises. Dr Peter Raymond named as sole owner since acquiring the practice (per a Yelp listing cross-referencing the clinic''s own team page); published admin@bhbdental.co.nz reaches the practice. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Blockhouse Bay Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@bhbdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Chandler Dance Academy', 'Dance school / training studio', 'https://www.chandlerdanceacademy.co.nz', NULL, '9/115 Felton Mathew Avenue, St Johns, Auckland 1072', 'Dannielle Chandler', 'Director', 'office@chandlerdanceacademy.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Dance training studio in its own St Johns premises (sprung floors, mirrors - presentation + hygiene cleaning fit). Director Dannielle Chandler named on the academy''s own site (chandlerdanceacademy.co.nz); published office@chandlerdanceacademy.co.nz inbox reaches her directly. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Chandler Dance Academy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@chandlerdanceacademy.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Physio Bunker (Birkenhead)', 'Physiotherapy clinic', 'https://www.thephysiobunker.co.nz', NULL, '16 Learmonth Avenue, Birkenhead, Auckland 0626', 'Leon Lindsay-Russell', 'Owner / Lead Physiotherapist', 'info@thephysiobunker.co.nz', '021 058 1540', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Locally-owned physiotherapy clinic. Owner/lead physio Leon Lindsay-Russell named on the clinic''s own site (thephysiobunker.co.nz); published info@thephysiobunker.co.nz reaches him directly. RENEWAL/TIMING HINT: the clinic''s own contact page says it is "temporarily located" at this address "while we wait for our new premises" - a move is a natural moment to pitch a new cleaning contract. Owner-operator = fast decision.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Physio Bunker (Birkenhead)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@thephysiobunker.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Academy of Dance', 'Dance school / training studio', NULL, NULL, 'Unit L, 44A Portage Road, New Lynn, Auckland 0600', NULL, NULL, 'office@aucklandacademyofdance.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Dance training studio in its own New Lynn premises. Email office@aucklandacademyofdance.co.nz published on the academy''s own Facebook page. No reliably-sourced named contact found (a third-party aggregator names staff but hides emails, so left out). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Academy of Dance'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@aucklandacademyofdance.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Manukau After Hours Veterinary Clinic', 'Veterinary clinic (emergency)', 'https://www.nightvet.co.nz', NULL, '15 Jack Conway Avenue, Manukau, Auckland 2104', NULL, NULL, 'info@nightvet.co.nz', '(09) 277 8383', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] After-hours emergency vet clinic in its own South Auckland premises - high-turnover clinical space with a strong hygiene-cleaning need. Email info@nightvet.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Manukau After Hours Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@nightvet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Devonport Physiotherapy & Pilates', 'Physiotherapy / Pilates clinic', 'https://www.devonportphysio.co.nz', NULL, '9b Wynyard Street, Devonport, Auckland 0624', NULL, NULL, 'reception@devonportphysio.co.nz', '09 445 2841', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy/Pilates clinic in its own Devonport village premises. Email reception@devonportphysio.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Devonport Physiotherapy & Pilates'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@devonportphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pet Vets (Papatoetoe)', 'Veterinary clinic', 'https://petvets.nz', NULL, '93 East Tamaki Road, Papatoetoe, Auckland 2025', NULL, NULL, 'office@petvets.nz', '09 250 0555', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Locally-owned-and-operated small-animal vet clinic (two South Auckland sites - Papatoetoe + Manurewa, local group not a national chain). Email office@petvets.nz published on the clinic''s own NZVA job listing tied to petvets.nz. No reliably-sourced named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pet Vets (Papatoetoe)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@petvets.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Nurserydale Childcare (Birkdale)', 'Early childhood education / childcare centre', 'https://www.nurserydalechildcare.co.nz', NULL, '262 Birkdale Road, Birkdale, Auckland 0626', 'Libby Hunt', 'Centre Owner / Director', 'libby@nurserydalechildcare.co.nz', '09 483 8273', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independent, privately-owned ECE centre in its own North Shore premises. Owner/Director Libby Hunt introduces herself by name on the centre''s own site (nurserydalechildcare.co.nz) with her direct email libby@nurserydalechildcare.co.nz. Owner-operator = fast decision on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Nurserydale Childcare (Birkdale)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('libby@nurserydalechildcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Lynfield Vets', 'Veterinary clinic', 'https://lynfieldvets.co.nz', NULL, '122 White Swan Road, Mount Roskill, Auckland 1041', 'Catherine Soo', 'Veterinarian / Owner', 'theteam@lynfieldvets.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Mt Roskill premises. Veterinarian/Owner Catherine Soo named on the clinic''s own site (lynfieldvets.co.nz); published theteam@lynfieldvets.co.nz inbox reaches the practice directly. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Lynfield Vets'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('theteam@lynfieldvets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Panmure Dentists', 'Dental clinic', 'https://www.panmuredentists.co.nz', NULL, '188 Queens Road, Panmure, Auckland 1072', NULL, NULL, 'reception@panmuredentists.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own East Auckland premises, team led by Dr Alice Bahjet (role not confirmed as owner, so no name used). Email reception@panmuredentists.co.nz published on the clinic''s own site. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Panmure Dentists'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@panmuredentists.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Dental World Panmure', 'Dental clinic', 'https://www.panmuredentalworld.co.nz', NULL, '148 Queens Road, Panmure, Auckland 1072', NULL, NULL, 'reception@dentalworldpanmure.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own East Auckland premises (same road as Panmure Dentists - pair the outreach). Email reception@dentalworldpanmure.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Dental World Panmure'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@dentalworldpanmure.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Glen Innes Dentist Ltd', 'Dental clinic', 'https://www.gleninnesdentist.co.nz', NULL, '48 Mayfair Place, Glen Innes, Auckland 1072', NULL, NULL, 'gidentist@xtra.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own East Auckland premises. Email gidentist@xtra.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Glen Innes Dentist Ltd'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('gidentist@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Glenfield Veterinary Clinic', 'Veterinary clinic', 'https://www.glenfieldvets.co.nz', NULL, '46 Diana Drive, Wairau Valley, Glenfield, Auckland 0627', NULL, NULL, 'administration@glenfieldvets.co.nz', '09 444 9552', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own North Shore premises. Email administration@glenfieldvets.co.nz published on the clinic''s own site. A third-party directory names a manager, but it was not reliable enough to use. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Glenfield Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('administration@glenfieldvets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Little Nest Early Learning Centre (Glenfield)', 'Early childhood education / childcare centre', 'https://www.littlenestelc.co.nz', NULL, '46 James Street, Glenfield, Auckland 0629', NULL, NULL, 'info@littlenestelc.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own North Shore premises. Email info@littlenestelc.co.nz published on the centre''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Little Nest Early Learning Centre (Glenfield)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@littlenestelc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Co Star Early Learning Centre (Glenfield)', 'Early childhood education / childcare centre', 'https://costarelc.co.nz', NULL, '79 Chivalry Road, Glenfield, Auckland 0629', NULL, NULL, 'enquiries@costarelc.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own North Shore premises. Email enquiries@costarelc.co.nz published on the centre''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Co Star Early Learning Centre (Glenfield)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('enquiries@costarelc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Birkdale Early Learning Centre (Korue)', 'Early childhood education / childcare centre', NULL, NULL, '167 Birkdale Road, Birkdale, Auckland 0626', NULL, NULL, 'koruearlylearningcentre@xtra.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own North Shore premises (same road as Nurserydale Childcare in this batch - pair the outreach). Email koruearlylearningcentre@xtra.co.nz published on a directory listing tied to the centre''s own premises. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Birkdale Early Learning Centre (Korue)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('koruearlylearningcentre@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Marina Physio', 'Physiotherapy clinic', 'https://marinaphysio.co.nz', NULL, 'Level 1, Compass Building, Ara-Tai, Half Moon Bay, Auckland 2012', 'Derek Timmins', 'Physiotherapist', 'derek.timmins@marinaphysio.co.nz', '(09) 534 4045', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic (5 named practitioners) in its own East Auckland premises. Derek Timmins named on the clinic''s own staff listing with his direct email derek.timmins@marinaphysio.co.nz published via a sports-physiotherapy directory tied to the clinic''s own domain. Role shown as Physiotherapist on the team page - not confirmed as owner/manager, but his personal clinic-domain email supports a named greeting. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Marina Physio'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('derek.timmins@marinaphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'South Auckland Dental & Orthodontics (Otahuhu)', 'Dental clinic', 'https://www.aucklanddental.co.nz', NULL, '21 Hall Avenue, Otahuhu, Auckland 1062', NULL, NULL, 'office@smilesahead.co.nz', '09 270 0200', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental/orthodontic clinic described as locally owned and operated, in its own South Auckland premises. Email office@smilesahead.co.nz published on the clinic''s own site. No reliably-named owner found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('South Auckland Dental & Orthodontics (Otahuhu)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@smilesahead.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pink Fern Fitness (Rosedale)', 'Gym / fitness studio (women-only)', 'https://www.pinkfern.co.nz', NULL, '325 Albany Highway, Rosedale, Auckland 0632', NULL, NULL, 'info@pinkfern.co.nz', '09 419 8198', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Women-only gym in its own North Shore premises. Email info@pinkfern.co.nz published on the gym''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pink Fern Fitness (Rosedale)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@pinkfern.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Flex Fitness Albany', 'Gym / fitness club', 'https://www.facebook.com/flexfitnessalbany/', NULL, 'C3/65 Greville Road, Albany, Auckland 0632', NULL, NULL, 'albany@flexfitnessgym.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Gym/fitness club in its own North Shore premises. Email albany@flexfitnessgym.co.nz published on the club''s own Facebook page. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Flex Fitness Albany'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('albany@flexfitnessgym.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Fitstop Albany', 'Gym / fitness studio', 'https://fitstop.com/nz/gyms/akl/albany/', NULL, '252 Oteha Valley Road, Albany, Auckland 0632', NULL, NULL, 'albanynz@fitstop.com', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Locally-run fitness studio franchise location in its own North Shore premises. Email albanynz@fitstop.com published on the studio''s own site. No named local manager found publicly (a global athletic director is named but is not local). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Fitstop Albany'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('albanynz@fitstop.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Three Kings Family Medical Centre', 'Medical centre / GP clinic', 'https://www.tkfmc.co.nz', NULL, '535 Mount Albert Road, Three Kings, Auckland 1042', NULL, NULL, 'reception@tkfmc.co.nz', '(09) 625 8998', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP medical centre in its own premises. Email reception@tkfmc.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Three Kings Family Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@tkfmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Creative Garden ELC (Dawson)', 'Early childhood education / childcare centre', 'https://www.creativegarden.nz', NULL, '100 Dawson Road, Otara, Auckland 2023', 'Mukesh Garg & Komal Mangla', 'Owners', 'dawson@creativegarden.nz', '+64 9 273 9688', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independently-owned ECE centre in its own South Auckland premises. Owners Mukesh Garg and Komal Mangla named on the centre''s own listing; published dawson@creativegarden.nz reaches them directly. Owner-operator = fast decision on a cleaning contract. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Creative Garden ELC (Dawson)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('dawson@creativegarden.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mt Eden Veterinary Clinic', 'Veterinary clinic', 'https://www.mtedenvet.nz', NULL, '455A Mt Eden Road, Mount Eden, Auckland 1024', 'Dr Andrew', 'Owner-Operator Veterinarian', 'mtedenvets@gmail.com', '09-623-7387', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Mt Eden premises. The clinic''s own "About Us" page (mtedenvet.nz) describes itself as owner-operated and names Dr Andrew; published mtedenvets@gmail.com reaches him directly. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mt Eden Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mtedenvets@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Macleans Dentist', 'Dental clinic', 'https://macleansdentist.co.nz', NULL, '219 Bucklands Beach Road, Howick, Auckland 2014', 'Dr Shahba Faraj', 'Dentist', 'macleansdentist@gmail.com', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own East Auckland premises. Dr Shahba Faraj named on the clinic''s own site as a long-time local dentist; published macleansdentist@gmail.com reaches the practice. Role not explicitly stated as owner, but she is the clinic''s named face. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Macleans Dentist'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('macleansdentist@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Flat Bush Dental', 'Dental clinic', NULL, NULL, '201 Murphys Road, Flat Bush, Auckland 2016', NULL, NULL, 'flatbushdental2018@gmail.com', '09-930 8315', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own South Auckland premises. Email flatbushdental2018@gmail.com published on the clinic''s own Facebook page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Flat Bush Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('flatbushdental2018@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Botany South Dental', 'Dental clinic', 'https://botanysouthdental.co.nz', NULL, '2A/302 Te Irirangi Drive, Flat Bush, Auckland 2016', NULL, NULL, 'info@botanysouthdental.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own South Auckland premises; the practice''s own "about us" page describes a female founder who bought the practice with a named partner, but no surnames are given, so no name used. Email info@botanysouthdental.co.nz published on the clinic''s own site. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Botany South Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@botanysouthdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Chapel Park Dental', 'Dental clinic', 'https://www.chapelparkdental.co.nz', NULL, '140 Chapel Road, Flat Bush, Auckland 2016', NULL, NULL, 'dentist@chapelparkdental.co.nz', '09 272 8488', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own South Auckland premises. Email dentist@chapelparkdental.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Chapel Park Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('dentist@chapelparkdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kiwi Supertots (Botany)', 'Early childhood education / childcare centre', 'https://kiwisupertots.co.nz', NULL, '37 Bishop Dunn Place, Botany, Auckland 2010', NULL, NULL, 'nader@kiwisupertots.co.nz', '09 271 6553', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre in its own East Auckland premises. Email nader@kiwisupertots.co.nz published on the centre''s own site (appears to be a named individual''s address, but role/surname not confirmed, so no formal contact name used). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kiwi Supertots (Botany)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('nader@kiwisupertots.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Little Learners (Botany South)', 'Early childhood education / childcare centre', 'https://little-learners.co.nz', NULL, '491 Te Irirangi Drive, Botany South, Auckland 2016', NULL, NULL, 'littlelearners491@gmail.com', '09 272 3344', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre in its own East Auckland premises. Email littlelearners491@gmail.com published on the centre''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Little Learners (Botany South)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('littlelearners491@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ellerslie Veterinary Clinic', 'Veterinary clinic', 'https://ellerslieveterinaryclinic.nz', NULL, '199 Main Highway, Ellerslie, Auckland 1051', NULL, NULL, 'office@ellerslieveterinaryclinic.nz', '(09) 281 3481', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic (also boards cats) in its own Ellerslie premises. Email office@ellerslieveterinaryclinic.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ellerslie Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@ellerslieveterinaryclinic.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Trafalgar Family Dental (Onehunga)', 'Dental clinic', 'https://trafalgarfamilydental.co.nz', NULL, '109A Trafalgar Street, Onehunga, Auckland 1061', 'Heena Arora', 'Practice Manager', 'trafalgarfamilydental@gmail.com', '09 622 0516', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Onehunga premises. Practice Manager Heena Arora named on the clinic''s own team page (trafalgarfamilydental.co.nz/about-us); published trafalgarfamilydental@gmail.com reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Trafalgar Family Dental (Onehunga)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('trafalgarfamilydental@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Royal Oak Dental Centre', 'Dental clinic', 'https://royaloakdental.co.nz', NULL, '792A Manukau Road, Royal Oak, Auckland 1023', NULL, NULL, 'reception@royaloakdental.co.nz', '09 625 7069', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own premises. Email reception@royaloakdental.co.nz published on the clinic''s own contact page. No reliably-confirmed owner named. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Royal Oak Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@royaloakdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'CareVets Glen Eden', 'Veterinary clinic', 'https://carevets.co.nz/carevets-glen-eden/', NULL, '69 West Coast Road, Glen Eden, Auckland 0602', NULL, NULL, 'gleneden@carevets.co.nz', '(09) 818 7454', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises. Email gleneden@carevets.co.nz published on the clinic''s own site. A vet (Dr Sue Kirkby) is named but ownership not confirmed, so no name used. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('CareVets Glen Eden'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('gleneden@carevets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Veterinary Hospital (Glen Eden)', 'Veterinary clinic', 'https://www.vethospital.co.nz/vet-clinics/auckland-veterinary-hospital', NULL, '4143 Great North Road, Glen Eden, Auckland 0602', NULL, NULL, 'auckland@vethospital.co.nz', '09-818-5697', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises, part of the same small Veterinary Hospital Group as Albany Veterinary Hospital (seed batch 1) but locally staffed. Email auckland@vethospital.co.nz published on the group''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Veterinary Hospital (Glen Eden)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('auckland@vethospital.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Our Kids Early Learning Centre (Onehunga)', 'Early childhood education / childcare centre', NULL, NULL, '208A Church Street, Onehunga, Auckland 1061', NULL, NULL, 'onehunga@ourkidsearlylearning.co.nz', '09 636 1395', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre in its own Onehunga premises. Email onehunga@ourkidsearlylearning.co.nz published on the Education Counts profile. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Our Kids Early Learning Centre (Onehunga)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('onehunga@ourkidsearlylearning.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Apples Childcare & Learning Centre (Onehunga)', 'Early childhood education / childcare centre', 'https://appleschildcare.co.nz', NULL, '20-22 Cameron Street, Onehunga, Auckland 1061', NULL, NULL, 'onehunga@appleschildcare.co.nz', '(09) 634 8000', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre in its own Onehunga premises, operating for over a decade per its own site. Email onehunga@appleschildcare.co.nz published on the centre''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Apples Childcare & Learning Centre (Onehunga)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('onehunga@appleschildcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'McIntosh Dental (Henderson)', 'Dental clinic', 'https://www.mcintoshdental.co.nz', NULL, '43 Lincoln Road, Henderson, Auckland 0610', 'Dr Alex McIntosh', 'Founder / Lead Dentist', 'info@mcintoshdental.co.nz', '09 837 2598', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own West Auckland premises. Founder/lead dentist Dr Alex McIntosh named on the clinic''s own site (mcintoshdental.co.nz); published info@mcintoshdental.co.nz reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('McIntosh Dental (Henderson)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@mcintoshdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Results Fitness (Henderson)', 'Gym / fitness studio (women-only)', 'https://www.resultsfitness.co.nz', NULL, '199B Lincoln Road, Henderson, Auckland 0610', 'Ursh & Sam', 'Owners', 'reception@resultsfitness.co.nz', '(09) 836 9099', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Women-only gym in its own West Auckland premises. Owners Ursh and Sam named on the gym''s own site (first names only, as published); reception@resultsfitness.co.nz published on the same site reaches them. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Results Fitness (Henderson)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@resultsfitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Henderson Medical Centre', 'Medical centre / GP clinic', 'https://www.hendersonmedical.co.nz', NULL, '2 Montel Avenue, Henderson, Auckland 0612', 'Dee-Anne Knight', 'Practice Manager', 'adminhmc@hendersonmedical.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP medical centre in its own West Auckland premises. Practice Manager Dee-Anne Knight named on the clinic''s own contact page (hendersonmedical.co.nz/contact-us) with her admin inbox adminhmc@hendersonmedical.co.nz (monitored business hours Mon-Fri). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Henderson Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('adminhmc@hendersonmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Ardmore Vet (Papakura)', 'Veterinary clinic', 'https://www.theardmorevet.co.nz', NULL, '88 Clevedon-Takanini Road, Ardmore, Papakura, Auckland 2580', 'Dr April', 'Founder', 'contact@theardmorevet.co.nz', '09 296 1946', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own South Auckland premises, established 2009 by Dr April per the clinic''s own site (theardmorevet.co.nz) - first name only published, ownership not re-confirmed as current but she is the clinic''s named founder. Published contact@theardmorevet.co.nz reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Ardmore Vet (Papakura)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('contact@theardmorevet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Flex Fitness Henderson', 'Gym / fitness club', 'https://www.flexfitnessgym.co.nz/clubs/henderson', NULL, '10-12 Ratanui Street, Henderson, Auckland 0610', NULL, NULL, 'henderson@flexfitnessgym.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Gym/fitness club in its own West Auckland premises. Email henderson@flexfitnessgym.co.nz published on the club''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Flex Fitness Henderson'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('henderson@flexfitnessgym.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kingsland Physiotherapy', 'Physiotherapy / fitness club', 'https://www.healthandsports.co.nz/kingsland-physio-massage', NULL, '495 New North Road, Kingsland, Auckland 1021', NULL, NULL, 'admin@kingslandphysio.co.nz', '(09) 849 9080', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy/sports fitness clinic in its own Kingsland premises. Email admin@kingslandphysio.co.nz published on the clinic''s own listing. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kingsland Physiotherapy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@kingslandphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ratanui Medical Centre (Henderson)', 'Medical centre / GP clinic', NULL, NULL, '77 Lincoln Road, Henderson, Auckland 0610', NULL, 'Practice Manager', 'pm@ratanui.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP medical centre in its own West Auckland premises. Role-addressed inbox pm@ratanui.co.nz published on a directory listing tied to the clinic''s own domain, reaching the practice manager directly even without a personal name. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ratanui Medical Centre (Henderson)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('pm@ratanui.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'West Auckland Medical & Surgical Centre', 'Medical centre / GP clinic', 'https://www.wamsc.co.nz', NULL, '149 Henderson Valley Road, Henderson, Auckland 0612', NULL, NULL, 'reception@wamsc.co.nz', '09 242 3358', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP medical centre in its own West Auckland premises. Email reception@wamsc.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('West Auckland Medical & Surgical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@wamsc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Veterinary Associates Takanini', 'Veterinary clinic', 'https://www.netvet.co.nz', NULL, '152A Great South Road, Takanini, Auckland 2112', NULL, NULL, 'vets@netvet.co.nz', '(09) 299-8250', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own South Auckland premises. Email vets@netvet.co.nz published on the clinic''s own contact page. No reliably-current named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Veterinary Associates Takanini'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('vets@netvet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Vets at 77 (Papakura)', 'Veterinary clinic', 'https://vets77.co.nz', NULL, '77 Great South Road, Papakura, Auckland 2110', NULL, NULL, 'reception@vets77.co.nz', '09 299 9977', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own South Auckland premises. Email reception@vets77.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Vets at 77 (Papakura)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@vets77.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Jervois Dental (Herne Bay)', 'Dental clinic', 'https://www.jervoisdental.co.nz', NULL, '139 Jervois Road, Herne Bay, Auckland 1011', 'Dr Graham Shaw', 'Founding Dentist', 'reception@jervoisdental.co.nz', '0800 005 200', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Herne Bay premises. Founding dentist Dr Graham Shaw named on the clinic''s own site (jervoisdental.co.nz); published reception@jervoisdental.co.nz reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Jervois Dental (Herne Bay)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@jervoisdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Lightingplus (North Shore)', 'Lighting showroom', 'https://www.lightingplus.co.nz/stores/north-shore', NULL, '16E Link Drive, Wairau Valley, Auckland 0627', 'Taryn Foster', 'Store Manager', 'northshore@lightingplus.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Lighting showroom with a display floor (presentation-critical premises). Store Manager Taryn Foster named on the store''s own page (lightingplus.co.nz/stores/north-shore); published northshore@lightingplus.co.nz reaches the branch. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Lightingplus (North Shore)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('northshore@lightingplus.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Bardsleys Lighting & Design (Takapuna)', 'Lighting showroom', NULL, NULL, '3-5 Auburn Street, Takapuna, Auckland 0622', 'Mark', 'Contact (role unconfirmed)', 'mark@bardsleyslighting.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Lighting/design showroom in its own Takapuna premises. Published personal-style email mark@bardsleyslighting.co.nz found on a business directory listing tied to the showroom''s own domain - likely a decision-maker given the format, but role not confirmed, so graded cautiously. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Bardsleys Lighting & Design (Takapuna)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mark@bardsleyslighting.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ponsonby Teeth', 'Dental clinic', 'https://www.ponsonbyteeth.co.nz', NULL, '213 Ponsonby Road, Ponsonby, Auckland 1011', NULL, NULL, 'reception@ponsonbyteeth.co.nz', '09 953 4093', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Ponsonby premises. Email reception@ponsonbyteeth.co.nz published on the clinic''s own site. No reliably-confirmed owner named (three dentists listed, ownership not stated). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ponsonby Teeth'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@ponsonbyteeth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Genesis Fitness (Remuera)', 'Gym / fitness studio', 'https://www.genesisfitness.co.nz', NULL, '33 Haast Street, Remuera, Auckland 1050', NULL, NULL, 'info@genesisfitness.co.nz', '09 520 3455', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Large (2,000sqm) gym with a CrossFit box and Reformer Pilates studio in its own Remuera premises - varied cleaning surfaces (mats, showers, studio floors). Email info@genesisfitness.co.nz published on the gym''s own Facebook page. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Genesis Fitness (Remuera)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@genesisfitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Fit For Life Gym (Remuera)', 'Gym / fitness studio', 'https://fitforlifegym.co.nz', NULL, '437A Remuera Road, Remuera, Auckland 1050', NULL, NULL, 'info@fitforlifegym.co.nz', '021 277 1595', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Gym/personal training studio in its own Remuera premises. Email info@fitforlifegym.co.nz published on the gym''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Fit For Life Gym (Remuera)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@fitforlifegym.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Galaxy Lighting (North Shore)', 'Lighting showroom', 'https://galaxylighting.nz', NULL, '19/18 Link Drive, Wairau Valley, Auckland 0627', NULL, NULL, 'info@galaxylighting.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Lighting showroom with a display floor (same street as Lightingplus in this batch - pair the outreach). Email info@galaxylighting.nz published on the showroom''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Galaxy Lighting (North Shore)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@galaxylighting.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Pet Hospital (Grey Lynn)', 'Veterinary clinic', 'https://aucklandpethospital.co.nz', NULL, '46-48 Pollen Street, Grey Lynn, Auckland 1021', 'Dr Alex Melrose', 'Owner', 'reception@aucklandpethospital.co.nz', '(09) 360 0961', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic (built up since 2004) in its own Grey Lynn premises. Dr Alex Melrose named as the business owner (per a Yelp review cross-referencing the clinic''s own staff listing); published reception@aucklandpethospital.co.nz reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Pet Hospital (Grey Lynn)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@aucklandpethospital.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Lifestyle Fitness (Auckland CBD)', 'Gym / fitness studio', 'https://lifestylefitness.co.nz', NULL, 'Scene One Apartments, Beach Road, Auckland CBD, Auckland 1010', 'Olenito Peauafi', 'Director', 'memberships@lifestylefitness.co.nz', '09 377 6977', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Gym in its own CBD apartment-building premises. Director Olenito Peauafi named on the gym''s own "About Us" page (lifestylefitness.co.nz); published memberships@lifestylefitness.co.nz reaches the business. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Lifestyle Fitness (Auckland CBD)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('memberships@lifestylefitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Reform Fitness (Commercial Bay)', 'Pilates / reformer studio', 'https://reformfitness.co.nz/studios/commercial-bay/', NULL, 'Level 2, 7 Queen Street, Auckland CBD, Auckland 1010', 'Stella Kang', 'Studio Owner', 'commercialbay@reformfitness.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Reformer Pilates studio inside Commercial Bay. Studio Owner Stella Kang named on the studio''s own page (reformfitness.co.nz/studios); published commercialbay@reformfitness.co.nz reaches the studio directly. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Reform Fitness (Commercial Bay)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('commercialbay@reformfitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kohimarama Dental Centre', 'Dental clinic', 'https://kohimaramadental.co.nz', NULL, '303c Kepa Road, Kohimarama, Auckland 1071', NULL, NULL, 'info@kohimaramadental.co.nz', '09 528 7996', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own East Auckland premises. Email info@kohimaramadental.co.nz published on the clinic''s own site. Dr Raj Thathiah is named as a dentist but current ownership is not confirmed, so no name used. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kohimarama Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@kohimaramadental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'District Fitness (Auckland CBD)', 'Gym / group fitness studio', 'https://www.districtfitness.co.nz', NULL, '125 Queen Street, Auckland CBD, Auckland 1010', NULL, NULL, 'hello@districtfitness.co.nz', '09 600 2223', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Group-class fitness studio in its own CBD premises. Email hello@districtfitness.co.nz published on the studio''s own site. No named owner found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('District Fitness (Auckland CBD)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@districtfitness.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pt Chevalier Family Dentist', 'Dental clinic', 'https://www.pcfd.co.nz', NULL, '2 Carrington Road, Point Chevalier, Auckland 1022', NULL, NULL, 'info@pcfd.co.nz', '(09) 846 7777', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own premises. Email info@pcfd.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pt Chevalier Family Dentist'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@pcfd.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Point Chevalier Dental', 'Dental clinic', 'https://ptchevalierdental.nz', NULL, '1191A Great North Road, Point Chevalier, Auckland 1022', 'Vilas Patel', 'Contact (role unconfirmed)', 'ptchevdental@gmail.com', '09 846 6440', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own premises. Vilas Patel named as the clinic''s contact on its own site (ptchevalierdental.nz) but role (owner vs dentist) not confirmed. Published ptchevdental@gmail.com reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Point Chevalier Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('ptchevdental@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Childsplay Unlimited (Kingsland)', 'Early childhood education / childcare centre', 'https://childsplayunlimited.co.nz', NULL, '6B Western Springs Road, Kingsland, Auckland 1021', NULL, NULL, 'childsplay.kingsland@hotmail.com', '09 846 8908', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre (one of two Childsplay Unlimited sites) in its own Kingsland premises. Email childsplay.kingsland@hotmail.com published on the Education Counts profile. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Childsplay Unlimited (Kingsland)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('childsplay.kingsland@hotmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Blockhouse Bay Veterinary Centre', 'Veterinary clinic', 'https://blockhousebayvets.co.nz', NULL, '24 Donovan Street, Blockhouse Bay, Auckland 0600', NULL, NULL, 'vets@bhbvets.co.nz', '09 626 3456', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises. Email vets@bhbvets.co.nz published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Blockhouse Bay Veterinary Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('vets@bhbvets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Invictus Gym (New Lynn)', 'Gym / fitness studio', 'https://invictusgym.co.nz', NULL, '80 Delta Avenue, New Lynn, Auckland 0600', 'Fawad', 'Contact (role unconfirmed)', 'invictus@thepeoplesgym.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Kiwi-owned gym in its own West Auckland premises (per the gym''s own site). Fawad named as a contact on a directory listing but his role is not confirmed as owner/manager. Published invictus@thepeoplesgym.co.nz reaches the gym. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Invictus Gym (New Lynn)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('invictus@thepeoplesgym.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Focus Fitness Gym (New Lynn)', 'Gym / fitness studio', 'https://focusfitnessgym.co.nz', NULL, '2 Margan Avenue, New Lynn, Auckland 0600', NULL, NULL, 'reception@focusfitnessgym.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Gym in its own West Auckland premises. Email reception@focusfitnessgym.co.nz published on the gym''s own site. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Focus Fitness Gym (New Lynn)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@focusfitnessgym.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Titirangi Dental Centre', 'Dental clinic', 'https://tooth.co.nz', NULL, '421 Titirangi Road, Titirangi, Auckland 0604', NULL, NULL, 'reception@tooth.co.nz', '09 550 8770', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic (3 dentists) in its own West Auckland premises. Email reception@tooth.co.nz published on the clinic''s own site. No reliably-current named owner found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Titirangi Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@tooth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Titirangi Village Dental', 'Dental clinic', 'https://www.titirangivillagedental.co.nz', NULL, '429 Titirangi Road, Titirangi, Auckland 0604', NULL, NULL, 'info@titirangivillagedental.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own West Auckland premises, recently under new ownership per the clinic''s own site. Email info@titirangivillagedental.co.nz published on the same site. New owner not named by the clinic itself, so no name used. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Titirangi Village Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@titirangivillagedental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'CareVets Te Atatu', 'Veterinary clinic', 'https://carevets.co.nz/carevets-te-atatu/', NULL, '520 Te Atatu Road, Te Atatu, Auckland 0610', NULL, NULL, 'teatatu@carevets.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own West Auckland premises. Email teatatu@carevets.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('CareVets Te Atatu'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('teatatu@carevets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Te Atatu South Childcare', 'Early childhood education / childcare centre', 'http://www.teatatusouthchildcare.co.nz', NULL, '1 Vera Road, Te Atatu South, Auckland 0610', NULL, NULL, 'info@teatatusouthchildcare.co.nz', '09 834 3018', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Family-based, privately-owned daycare run by one management team since 1993, per the centre''s own site (teatatusouthchildcare.co.nz) - a genuinely independent operator, though no individual name is published. Email info@teatatusouthchildcare.co.nz published on the same site. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Te Atatu South Childcare'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@teatatusouthchildcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kimberley Childcare (Te Atatu South)', 'Early childhood education / childcare centre', 'https://www.kimberleychildcare.co.nz/teatatu', NULL, '3 Flanshaw Road, Te Atatu South, Auckland 0610', NULL, NULL, 'teatatu@kimberleychildcare.co.nz', '09 834 1219', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] ECE centre in its own West Auckland premises (small two-site operator, not a large chain). Email teatatu@kimberleychildcare.co.nz published on the centre''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kimberley Childcare (Te Atatu South)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('teatatu@kimberleychildcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Alpers Dental (Epsom)', 'Dental clinic', 'https://www.alpersdental.co.nz', NULL, '24 Manukau Road, Epsom, Auckland 1023', 'Dr Nic Anderson', 'Principal Dentist / Owner', 'contact@alpers.co.nz', '09 524 5056', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Family-owned dental clinic, owner-operated since 2005, in its own Epsom premises. Principal Dentist Dr Nic Anderson (who took over the practice with Jacqui in 2005) named on the clinic''s own site (alpersdental.co.nz); published contact@alpers.co.nz reaches the practice. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Alpers Dental (Epsom)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('contact@alpers.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Normanby Road Vet Clinic (Mt Eden)', 'Veterinary clinic', 'https://www.petdoc.co.nz', NULL, '49 Normanby Road, Mount Eden, Auckland 1024', 'Dr Chris Laurenson', 'Veterinarian', 'info@petdoc.co.nz', '09-638-8445', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Mt Eden premises, independent and NZ-owned per the clinic''s own site (petdoc.co.nz). Dr Chris Laurenson named there as the client-facing contact; published info@petdoc.co.nz reaches the practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Normanby Road Vet Clinic (Mt Eden)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@petdoc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Whitford Early Learning Centre', 'Early childhood education / childcare centre', NULL, NULL, '633 Whitford Road, Whitford, Auckland 2577', 'Kim & Joe O''Neill', 'Founders', 'info@whitfordearlylearning.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Privately-owned ECE centre (licensed for up to 107 children) in its own East Auckland premises. Founders Kim and Joe O''Neill named in the centre''s own site structured data; published info@whitfordearlylearning.co.nz reaches them. Owner-operator = fast decision. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Whitford Early Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@whitfordearlylearning.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Fitness HQ (Albany)', 'Gym / fitness studio (women-only)', 'https://www.fhq.co.nz', NULL, '67 Corinthian Drive, Albany, Auckland 0632', NULL, NULL, 'info@fhq.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Women-only boutique gym, locally owned and operated, in its own North Shore premises. Email info@fhq.co.nz published on the gym''s own site. No individual owner named publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Fitness HQ (Albany)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@fhq.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Onewa Road Veterinary Hospital', 'Veterinary clinic', 'https://www.onewavets.co.nz', NULL, '181 Onewa Road, Birkenhead, Auckland 0626', NULL, NULL, 'onewa.vets@gmail.com', '09 481 0061', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic, independent and veterinarian-owned per the clinic''s own site (onewavets.co.nz - "the vets who care for your pets are also the owners"), in its own North Shore premises. Email onewa.vets@gmail.com published on the same site. No individual owner named. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Onewa Road Veterinary Hospital'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('onewa.vets@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Tadpoles Early Childhood Centre (Mangere Bridge)', 'Early childhood education / childcare centre', 'https://tadpoles.co.nz', NULL, '73 Mountain Road, Mangere Bridge, Auckland 2022', NULL, NULL, 'admin@tadpoles.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Privately-owned ECE centre (licensed for up to 75 children), family owned and operated per the centre''s own site, in its own South Auckland premises. Email admin@tadpoles.co.nz published on the same site. No individual owner named. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Tadpoles Early Childhood Centre (Mangere Bridge)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@tadpoles.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere Dental Centre', 'Dental clinic', 'https://www.mangeredentalcentre.co.nz', NULL, 'Shop 7B Mangere Town Centre, Bader Drive, Mangere, Auckland 2022', NULL, NULL, 'mangeredental@gmail.com', '(09) 275 7754', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own South Auckland premises. Email mangeredental@gmail.com published on the clinic''s own contact page. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangeredental@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Dental Planet (Mangere)', 'Dental clinic', 'https://dentalplanet.co.nz/location/mangere/', NULL, '10 Waddon Place, Mangere, Auckland 2022', NULL, NULL, 'appointments@dentalplanet.co.nz', '0800 262 2208', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own South Auckland premises. Email appointments@dentalplanet.co.nz published on the clinic group''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Dental Planet (Mangere)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('appointments@dentalplanet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Meadowbank Physio', 'Physiotherapy clinic', 'https://www.meadowbankphysio.co.nz', NULL, '765 Remuera Road, Meadowbank, Auckland 1072', NULL, NULL, 'physio@meadowbankphysio.co.nz', '09 520 2666', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic in its own Meadowbank premises. Email physio@meadowbankphysio.co.nz published on the clinic''s own contact page. No reliably-confirmed named owner found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Meadowbank Physio'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('physio@meadowbankphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere Veterinary Clinic', 'Veterinary clinic', 'https://www.vetforpet.co.nz', NULL, '95 Coronation Road, Mangere Bridge, Auckland 2022', NULL, NULL, 'mangerevet@xtra.co.nz', '09 636 6732', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic (also runs a second site, Onehunga Vet and Pet Supplies) in its own South Auckland premises. Email mangerevet@xtra.co.nz published on the clinic''s own site. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangerevet@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Manurewa Healthcare', 'Medical centre / GP clinic', NULL, NULL, '210 Great South Road, Manurewa, Auckland', 'Lisa Maritz', 'Clinic Manager', 'reception@manurewadoc.co.nz', '(09) 266 4477', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice on Great South Road with real clinic premises (waiting room, consult rooms). Clinic Manager Lisa Maritz named on the practice''s Healthpoint listing (healthpoint.co.nz); reception email reception@manurewadoc.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Manurewa Healthcare'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@manurewadoc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Manurewa Medical Ltd', 'Medical centre / GP clinic', NULL, NULL, '157 Great South Road, Manurewa, Auckland 2102', 'Rachael Moore', 'Practice Manager', 'reception@manurewamedical.co.nz', '(09) 266 7758', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ProCare-affiliated GP practice with several doctors on staff, own premises on Great South Road. Practice Manager Rachael Moore named on the practice''s Healthpoint listing (healthpoint.co.nz); reception email reception@manurewamedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Manurewa Medical Ltd'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@manurewamedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Peninsula Medical Centre (Te Atatu Peninsula)', 'Medical centre / GP clinic', 'https://www.peninsulamed.co.nz', NULL, '382-386 Te Atatu Road, Te Atatu Peninsula, Auckland', 'Lesley Going', 'Practice Manager', 'admin@peninsulamed.co.nz', '(09) 834 6300', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Te Atatu Road premises. Practice Manager Lesley Going named on the practice''s Healthpoint listing (healthpoint.co.nz); admin@peninsulamed.co.nz matches own domain peninsulamed.co.nz. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Peninsula Medical Centre (Te Atatu Peninsula)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@peninsulamed.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Botany Town Centre Medical Practice', 'Medical centre / GP clinic', 'https://www.bmp.nz', NULL, 'Level 1, Botany Town Centre, 588 Chapel Road, Botany, Auckland 2013', 'Annelize', 'Practice Manager', 'admin@bmp.nz', '(09) 273 6003', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice with its own fitted-out clinic space inside Botany Town Centre. Practice Manager Annelize named on the practice''s Healthpoint listing (healthpoint.co.nz); admin@bmp.nz matches own domain bmp.nz. No renewal hint found. Note: a separate, unrelated practice (Botany Doctor Medical Practice) shares the same building/street address with its own phone line - see separate lead below, not a duplicate.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Botany Town Centre Medical Practice'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@bmp.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Browns Bay Family Doctors', 'Medical centre / GP clinic', NULL, NULL, '65 Clyde Road (above the ANZ Bank), Browns Bay, Auckland 0630', 'Hind Al-Zubaidi', 'Business Manager', 'businessmanager@bbfd.co.nz', '(09) 479 4834', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice with its own premises above the ANZ on Clyde Road. Business Manager Hind Al-Zubaidi named with a direct email, businessmanager@bbfd.co.nz, on the practice''s own recruitment listing (via healthpoint.co.nz / RNZCGP jobs board, posted by the practice). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Browns Bay Family Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('businessmanager@bbfd.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Franklin Vets Pukekohe', 'Veterinary clinic', 'https://www.franklinvets.co.nz', NULL, '86 Harris Street, Pukekohe, Auckland', NULL, NULL, 'pukekoheclinic@fvs.co.nz', '(09) 238 7486', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Established small-animal vet clinic, part of the Franklin Vets group, in its own Pukekohe premises. Clinic email pukekoheclinic@fvs.co.nz published on the clinic''s own contact page (franklinvets.co.nz/contact/pukekohe). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Franklin Vets Pukekohe'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('pukekoheclinic@fvs.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Franklin Vets Papakura', 'Veterinary clinic', 'https://www.franklinvets.co.nz', NULL, '365 Great South Road, Papakura, Auckland', NULL, NULL, 'papakuraclinic@fvs.co.nz', '(09) 298 6994', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Established small-animal vet clinic, part of the Franklin Vets group, in its own Papakura premises. Clinic email papakuraclinic@fvs.co.nz published on the clinic''s own contact page (franklinvets.co.nz/contact/papakura). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Franklin Vets Papakura'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('papakuraclinic@fvs.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere East Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '359 Massey Road, Mangere East, Auckland', NULL, NULL, 'mangereeastmc@xtra.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Massey Road premises. Email mangereeastmc@xtra.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz). The listing references a Practice Manager role but does not name the current holder. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere East Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangereeastmc@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Otara Whanau Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '3/100 Alexander Crescent, Otara, Auckland', NULL, NULL, 'owmc@whanaumedical.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Alexander Crescent premises. Email owmc@whanaumedical.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain whanaumedical.co.nz. The listing references a Practice Manager role but does not name the current holder. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Otara Whanau Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('owmc@whanaumedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Glenfield Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '452 Glenfield Road, Glenfield, Auckland', NULL, NULL, 'admin@glenfieldmc.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Larger GP practice (8 GPs, practice manager, nurses, receptionists per listing) in its own Glenfield Road premises. Email admin@glenfieldmc.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain glenfieldmc.co.nz. Practice Manager role confirmed but name not published in this pass. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Glenfield Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@glenfieldmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Botany Doctor Medical Practice', 'Medical centre / GP clinic', NULL, NULL, 'Botany Town Centre, 588 Chapel Road, Botany, Auckland 2013', NULL, NULL, 'reception@botanydoctor.co.nz', '(09) 279 0460', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice led by Dr Marcus Hawkins, in Botany Town Centre (separate practice and phone line from Botany Town Centre Medical Practice in the same building). Email reception@botanydoctor.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain botanydoctor.co.nz. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Botany Doctor Medical Practice'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@botanydoctor.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Remuera Village Medical Centre', 'Medical centre / GP clinic', NULL, '7 doctors + 4 nurses + admin team', '597 Remuera Road, Remuera, Auckland 1050', 'Vicki Metekingi', 'Practice Manager', 'practicemanager@rvmc.co.nz', '(09) 524 5547', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ProCare-affiliated GP practice on Remuera Road with a sizeable team (7 doctors, 4 nurses, admin + practice manager per own recruitment listing). Practice Manager Vicki Metekingi named with a direct email, practicemanager@rvmc.co.nz, on the practice''s own locum-GP listing (via healthpoint.co.nz / RNZCGP jobs board, posted by the practice). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Remuera Village Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('practicemanager@rvmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Doctors St Heliers', 'Medical centre / GP clinic', NULL, NULL, 'Level 1, Pimlico Building, 10 Turua Street, St Heliers, Auckland 1071', 'Akshita Nama', 'Medical Centre Manager', 'info@sh.thedoctors.co.nz', '(09) 575 9491', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice (The Doctors network) with its own clinic floor in the Pimlico Building, St Heliers. Medical Centre Manager Akshita Nama named on the practice''s Healthpoint listing (healthpoint.co.nz); info@sh.thedoctors.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Doctors St Heliers'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@sh.thedoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Orakei Health Services', 'Medical centre / GP clinic (kaupapa Maori)', NULL, NULL, 'Eastridge Shopping Centre, 25/215 Kepa Road, Mission Bay, Auckland 1071', 'Sariah Witika', 'Practice Manager', 'receptionohs@orakeihealth.org.nz', '(09) 578 0956', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Kaupapa Maori GP practice owned/operated by Ngati Whatua Orakei, in its own clinic space at Eastridge Shopping Centre. Practice Manager Sariah Witika named on the practice''s Healthpoint listing (healthpoint.co.nz); reception email receptionohs@orakeihealth.org.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Orakei Health Services'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('receptionohs@orakeihealth.org.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Hobsonville Family Doctors', 'Medical centre / GP clinic', NULL, '27 staff (practice manager, 12 doctors, 6 nurses, 8 admin/reception)', '124 Hobsonville Road, Hobsonville, Auckland', NULL, NULL, 'admin@hfd.co.nz', '(09) 416 8541', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Sizeable GP practice (27-person team per own listing) in its own Hobsonville Road premises. Email admin@hfd.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain hfd.co.nz. Practice Manager role confirmed but name not published in this pass. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Hobsonville Family Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@hfd.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Hobsonville Health', 'Medical centre / GP clinic', NULL, NULL, '42 Suncrest Drive, West Harbour, Auckland', NULL, NULL, 'admin@hobsonvillehealth.co.nz', '(09) 416 8712', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Suncrest Drive clinic premises. Email admin@hobsonvillehealth.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Hobsonville Health'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@hobsonvillehealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'West Harbour Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '86 Oreil Avenue, West Harbour, Auckland', NULL, NULL, 'reception@whmc.co.nz', '(09) 416 8315', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Oreil Avenue premises. Email reception@whmc.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain whmc.co.nz. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('West Harbour Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@whmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Flat Bush Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '201 Murphys Road, Flat Bush, Auckland', NULL, NULL, 'Reception.fbmcl@gmail.com', '(09) 930 8314', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Murphys Road premises. Email Reception.fbmcl@gmail.com published on the practice''s own Healthpoint listing (healthpoint.co.nz), reviewed/edited by the practice itself. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Flat Bush Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('Reception.fbmcl@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Howick Health and Medical Centre', 'Medical centre / GP clinic', 'https://howickhealth.co.nz', NULL, '108 Ridge Road, Howick, Auckland', NULL, NULL, 'reception@howickhealth.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Ridge Road premises. Email reception@howickhealth.co.nz published on the practice''s own site howickhealth.co.nz. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Howick Health and Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@howickhealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'OneCare Health - Papatoetoe', 'Medical centre / GP clinic', NULL, NULL, '230 Great South Road, Papatoetoe, Auckland', 'Jing Yin', 'Practice Manager', 'ocoreception@onecarehealth.co.nz', '(09) 550 2146', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ProCare-affiliated GP practice in its own Great South Road premises. Practice Manager Jing Yin named on the practice''s Healthpoint listing (healthpoint.co.nz); reception email ocoreception@onecarehealth.co.nz matches own domain onecarehealth.co.nz. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('OneCare Health - Papatoetoe'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('ocoreception@onecarehealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Papatoetoe South Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '580 Great South Road, Papatoetoe, Auckland', 'Ahinisha Singla', 'Practice Manager', 'admin@psmc.net.nz', '(09) 279 3200', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ProCare-affiliated GP practice in its own Great South Road premises. Practice Manager Ahinisha (Anisha) Singla named on the practice''s Healthpoint listing (healthpoint.co.nz); admin@psmc.net.nz matches own domain psmc.net.nz. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Papatoetoe South Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@psmc.net.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Active+ Papakura (Counties Care)', 'Physiotherapy clinic', NULL, NULL, '6-18 O''Shannessey Street, Papakura, Auckland (Counties Medical Integrated Health Centre)', NULL, NULL, 'counties@activeplus.co.nz', '(09) 296 1026', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic (Active+ network) inside the Counties Medical Integrated Health Centre, Papakura, with several physiotherapists and OTs on staff per Healthpoint. Email counties@activeplus.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Active+ Papakura (Counties Care)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('counties@activeplus.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Hunters Corner Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '28 Hoteo Avenue, Papatoetoe, Auckland', 'Wendy', 'Practice Manager', 'reception@hunterscornermedical.co.nz', '(09) 277 8297', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice (appointment-only) in its own Hoteo Avenue premises. Practice Manager Wendy named (first name only) on the practice''s Healthpoint listing (healthpoint.co.nz); reception email reception@hunterscornermedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Hunters Corner Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@hunterscornermedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Titirangi Medical Centre Ltd', 'Medical centre / GP clinic', 'https://titirangimc.co.nz', NULL, '2 Rangiwai Road, Titirangi, Auckland', 'Vicki Palmer', 'Practice Manager', 'practicemanager@titirangimc.co.nz', '(09) 817 8069', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Rangiwai Road premises. Practice Manager Vicki Palmer named with a direct email, practicemanager@titirangimc.co.nz, on the practice''s own recruitment listing (via healthpoint.co.nz / RNZCGP jobs board, posted by the practice, dated Aug 2026). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Titirangi Medical Centre Ltd'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('practicemanager@titirangimc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Doctors Mt Roskill', 'Medical centre / GP clinic', NULL, NULL, '464 Richardson Road, Mt Roskill, Auckland', NULL, NULL, 'admin@mr.thedoctors.co.nz', '(09) 626 7750', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice (The Doctors network) in its own Richardson Road premises. Email admin@mr.thedoctors.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Doctors Mt Roskill'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@mr.thedoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Local Doctors Mt Roskill (Urgent Care & GP)', 'Medical centre / GP / urgent care clinic', NULL, NULL, '445 Richardson Road, Mt Roskill, Auckland', NULL, NULL, 'pm@medicalcentre1.co.nz', '(09) 627 8552', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP/urgent care practice in its own Richardson Road premises. Practice-management mailbox pm@medicalcentre1.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz). No named holder found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Local Doctors Mt Roskill (Urgent Care & GP)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('pm@medicalcentre1.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere Veterinary Clinic', 'Veterinary clinic', 'https://vetforpet.co.nz', NULL, '95 Coronation Road, Mangere Bridge, Auckland', NULL, NULL, 'mangerevet@xtra.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic (Integrity Animal Care Ltd, also runs Onehunga Veterinary & Pet Supplies) in its own Mangere Bridge premises. Email mangerevet@xtra.co.nz published via the clinic''s own NZVA recruitment listing. No clearly-titled ops contact found (a "Rachel" is named as practice contact on the listing but role is unclear, so left out). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangerevet@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Royal Oak Medical Centre', 'Medical centre / GP clinic', NULL, NULL, 'Royal Oak Mall, 691 Manukau Road, Royal Oak, Auckland', NULL, NULL, 'reception@royaloakmedical.co.nz', '(09) 625 9221', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own premises at Royal Oak Mall. Email reception@royaloakmedical.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Royal Oak Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@royaloakmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Onehunga Family Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '161 Onehunga Mall, Onehunga, Auckland', NULL, NULL, 'reception.ofmc@gmail.com', '(09) 636 6267', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Onehunga Mall premises, currently enrolling new patients. Email reception.ofmc@gmail.com published on the practice''s own Healthpoint listing (healthpoint.co.nz), reviewed/edited by the practice itself. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Onehunga Family Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception.ofmc@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Epsom Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '102 Great South Road, Epsom, Auckland', NULL, NULL, 'info@epsommedicalcentre.co.nz', '(09) 520 5060', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Great South Road premises. Email info@epsommedicalcentre.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Epsom Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@epsommedicalcentre.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Eastern Family Doctors', 'Medical centre / GP clinic', NULL, NULL, '17 Aviemore Drive, Highland Park, Auckland 2010', NULL, NULL, 'reception@easternfamilydoctors.co.nz', '(09) 222 0168', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Multicultural GP practice in its own Highland Park premises. Email reception@easternfamilydoctors.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Eastern Family Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@easternfamilydoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'GP Central - Stoddard', 'Medical centre / GP clinic', 'https://gpcentral.co.nz', NULL, '223 Stoddard Road, Mount Roskill, Auckland', 'Ruth Mansell', 'Business Manager', 'businessmanager@gpcentral.co.nz', '(09) 621 0387', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Stoddard Road premises. Business Manager Ruth Mansell named on the practice''s Healthpoint listing (healthpoint.co.nz); businessmanager@gpcentral.co.nz matches own domain gpcentral.co.nz (which also has a meet-the-team page). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('GP Central - Stoddard'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('businessmanager@gpcentral.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Te Atatu South Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '273 Te Atatu Road, Te Atatu South, Auckland', 'Lesley Going', 'Practice Owner & Managing Director', 'reception@tsmc.co.nz', '(09) 834 6600', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Te Atatu Road premises. Practice Owner & Managing Director Lesley Going named on the practice''s Healthpoint listing (healthpoint.co.nz); reception@tsmc.co.nz matches own domain tsmc.co.nz. Note: Lesley Going also appears as Practice Manager at the separate, nearby Peninsula Medical Centre (different company/email, already a separate lead above) - not a duplicate. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Te Atatu South Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@tsmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Active+ Howick', 'Physiotherapy clinic', NULL, NULL, '15 Cook Street, Howick, Auckland', 'Dominique van Biljon', 'Owner', 'howick@activeplus.co.nz', '(09) 535 9160', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Physiotherapy clinic (Active+ network) in its own Cook Street premises. Owner Dominique van Biljon named in a local news profile (times.co.nz, "Meet your A Physiotherapy team"); clinic email howick@activeplus.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Active+ Howick'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('howick@activeplus.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Bayside Dental Centre', 'Dental clinic', NULL, NULL, '86 Clyde Road, Browns Bay, Auckland', NULL, NULL, 'info@baysidedental.co.nz', '(09) 478 8773', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Clyde Road premises. Email info@baysidedental.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Bayside Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@baysidedental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Meadowbank Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '2 Blackett Crescent, Meadowbank, Auckland', 'Paula Bishop', 'Practice Manager', 'info@meadowbankmedical.co.nz', '(09) 528 4242', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Blackett Crescent premises. Practice Manager Paula Bishop named on the practice''s Healthpoint listing (healthpoint.co.nz); info@meadowbankmedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Meadowbank Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@meadowbankmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Meadowbank General Practice', 'Medical centre / GP clinic', NULL, NULL, 'Meadowbank Shopping Centre, 35-47 St Johns Road, Meadowbank, Auckland', NULL, NULL, 'office@mgpdoctors.nz', '(09) 521 5128', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own premises at Meadowbank Shopping Centre (separate practice from Meadowbank Medical Centre above). Email office@mgpdoctors.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Meadowbank General Practice'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@mgpdoctors.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere Bridge Surgery', 'Medical centre / GP clinic', NULL, NULL, '29 Coronation Road, Mangere Bridge, Auckland', 'Rupen Chand', 'Practice Manager', 'mb.surgery@gmail.com', '(09) 634 2542', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Coronation Road premises. Practice Manager Rupen Chand named on the practice''s own Healthpoint listing (healthpoint.co.nz), reviewed/edited by the practice itself. Email mb.surgery@gmail.com published on the same listing. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere Bridge Surgery'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mb.surgery@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Local Doctors Mangere Bridge', 'Medical centre / GP clinic', NULL, NULL, '41 Coronation Road, Mangere Bridge, Auckland', NULL, NULL, 'mangerebridge.reception@tamakihealth.co.nz', '(09) 254 4290', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice (Local Doctors/Tamaki Health network) in its own Coronation Road premises (separate practice from Mangere Bridge Surgery above). Reception email mangerebridge.reception@tamakihealth.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Local Doctors Mangere Bridge'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangerebridge.reception@tamakihealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Doctors Drury', 'Medical centre / GP clinic', NULL, NULL, '175 Great South Road, Drury, Auckland', NULL, NULL, 'admin@drury.thedoctors.co.nz', '(09) 294 3005', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice (The Doctors network) in its own Great South Road premises, serving Drury/Karaka/Papakura. Email admin@drury.thedoctors.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. Listings disagree on the manager''s name (Prateek vs Kelsi), so left out rather than guess. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Doctors Drury'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@drury.thedoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Albany Dental Surgery', 'Dental clinic', NULL, NULL, '13/231 Dairy Flat Highway, Albany, Auckland', NULL, NULL, 'albanydentalsurgery@gmail.com', '(09) 415 9377', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Dairy Flat Highway premises. Email albanydentalsurgery@gmail.com published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Albany Dental Surgery'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('albanydentalsurgery@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Sunnynook Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '119 Sunnynook Road, Forrest Hill, Auckland', 'Marinda', 'Practice Manager', 'admin@sunnynookmedical.co.nz', '(09) 410 5331', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Sunnynook Road premises. Practice Manager Marinda named (first name only) on the practice''s Healthpoint listing (healthpoint.co.nz); admin@sunnynookmedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Sunnynook Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@sunnynookmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Birkenhead Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '4 Rawene Road, Birkenhead, Auckland', 'Jolene', 'Practice Manager', 'admin@birkenheadmedical.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Rawene Road premises. Practice Manager Jolene named (first name only) on the practice''s Healthpoint listing (healthpoint.co.nz); admin@birkenheadmedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Birkenhead Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@birkenheadmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Devonport Health', 'Medical centre / GP clinic', NULL, NULL, '20 Victoria Road, Devonport, Auckland', 'Tanziha Matin', 'Practice Manager', 'reception@devonporthealth.co.nz', '(09) 972 2699', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Victoria Road premises. Practice Manager Tanziha Matin named on the practice''s Healthpoint listing (healthpoint.co.nz); reception@devonporthealth.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Devonport Health'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@devonporthealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Devonport Family Medicine', 'Medical centre / GP clinic', NULL, NULL, '2 Fleet Street, Devonport, Auckland', 'Reece Danby', 'Business Manager', 'receptionist@dfmdoctors.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Fleet Street premises (separate practice from Devonport Health above). Business Manager Reece Danby named on the practice''s Healthpoint listing (healthpoint.co.nz); receptionist@dfmdoctors.co.nz matches own domain dfmdoctors.co.nz. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Devonport Family Medicine'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('receptionist@dfmdoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Takapuna Health', 'Medical centre / GP clinic', NULL, NULL, '3 Anzac Street, Takapuna, Auckland', NULL, NULL, 'admin@takapunahealth.co.nz', '(09) 486 5482', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice (formerly Dodson Medical) in its own Anzac Street premises. Email admin@takapunahealth.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Takapuna Health'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@takapunahealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Swanson Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '714 Swanson Road, Swanson, Auckland', 'Jayson Gentiles', 'Practice Manager', 'info@swansonmedical.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Swanson Road premises. Practice Manager Jayson Gentiles named on the practice''s more recent Healthpoint listing (healthpoint.co.nz; an older listing instead named Dianne Gamble, so worth confirming on first contact); info@swansonmedical.co.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Swanson Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@swansonmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mt Eden Medical Centre', 'Medical centre / GP clinic', 'https://www.memc.co.nz', NULL, '457 Mount Eden Road, Mount Eden, Auckland 1024', 'Angela Patel', 'Practice Manager', 'memc@memc.co.nz', '(09) 638 8718', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Mount Eden Road premises. Practice Manager Angela Patel named on the practice''s Healthpoint listing (healthpoint.co.nz) as the contact for service feedback; memc@memc.co.nz matches own domain memc.co.nz. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mt Eden Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('memc@memc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Freemans Bay Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '100 Wellington Street, Freemans Bay, Auckland', 'Naomi Lorimer', 'Practice Manager', 'practicemanager@fbmc.co.nz', '(09) 378 6653', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Wellington Street premises. Practice Manager Naomi Lorimer named with a direct email, practicemanager@fbmc.co.nz, on the practice''s own GP recruitment listing (via healthpoint.co.nz / RNZCGP jobs board, posted by the practice). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Freemans Bay Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('practicemanager@fbmc.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Health Within Osteopathy', 'Osteopathy clinic', NULL, NULL, '141 Garnet Road, Westmere, Auckland 1022', NULL, NULL, 'info@healthwithin.co.nz', '(09) 376 1980', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Osteopathy clinic with several practitioners, in its own Garnet Road premises. Email info@healthwithin.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Health Within Osteopathy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@healthwithin.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'pilatesFIT Boutique', 'Pilates studio', 'https://www.pilatesfitboutique.co.nz', NULL, '1/3 Boundary Road, Hobsonville Point, Auckland', 'Chelsea Kawana', 'Owner', 'chelsea@pilatesfitboutique.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Reformer/mat Pilates studio in its own Hobsonville Point premises. Owner Chelsea Kawana named in a Hobsonville Point community news profile (hobsonvillepoint.co.nz, "Focusing on fitness"), with her direct email chelsea@pilatesfitboutique.co.nz given in the same article. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('pilatesFIT Boutique'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('chelsea@pilatesfitboutique.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Indie Yoga (Hobsonville Point)', 'Yoga studio', NULL, NULL, 'Hobsonville Point Road, Hobsonville, Auckland', 'Kyleigh Burniston', 'Owner', 'kyleighb.yoga@gmail.com', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Yoga studio in its own Hobsonville Point premises, next to pilatesFIT Boutique. Owner Kyleigh Burniston (20 years teaching yoga) named with her direct email in a Hobsonville Point community news profile (hobsonvillepoint.co.nz, "Focusing on fitness"). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Indie Yoga (Hobsonville Point)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('kyleighb.yoga@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Studio Pilates Hobsonville', 'Pilates studio', 'https://www.studiopilates.com', NULL, 'Hobson Building, Level 1, 98 Hobsonville Road, Hobsonville, Auckland', NULL, NULL, 'hobsonville@studiopilates.com', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Reformer Pilates studio (Studio Pilates International franchise, locally run) in its own Hobsonville Road premises. Studio email hobsonville@studiopilates.com published via the franchise''s own listing. No named local ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Studio Pilates Hobsonville'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hobsonville@studiopilates.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Hobsonville Point Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '3A/160 Hobsonville Point Road, Hobsonville, Auckland 0618', NULL, NULL, 'admin@hvpm.co.nz', '(09) 222 0381', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Hobsonville Point Road premises (separate practice from Hobsonville Health/Hobsonville Family Doctors above). Email admin@hvpm.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Hobsonville Point Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@hvpm.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Franklin Vets Karaka', 'Veterinary clinic', 'https://www.franklinvets.co.nz', NULL, 'Unit A1, 75 Hingaia Road, Karaka, Auckland 2113', NULL, NULL, 'karaka@fvs.co.nz', '(09) 298 7043', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic, part of the Franklin Vets group (separate location from the Pukekohe and Papakura clinics already listed above), in its own Karaka premises. Clinic email karaka@fvs.co.nz published on the group''s own contact page (shop.franklinvets.co.nz/contact/karaka). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Franklin Vets Karaka'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('karaka@fvs.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Point Chevalier Medical & Surgical Centre', 'Medical centre / GP clinic', 'https://ptchevmedical.co.nz', NULL, '1181 Great North Road, Point Chevalier, Auckland 1022', NULL, NULL, 'admin@ptchevmedical.co.nz', '(09) 846 6244', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Great North Road premises. Email admin@ptchevmedical.co.nz matches own domain ptchevmedical.co.nz (confirmed via a community directory listing, not visible directly on Healthpoint). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Point Chevalier Medical & Surgical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@ptchevmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Parnell Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '82B Gladstone Road, Parnell, Auckland', NULL, NULL, 'parnellmed@gmail.com', '(09) 377 4427', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Gladstone Road premises. Email parnellmed@gmail.com published on the practice''s own Healthpoint listing (healthpoint.co.nz), reviewed/edited by the practice itself. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Parnell Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('parnellmed@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Balmoral Doctors', 'Medical centre / GP clinic', NULL, NULL, '502 Dominion Road, Mt Eden, Auckland', 'Brenda Brabant', 'Practice Manager', 'reception@balmoraldoctors.co.nz', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Dominion Road premises (separate practice from Mt Eden Medical Centre above). Practice Manager Brenda Brabant (with Cathy Milligan as Assistant Manager) named on the practice''s Healthpoint listing (healthpoint.co.nz); reception@balmoraldoctors.co.nz matches own domain on a separate Healthpoint listing for the same practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Balmoral Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@balmoraldoctors.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Three Kings Dental Centre', 'Dental clinic', NULL, NULL, 'Three Kings Plaza, 536 Mount Albert Road, Three Kings, Auckland', NULL, NULL, 'info@3kingsdental.co.nz', '(09) 625 7175', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own premises at Three Kings Plaza. Email info@3kingsdental.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Three Kings Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@3kingsdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Avondale Health Centre', 'Medical centre / GP clinic', NULL, NULL, '39 Layard Street, Avondale, Auckland 1026', 'Dianne', 'Practice Manager', 'admin@avondalehealth.co.nz', '(09) 828 2066', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Layard Street premises. Practice Manager Dianne named (first name only) on the practice''s Healthpoint listing (healthpoint.co.nz); admin@avondalehealth.co.nz matches own domain, found on a separate listing for the same practice. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Avondale Health Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@avondalehealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'La-Z-Boy Albany', 'Furniture showroom', NULL, NULL, '260 Oteha Valley Road, Albany, Auckland', NULL, NULL, 'albany@lzbgallery.co.nz', '(09) 443 1849', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Furniture/recliner showroom with a street-front display floor needing presentation-level cleaning, in its own Oteha Valley Road premises. Store email albany@lzbgallery.co.nz published on the brand''s own store listing. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('La-Z-Boy Albany'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('albany@lzbgallery.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Living Culture (Wairau Valley)', 'Outdoor furniture showroom', 'https://livingculture.co.nz', NULL, '139 Wairau Road, Wairau Valley, Auckland 0627', NULL, NULL, 'hello@livingculture.co.nz', '0800 298 398', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Outdoor furniture showroom with a large display floor (open 7 days) in its own Wairau Road premises. Email hello@livingculture.co.nz published on the brand''s own site livingculture.co.nz. No named manager found publicly. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Living Culture (Wairau Valley)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@livingculture.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Northpoint Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '40 Library Lane, Albany, Auckland', NULL, NULL, 'reception@northpointmedical.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Library Lane premises. Email reception@northpointmedical.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Northpoint Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@northpointmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Bakerfield Medical and Urgent Care', 'Medical centre / GP / urgent care clinic', NULL, NULL, '16A Bakerfield Place, Manukau, Auckland 2104', 'Mohini Gounder', 'Practice Manager', 'manager@bakerfield.co.nz', '(09) 263 7770', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP/urgent care practice in its own Bakerfield Place premises (8am-8pm urgent care plus weekday GP appointments). Practice Manager Mohini Gounder named with a direct email, manager@bakerfield.co.nz, on the practice''s own GP recruitment listing (via rnzcgp.org.nz jobs board, posted by the practice). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Bakerfield Medical and Urgent Care'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('manager@bakerfield.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Southpoint Family Doctors', 'Medical centre / GP clinic', NULL, NULL, '4/9 Sharkey Street, Manukau City Centre, Auckland 2104', 'Dr Fiona Shepherd', 'GP / HR Contact', 'hr@spfd.co.nz', '0800 242 200', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Teaching GP practice in its own Sharkey Street premises. Dr Fiona Shepherd, a GP there per the practice''s Healthpoint listing (healthpoint.co.nz), is also named as the HR contact with email hr@spfd.co.nz on the practice''s own recruitment listing (via rnzcgp.org.nz jobs board). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Southpoint Family Doctors'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hr@spfd.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Waiuku Health Centre', 'Medical centre / GP clinic', NULL, NULL, '30/26-30 Constable Road, Waiuku, Auckland 2123', 'Rosalie Dunstan', 'HR Contact', 'humanresources@waiukumedical.co.nz', '(09) 235 9102', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in a purpose-built medical centre on Constable Road (shared building with a pharmacy, dentist, lab and counsellor). HR contact Rosalie Dunstan named with a direct email, humanresources@waiukumedical.co.nz, on the practice''s own recruitment listing (via rnzcgp.org.nz jobs board, posted by the practice). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Waiuku Health Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('humanresources@waiukumedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Return to Form Physiotherapy', 'Physiotherapy / wellness clinic', 'https://returntoform.com', NULL, '179A Ponsonby Road, Ponsonby, Auckland (also has a Wynyard Quarter site)', NULL, NULL, 'info@returntoform.com', '(09) 551 4460', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Physiotherapy/wellness clinic with multiple practitioners, in its own Ponsonby premises (a third-party listing gives a different nearby Ponsonby Road address, so confirm on first contact). Email info@returntoform.com matches the clinic''s own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Return to Form Physiotherapy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@returntoform.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kohimarama Veterinary Clinic', 'Veterinary clinic', 'https://kohivet.co.nz', NULL, '325 Kohimarama Road, St Heliers, Auckland 1071', NULL, NULL, 'russellt@kohivet.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Privately owned small-animal vet clinic in its own Kohimarama Road premises. Email russellt@kohivet.co.nz published on the clinic''s own NZVA recruitment listing, matching own domain kohivet.co.nz. A "Russell" is the named contact but role/title isn''t stated, so left out rather than guess. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kohimarama Veterinary Clinic'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('russellt@kohivet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Great South Vets', 'Veterinary clinic', NULL, NULL, '785 Great South Road, Papatoetoe, Auckland 2025', NULL, NULL, 'info@greatsouthvets.co.nz', '(09) 278 4165', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small-animal vet clinic in its own Great South Road premises. Email info@greatsouthvets.co.nz published on the clinic''s own NZVA recruitment listing, matching own domain greatsouthvets.co.nz. A "William" is the named contact but role/title isn''t stated, so left out rather than guess. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Great South Vets'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@greatsouthvets.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mairangi Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '2 Penzance Road, Mairangi Bay, Auckland', 'Rebecca Turner', 'Practice Manager', 'enquiries@mmc.gen.nz', '(09) 479 5027', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] GP practice in its own Penzance Road premises. Practice Manager Rebecca Turner (with Kayla Woodhouse as Assistant Practice Manager) named on the practice''s Healthpoint listing (healthpoint.co.nz); enquiries@mmc.gen.nz matches own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mairangi Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('enquiries@mmc.gen.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Beachhaven Birkdale Medical', 'Medical centre / GP clinic', NULL, NULL, '330 Rangatira Road, Beach Haven, Auckland (address conflicts with another listing''s 366 Rangatira Road - confirm on first contact)', NULL, NULL, 'reception@bbmedical.co.nz', '(09) 483 6422', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Family GP practice (2 GPs + support staff) in its own Rangatira Road premises. Email reception@bbmedical.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Beachhaven Birkdale Medical'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@bbmedical.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Green Bay Medical Centre', 'Medical centre / GP clinic', NULL, NULL, '70 Godley Road, Green Bay, Auckland 0604', NULL, NULL, 'greenbay@xtra.co.nz', '(09) 827 4075', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice in its own Godley Road premises. Email greenbay@xtra.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz) for business matters. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Green Bay Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('greenbay@xtra.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Browns Bay Medical Centre', 'Medical centre / GP clinic', NULL, '10 GPs, 6 nurses, 6 receptionists', '13-15 Bute Road, Browns Bay, Auckland 0630', NULL, NULL, 'admin@brownsbaymed.co.nz', '(09) 479 5422', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Sizeable GP practice (10 GPs, 6 nurses, 6 receptionists per own listing) in its own Bute Road premises. Admin email admin@brownsbaymed.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz); confirm it is still current on first contact as a different cached version of the same listing leaves the field blank. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Browns Bay Medical Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@brownsbaymed.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Teresa Burns Hearing', 'Audiology / hearing clinic', NULL, NULL, '25 Apollo Drive, Rosedale, Auckland 0632', 'Teresa Burns', 'Owner', 'teresa@teresaburnshearing.co.nz', '(09) 475 9849', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independently NZ-owned-and-operated audiology/hearing clinic in its own Apollo Drive premises, not aligned to a hearing-aid manufacturer. Owner Teresa Burns named with her direct email, teresa@teresaburnshearing.co.nz, in the clinic''s own recruitment flyer (audiology.org.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Teresa Burns Hearing'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('teresa@teresaburnshearing.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pakuranga Dental', 'Dental clinic', NULL, NULL, '175 Pakuranga Road, Pakuranga, Auckland 2010', NULL, NULL, 'reception@pakurangadental.co.nz', '(09) 576 6720', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Pakuranga Road premises. Email reception@pakurangadental.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pakuranga Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@pakurangadental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Manurewa Dental Centre', 'Dental clinic', NULL, NULL, '178 Great South Road, Manurewa, Auckland 2102', NULL, NULL, 'info@manurewadental.co.nz', '(09) 267 3861', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Great South Road premises, offers free adolescent dental care. Email info@manurewadental.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Manurewa Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@manurewadental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Three Kings Dental Centre', 'Dental clinic', NULL, NULL, 'Three Kings Plaza, 536 Mount Albert Road, Three Kings, Auckland 1042', NULL, NULL, 'info@3kingsdental.co.nz', '(09) 625 7175', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own premises at Three Kings Plaza. Email info@3kingsdental.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Three Kings Dental Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@3kingsdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Clendon Physiotherapy', 'Physiotherapy clinic', 'https://clendonphysio.co.nz', NULL, 'Clendon Park, Manurewa, Auckland 2103 (exact street number unconfirmed)', 'Alison', NULL, 'alison@clendonphysio.co.nz', '(09) 266 3166', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent physiotherapy clinic serving the Clendon Park/Manurewa area. Named personal email alison@clendonphysio.co.nz published in a Breast Cancer Foundation physiotherapy-provider directory listing (breastcancerfoundation.org.nz); role not confirmed so left blank, but a first-name@owndomain address on a sole/small practice is a strong proxy for the principal. Street number could not be independently confirmed - verify premises before contacting. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Clendon Physiotherapy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('alison@clendonphysio.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Li''l Champs Papatoetoe', 'Early childhood education / childcare centre', NULL, NULL, '431 Great South Road, Papatoetoe, Auckland 2025', NULL, NULL, 'papatoetoe@lilchamps.co.nz', '(09) 277 2556', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independently governed ECE centre (per ERO report, owned by a managing director/operations manager, not a large chain) in its own Great South Road premises. Branch email papatoetoe@lilchamps.co.nz published on the Montessori NZ directory listing (montessori.org.nz) and matches the centre''s own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Li''l Champs Papatoetoe'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('papatoetoe@lilchamps.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Little Kiwis Early Learning Centre', 'Early childhood education / childcare centre', NULL, NULL, '20 Norman Spencer Drive, Papatoetoe, Auckland 2025', NULL, NULL, 'littlekiwis@gmail.com', '(09) 278 9833', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own Norman Spencer Drive premises. Email littlekiwis@gmail.com published as the centre''s own contact on its littlies.nz service listing. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Little Kiwis Early Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('littlekiwis@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Penney Patel Law', 'Law firm', NULL, '2+ partners (small firm)', '1 Kimberley Road, Epsom, Auckland 1023', 'Anand Kumar Singh', 'Partner', 'anand@penneypatel.co.nz', '09 623 0402', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Small Epsom law firm in its own office. Partner Anand Kumar Singh named (and confirmed as a partner on the NZ Law Society register, lawsociety.org.nz) with his direct email anand@penneypatel.co.nz on the NZ Society of Notaries business listing (notarypublic.org.nz). Second partner Denise Mary Wilson also on the Law Society register. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Penney Patel Law'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('anand@penneypatel.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Auckland Optometrists', 'Optometry / eye care clinic', 'https://www.aucklandoptometrists.co.nz', NULL, '109A Trafalgar Street, Onehunga, Auckland 1061', NULL, NULL, 'info@aucklandoptometrists.com', '(09) 636 3639', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent optometry practice (not part of a national optical chain) in its own Trafalgar Street premises. Email info@aucklandoptometrists.com published on the practice''s Healthpoint listing (healthpoint.co.nz). Two optometrists (Janice Teo, Shahin Khayami) named on staff but ownership not confirmed, so left blank. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Auckland Optometrists'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@aucklandoptometrists.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Maximus Fitness (Panmure)', 'Gym / fitness studio', NULL, NULL, '22-50 Dunkirk Road, Panmure, Auckland 1006', 'Mani', 'Owner', 'maximusfitness1412@gmail.com', NULL, 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independent owner-operated gym (est. 2012, two Auckland sites) in its own Dunkirk Road premises. Owner Mani named with his own contact on a PlaySport business listing (playsport.com); email maximusfitness1412@gmail.com published as the gym''s own contact on the same listing. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Maximus Fitness (Panmure)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('maximusfitness1412@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Panmure Bridge Childcare', 'Early childhood education / childcare centre', 'https://panmurebridgechildcare.co.nz', NULL, '43 Caen Road, Panmure, Auckland 1072', 'Candy Wu', NULL, 'candyw@panmurebridgechildcare.co.nz', '(09) 527 1165', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own Caen Road premises. Named contact Candy Wu and her direct email candyw@panmurebridgechildcare.co.nz published on a teacher-vacancy notice on the Ministry of Education gazette (gazette.education.govt.nz); her title wasn''t stated there so left blank, but she is clearly the centre''s point of contact. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Panmure Bridge Childcare'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('candyw@panmurebridgechildcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Home Vision Blinds', 'Blinds / window furnishings showroom', NULL, 'Small family business', '1 Analie Place, East Tamaki, Auckland 2013', 'Chris', NULL, 'chris@homevisionblinds.co.nz', '021 771 778', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Small family-run blinds/window-furnishings showroom in its own East Tamaki premises. Named personal email chris@homevisionblinds.co.nz published on the business''s own listing; role not confirmed so left blank, but a first-name@owndomain address on a small family business is a strong proxy for the owner. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Home Vision Blinds'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('chris@homevisionblinds.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Sunnynook Dentist', 'Dental clinic', NULL, NULL, '117 Sunnynook Road, Forrest Hill, Auckland 0620', NULL, NULL, 'sunnynook.dentist@gmail.com', '(09) 449 2006', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] General dental clinic in its own Sunnynook Road premises. Email sunnynook.dentist@gmail.com published on the clinic''s Healthpoint listing (healthpoint.co.nz). No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Sunnynook Dentist'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('sunnynook.dentist@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Mangere East Physiotherapy', 'Physiotherapy clinic', 'https://mangerephysio.co.nz', NULL, '6 Savill Drive, Mangere East, Auckland 2024', NULL, NULL, 'mangerephysio.reception@gmail.com', '(09) 276 7632', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent physiotherapy clinic serving Mangere, Otahuhu and Papatoetoe, in its own Savill Drive premises. Email mangerephysio.reception@gmail.com published on the clinic''s own listing. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Mangere East Physiotherapy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('mangerephysio.reception@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'MediTrain', 'First aid / workplace training centre', NULL, NULL, '21 Church Street, Onehunga, Auckland 1061', 'Adrian Brown', NULL, 'adrian@meditrain.co.nz', '09 636 1377', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Long-established (NZQA/WorkSafe/MoE-approved) first aid and workplace training provider in its own Church Street premises. Named contact Adrian Brown and his direct email adrian@meditrain.co.nz published in the company''s own training proposal PDF (hosted on playcentre.org.nz); his title wasn''t stated there so left blank. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('MediTrain'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('adrian@meditrain.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Te Atatu Health', 'Medical centre / GP clinic', NULL, NULL, '544B Te Atatu Road, Te Atatu, Auckland 0610', NULL, NULL, 'admin@tahealth.co.nz', '(09) 900 1111', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] GP practice (run by doctors Marcus Bishop, Matthew Woollett and Rachel Mattock) in its own Te Atatu Road premises. Admin email admin@tahealth.co.nz published on the practice''s Healthpoint listing (healthpoint.co.nz); confirm still current on first contact as a newer cached version of the listing leaves the field blank. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Te Atatu Health'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@tahealth.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Blooming Buds Early Learning Centre', 'Early childhood education / childcare centre', NULL, NULL, '373 West Coast Road, Glen Eden, Auckland 0602', NULL, 'Centre Manager', 'manager@bloomingbuds.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own West Coast Road premises. Role-addressed email manager@bloomingbuds.co.nz published on the centre''s own recruitment listing (gazette.education.govt.nz) for its Centre Manager role; no personal name given. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Blooming Buds Early Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('manager@bloomingbuds.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ready Press Print', 'Printing / commercial print shop', 'https://www.readypress.co.nz', 'Family-owned, 39+ years trading', '2 Westech Place, Glen Eden, Auckland 0602', NULL, NULL, 'sales@readypress.co.nz', '09 818 1615', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Family-owned-and-operated commercial print shop (offset/digital/bindery, 39+ years in West Auckland per PrintNZ member listing, printnz.co.nz) in its own Westech Place premises. Sales email sales@readypress.co.nz published on the same listing and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ready Press Print'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('sales@readypress.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Karaka Learning Centre', 'Early childhood education / childcare centre', NULL, NULL, '113 Harbourside Drive, Karaka, Auckland 2113', NULL, NULL, 'info@karakalearningcentre.co.nz', NULL, 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent ECE centre in its own Harbourside Drive premises. Email info@karakalearningcentre.co.nz published on the centre''s own teacher-vacancy listing (littlies.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Karaka Learning Centre'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@karakalearningcentre.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'M.E. Holistic Care', 'Acupuncture / Chinese medicine clinic', NULL, NULL, '139 Remuera Road, Remuera, Auckland 1050', NULL, NULL, 'info@meholisticcare.co.nz', '(09) 974 3651', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Independent acupuncture/Chinese medicine clinic in its own Remuera Road premises. Email info@meholisticcare.co.nz published on the clinic''s Healthpoint listing (healthpoint.co.nz) and matches own domain. No named ops contact found. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('M.E. Holistic Care'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@meholisticcare.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Active Osteopathy', 'Osteopathy clinic', 'https://www.activeosteo.co.nz', NULL, '57 Seddon Street, Pukekohe, Auckland 2120', 'Cushla Geck', 'Principal Osteopath', 'info@activeosteo.co.nz', '(09) 238 8522', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ACC-registered osteopathy clinic in its own Seddon Street premises. Principal Osteopath Cushla Geck named on the clinic''s Healthpoint listing (healthpoint.co.nz) and on the UK General Osteopathic Council''s register-search practice page (osteopathy.org.uk); email info@activeosteo.co.nz matches the clinic''s own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Active Osteopathy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@activeosteo.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Kiwi College of New Zealand', 'Private training establishment (NZQA PTE)', 'https://website.kiwi.ac.nz', NULL, 'Level 1, 15 Mercari Way, Albany, Auckland 0632', 'Francesca Wang', 'Administration Manager', 'francesca@kiwi.ac.nz', '+64 9 930 0789', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] NZQA-registered private training establishment in its own Albany campus premises. Administration Manager Francesca Wang named with her direct email francesca@kiwi.ac.nz on the college''s own team page (website.kiwi.ac.nz/our-team). A second named contact, Jo Zhang (Admin and Student Support Manager, jo@kiwi.ac.nz), is also on that page. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Kiwi College of New Zealand'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('francesca@kiwi.ac.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Academy EX', 'Tech training academy / bootcamp', 'https://academyex.com', NULL, 'Grafton, Auckland', NULL, NULL, 'hello@academyex.com', '+64 (09) 964 4444', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Tech-skills training academy with an Auckland campus (Grafton). General email hello@academyex.com published on the academy''s own site (academyex.com/contact). No named ops contact found; exact street address not independently confirmed - verify premises before contacting. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Academy EX'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@academyex.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Advantage Chiropractic (Glenfield)', 'Chiropractic clinic', NULL, NULL, '3/1 View Road, Glenfield, Auckland 0627', 'Dr Leah Mendes', 'Principal Chiropractor & Director', 'glenfield@advantagechiropractic.co.nz', '021 0818 2838', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] ACC-registered chiropractic clinic (two North Shore sites: Glenfield and Rosedale) in its own View Road premises. Principal Chiropractor & Director Dr Leah Mendes named on the clinic''s Healthpoint listing (healthpoint.co.nz); branch email glenfield@advantagechiropractic.co.nz matches the clinic''s own domain. Co-director Tomas Mendes also named. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Advantage Chiropractic (Glenfield)'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('glenfield@advantagechiropractic.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Glow Dental', 'Dental clinic', 'https://glowdental.co.nz', NULL, 'Shop 11/101 Lunn Avenue, Mt Wellington, Auckland 1072', 'Dr Linda Hwang', 'Principal Dentist', 'info@glowdental.co.nz', '(09) 600 2774', 'sunday-burst-2026-10-11', 'A', 'new', '[Sunday burst 2026-10-11] Independent dental clinic in its own Lunn Avenue premises. Principal Dentist Dr Linda Hwang named on the clinic''s Healthpoint listing (healthpoint.co.nz); email info@glowdental.co.nz matches the clinic''s own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Glow Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@glowdental.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Maxcare Dental', 'Dental clinic', NULL, NULL, 'Great South Road, Otahuhu, Auckland 1062', 'Dr Tazeen Khan', NULL, 'info@maxcaredental.co.nz', '09-600 2266', 'sunday-burst-2026-10-11', 'B', 'new', '[Sunday burst 2026-10-11] Dental clinic (sites in Otahuhu and Massey) in its own Great South Road premises. Dentist Dr Tazeen Khan named on the clinic''s own listing; her ownership of the practice isn''t confirmed so role left blank. Email info@maxcaredental.co.nz matches the clinic''s own domain. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Maxcare Dental'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@maxcaredental.co.nz'));
