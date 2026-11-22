-- Sano Sunday lead burst 2026-11-22 - review, then run in the Supabase SQL editor
-- Each insert skips existing companies/emails.
--
-- SUMMARY (running totals, updated after each batch)
-- Total: 9 | A: 7 | B: 2
-- Category mix vs target (Offices ~40%, Education ~25%, Hospitality ~20%, Clinic/Other cap ~15%):
--   Offices: 4 (44%) | Education: 2 (22%) | Hospitality: 3 (33%) | Clinic/Other: 0 (0%)
-- Next batch should steer toward Offices (accountants, law firms, recruitment, insurance/property
--   management, IT/marketing - all attempted so far but hit rate was low; try fresh suburbs) and
--   keep building Education (PTEs, language schools, private schools - avoid duplicating the
--   2026-10-11 run's ECE/childcare suburbs).
-- Sectors/suburbs covered: architecture practices (Ponsonby x2, Devonport, Freemans Bay, Herne Bay),
--   mortgage/finance brokers (Ponsonby), fine-dining restaurant (Herne Bay), cocktail bar (Ponsonby),
--   culinary/hospitality/wine PTE (Auckland CBD/Viaduct), hairdressing/beauty NZQA academy (Newton).
-- Attempted, no result (directory-only or no email found, skipped rather than guessed): accountants
--   (Parnell, Newmarket, Takapuna - NextGen Accountants/McIsaacs/EqualBiz all lacked a named contact +
--   own-site email together; SBA Small Business Accounting appears to be a multi-branch franchise
--   (Newmarket/Takapuna+ - skipped as a chain)), law firms (Parnell - no office manager named/emailed
--   on firm's own site; NZ Law Society register gives director names but the register itself doesn't
--   publish emails reliably - need firm's own site next time), marketing/creative agencies (Ponsonby -
--   YoungShand/Studio XO/Don Creative have no named contact or email on their own sites), IT support
--   (CodeBlue Mt Eden - named Sales Manager James Muir but no email found), recruitment (Draft NZ/Blue
--   Sky - no verifiable current own-site contact), property management (Smart Rental PM - named
--   Director Judy Raill on own team page but no confirmed physical office address found, so skipped
--   per the home-based/virtual-office rule), ECE (Mt Albert, Grey Lynn, Westmere, Freemans Bay - ERO/
--   Education Counts pages blocked by Cloudflare challenge or named only an ERO reviewer, not the
--   centre's own owner/director), function venues (Ponsonby/Parnell/Pakuranga - Montressor's Function
--   Centre operates out of a rugby club with no independent named contact; other venues had no
--   contact info beyond third-party listing forms), boutique hotels (Amora/Airedale/Heritage/Hotel
--   Ponsonby/Great Ponsonby ArtHotel - no named-owner + own-site email combination found; Hotel
--   Ponsonby owner Hugo Baird named in press but no email located), bars (Est. 1901/Fitzroy
--   Lounge/The Cork - named owners in press but no email found on own sites), flight schools
--   (Auckland Aero Club/North Shore Aero Club/Ardmore Flying School - only generic flightdesk-style
--   inboxes, no named decision-maker found), driving schools (skipped generally - mobile
--   instructor-based, no fixed office premises needing a cleaning contract), cookery/hairdressing
--   academies (New Zealand School of Food and Wine and Servilles Academy succeeded below; others
--   like Elite Beauty/Cut Above Academy had no email), tutoring centres (mostly home-based/online
--   tutor networks, not fixed premises, or franchise-style - skipped).
-- Tool notes: WebFetch failed (403/404/empty) on educationcounts.govt.nz (Cloudflare challenge),
--   donlogic.co.nz (DNS not resolvable in this session), nextgenaccountants about page (ok),
--   mcisaacs.co.nz/contact (404 - try bare domain next time), lawsociety.org.nz register pages
--   (empty content via WebFetch - use WebSearch snippets instead). curl fallback worked well for
--   grepping emails out of Squarespace/JS-heavy pages (e.g. confirmed reservations@parisbutter.co.nz
--   on the restaurant's own homepage this way after WebFetch found no clean text match).

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Jamie & Co', 'Mortgage / finance broker', 'https://www.jamieandco.nz', '7', '62 College Hill, Ponsonby, Auckland 1011', 'Jamie Sanderson', 'Director & Principal Adviser', 'jamie@jamieandco.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (insurance/finance broker). Boutique mortgage/finance advisory with its own Ponsonby premises and a 7-person named team. Director & Principal Adviser Jamie Sanderson named with his own direct email on the firm''s own team page (jamieandco.nz/the-team). MX ok (jamieandco.nz -> jamieandco-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Jamie & Co'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('jamie@jamieandco.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Paris Butter', 'Fine dining restaurant', 'https://www.parisbutter.co.nz', '15-20', '166 Jervois Road, Herne Bay, Auckland 1011', 'Catherine George', 'Co-Owner & Director of Possibilities', 'reservations@parisbutter.co.nz', '09 376 5597', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (fine-dining restaurant, acclaimed/award-nominated - real need for presentation-level cleaning). Co-Owner Catherine George (Co-Owner & Director of Possibilities, overseeing operations/team/guest experience) named on the restaurant''s own team page (parisbutter.co.nz/our-people), alongside co-owner chefs Zennon Wijlens and Nick Honeyman. Reservations inbox reservations@parisbutter.co.nz confirmed published on the restaurant''s own homepage (parisbutter.co.nz). MX ok (parisbutter.co.nz -> mta.1stdomains.net.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Paris Butter'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reservations@parisbutter.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Macfie Architecture', 'Architecture practice', 'https://macfiearchitecture.co.nz', NULL, '3 Devon Lane, Devonport, Auckland 0624', 'Michael Macfie', 'Architectural Director', 'michael@macfiearchitecture.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (architecture). Boutique heritage/residential architecture practice (est. 2006) in its own Devonport premises. Architectural Director Michael Macfie named on the practice''s own contact page (macfiearchitecture.co.nz/contact) with his direct email; Practice Director Rebecca Macfie also named with her own email. MX ok (macfiearchitecture.co.nz -> mail.macfiearchitecture.co.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Macfie Architecture'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('michael@macfiearchitecture.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Fisher Partners', 'Architecture practice', 'https://www.fisherpartners.co.nz', NULL, '24 Centre Street, Freemans Bay, Auckland 1010', 'Michael Fisher', 'Director', 'studio@fisherpartners.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (architecture). Boutique residential/commercial architecture studio in its own Freemans Bay premises. Michael Fisher named as the practice''s Director/Principal on the NZIA practice directory (nzia.co.nz) and ArchiPro; his studio email studio@fisherpartners.co.nz is confirmed published on the practice''s own contact page (fisherpartners.co.nz/contact). MX ok (fisherpartners.co.nz -> fisherpartners-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Fisher Partners'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('studio@fisherpartners.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Four Walls Architecture', 'Architecture practice', 'https://www.fourwallsarchitecture.co.nz', NULL, '122A Jervois Road, Herne Bay, Auckland 1011', 'Amy Hendry', 'Founder', 'amyh@fourwallsarchitecture.co.nz', '09 280 3881', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (architecture). NZIA-registered boutique practice in its own Herne Bay premises. Founder Amy Hendry (with Claire Paterson) named on the practice''s own contact page (fourwallsarchitecture.co.nz/contact) with her direct email, matching the NZIA practice directory listing. MX ok (fourwallsarchitecture.co.nz -> mx1/mx2.mymailsecurity.co.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Four Walls Architecture'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('amyh@fourwallsarchitecture.co.nz'));

-- ===== B-GRADE (no named contact / directory-only email) =====

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Lloyd Hartley Architects', 'Architecture practice', 'http://lloydhartley.com', NULL, '56B Brown Street, Ponsonby, Auckland 1021', NULL, NULL, 'info@lloydhartley.com', '09 281 5505', 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Offices (architecture). Architecture practice in its own Ponsonby premises. Email info@lloydhartley.com published on the practice''s own contact page. Earlier directory results named two directors (Mike Hartley, Ben Lloyd) but the practice''s current own site does not name either, so left out as unconfirmed. MX ok (lloydhartley.com -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Lloyd Hartley Architects'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@lloydhartley.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'New Zealand School of Food and Wine', 'Culinary / hospitality / wine training establishment (NZQA PTE)', 'https://www.foodandwine.co.nz', NULL, 'Level 3, 104 Customs Street West, Viaduct, Auckland 1010', 'Celia Hay', 'Founder', 'admin@foodandwine.co.nz', '09 377 7961', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered private training establishment - full-time cookery/bakery, hospitality and wine courses plus short courses, real teaching-kitchen premises in the Viaduct). Founder Celia Hay named on the school''s own About Us page (foodandwine.co.nz/about-us); she is also the school''s registered contact on the official NZQA provider register (nzqa.govt.nz, providerId 988555001), which publishes the admin@foodandwine.co.nz email. MX ok (foodandwine.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('New Zealand School of Food and Wine'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@foodandwine.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Servilles Academy', 'Hairdressing / beauty training academy (NZQA PTE)', 'https://www.servillesacademy.com', NULL, '8 Canada Street, Newton, Auckland 1010', 'Paul Serville', 'Founder & Director', 'academy@servilles.com', '0800 737 845', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered hairdressing/beauty training academy, 30+ years, main campus premises with training salon floor). Founder & Director Paul Serville is well documented in press (NZ Herald "Celebrating 30 years of Servilles"); the academy''s own contact page (servillesacademy.com/contact) publishes the academy@servilles.com enquiries inbox alongside named staff Serena Bond and Lauren Clark. MX ok (servilles.com -> servilles-com.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Servilles Academy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('academy@servilles.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Thirty Nine', 'Cocktail bar', 'https://thirtynine.co.nz', NULL, '39 Ponsonby Road, Ponsonby, Auckland 1011', NULL, NULL, 'bookings@thirtynine.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (cocktail bar, own Ponsonby Road premises). Email bookings@thirtynine.co.nz published on the bar''s own homepage (thirtynine.co.nz). No named owner/manager found on the bar''s own site (press mentions an owner but not by name tied to this venue specifically). MX ok (thirtynine.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Thirty Nine'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('bookings@thirtynine.co.nz'));
