-- Sano Sunday lead burst 2026-11-22 - review, then run in the Supabase SQL editor
-- Each insert skips existing companies/emails.
--
-- SUMMARY (running totals, updated after each batch)
-- Total: 37 | A: 31 | B: 6
-- Category mix vs target (Offices ~40%, Education ~25%, Hospitality ~20%, Clinic/Other cap ~15%):
--   Offices: 14 (38%) | Education: 9 (24%) | Hospitality: 13 (35%) | Clinic/Other: 1 (3%)
-- Hospitality is still well over its ~20% target; Offices/Education are both close to their targets
--   now - next batches should keep avoiding hospitality and push Education and fresh Office niches
--   (insurance/finance brokers, IT, marketing/design, recruitment - not law/accounting/engineering).
--   A standout Clinic/Other lead is still welcome; the 15% cap has plenty of headroom (checked this
--   batch - boutique physio/dental searches turned up only multi-site chains like Habit Health or
--   institutional-feeling groups like Dental Boutique's NZ/Australia arm, nothing standout found).
--   B-grade is at 6 of 37 (16%), still under the ~20% cap - prefer A-grade candidates from here.
-- Batch 6 (this batch): added Vivid Icon (East Tamaki branding/graphic design studio, single-site,
--   25+ years production experience - Creative Director Shabbir Mohammed named via the studio's own
--   homepage/schema.org data, sales@vividicon.co.nz confirmed in the same page's footer, MX ok). Tried,
--   no result: independent insurance brokers in Albany/Henderson/Manukau/East Tamaki (only large
--   network brokers or one too-large existing player turned up), Positive People HR consultancy
--   (named MD but own site gives only a PO Box + explicitly works "onsite or offsite" - excluded as
--   home/virtual-office), Spice HR (director named via directory only, no own-site contact), Knowhow
--   Limited, Scribble Me This (appears to be a solo freelancer, not a staffed office), quantity
--   surveyors/valuers (Veron, Costwise, Cuesko, White Associates, Bayleys valuations - no named-contact
--   + own-site-email combo found).
-- Batch 5: added OneHQ (Newmarket managed-IT-services firm, single Auckland site plus a
--   Christchurch office - Managing Director Mark Anyon named on the company's own Management Team
--   page, enquiries@onehq.nz on its own contact page, MX ok). Two B-grade education/dance leads added
--   cautiously (only to round out Education's target share, not pursued further given the weak named-
--   contact signal): Howick Dance Studio (sharon.barber@howickdance.co.nz via mailto on its own site,
--   but no role/title stated anywhere so Sharon Barber's position is unconfirmed) and Expressions Dance
--   (Pakuranga, Te Tuhi arts centre - hello@expressionsdance.co.nz on its own site, no named contact at
--   all). Tried, no result this batch: Prestige Insurance Brokers (named director + own-site email but
--   no verifiable physical address found anywhere - excluded per the home-based/virtual-office rule),
--   Wolfe Interior Design (named founder but site describes a Northland service area, Auckland premises
--   unconfirmed), Certus Insurance Brokers (dead site), Need Recruitment (director named via HR NZ
--   directory only, no company domain), Harper Digital (403), several boutique marketing/design
--   agencies (Kyttn, Human Digital, Hello Saturday, Blur the Lines, Ritual Interiors - no named contact
--   + email combo). Floristry/makeup/security-trades training providers (Education) all hit dead ends
--   too (no own-site named contact + email combo; Chevtrain director only sourced via a third-party
--   data aggregator, excluded).
-- Batch 4: added Techtorium NZIIT (Newmarket IT training PTE - Managing Director Patrick
--   Dowling named on the college's own About Us page, learn@techtorium.ac.nz on the same site, MX ok).
--   Hospitality: Browne Street (Avondale gastropub - co-owner Sam Fraser named in a 2018 Metro feature,
--   hello@brownestreet.co.nz via mailto on its own live site, MX ok; same 2-owner group also runs
--   Blockhouse Bay's The Block, below the 3-site chain threshold - press is from 2018 so ownership
--   should be reconfirmed before contact). Two B-grade hospitality venues added: Vin Alto (Clevedon
--   winery/function venue - enquiries@vinalto.co.nz on its own site, MX ok, but no named contact on
--   the current site - an old tour flyer names Enzo & Margaret Bettio but that's unconfirmed/outdated)
--   and Space on Crummer (Grey Lynn-area industrial events venue - hello@spaceoncrummer.co.nz via
--   mailto on its own site, MX ok, no named contact found).
-- Batch 3: added Imperial College of New Zealand (CBD language/business PTE - Principal
--   Kanwalpreet Kaur named on the college's own about-us page, info@imperial.ac.nz on the same page,
--   MX ok). Hospitality: Water Boy (St Heliers) and The Corner (Remuera) - both owned by the same
--   2-venue partnership (Patrick Kean & Victoria Blake, named in Denizen/NZ Herald coverage), under
--   the 3-site chain threshold, each with its own mailto: contact email confirmed on its own homepage
--   (thirsty@waterboystheliers.co.nz, enquiries@thecornerremuera.co.nz, both MX ok) - also Ragtag
--   (Westmere, founder/chef Dan Freeman named in Broadsheet/Metro, hello@ragtagnz.com on own site,
--   MX ok). Grepping mailto: links out of downloaded homepages worked better than WebSearch alone for
--   finding hospitality emails this batch.
-- Education PTE/language-school sweep this batch (via a parallel research pass) hit mostly chains or
--   no-named-contact dead ends: New Zealand Skills and Education College (3 Auckland campuses - New
--   Lynn/Manukau/CBD - chain), ICL Graduate Business School and Auckland English Academy (both part of
--   the larger ICL Education Group - too institutional/chain-like), Elite International School of
--   Beauty and Spa Therapies (Yoobee Colleges-owned - chain), Let's Go music school (named directors +
--   an NZQA-listed email, but delivers out of shared community venues with no confirmed own premises,
--   and its own domain didn't resolve - too uncertain), International Travel College of NZ (ITC - its
--   own site publishes college@itc.co.nz, MX ok, but no named decision-maker found and its own contact
--   page is titled "Contact Us | Campuses" (plural) - too much chain risk to use even as B), Carter
--   Chan Dance Performance Centre (named director, no email found), Fun Beats/ABC Studios/Franks Music/
--   Mt Eden Ballet/Studio One Performing Arts (directory presence only, no own site + email), Aspiring
--   Language Institute (already a duplicate in docs/db/2026-08-02-sales-leads-seed-9.sql - not
--   re-added), Languages International (part of the larger Study Group chain - skipped).
-- Hospitality dead ends this batch: Kazuya (Eden Terrace - own site live but no email found anywhere
--   on it), Augustus Bistro (augustusbistro.co.nz now appears to be an unrelated repurposed content
--   site, not the restaurant), Postal Service/Kokako (Grey Lynn - no email found), Phil's Kitchen
--   (Kingsland - domain now redirects to an unrelated casino-affiliate site), Puglia (domain didn't
--   resolve), Bonita/Bianca (Ellerslie - appear closed or Instagram-only), Nomad (Pt Chevalier - no
--   current owner/chef confirmed), Barclay Suites (CBD boutique hotel - email only found via a
--   third-party SuperGold page, not the hotel's own site - stayed below the bar), Viaduct Events
--   Centre (belongs to Auckland Conventions, not independent), Markovina Estate / Gracehill wineries
--   (no email on current live site), Mister Fox (Grey Lynn - no contact found at all), The Blue Breeze
--   Inn / Chop Chop / Woodpecker Hill (Mark Wallbank & Che Barrington's restaurant group - treated
--   cautiously as a 3-venue group and skipped, even though each trades under a different name), Fantail
--   and Turtle (Takapuna - whanau-owned function venue, hello@fantailandturtle.co.nz confirmed on its
--   own site but no named contact - a B-grade candidate held back this batch to keep the B share low).
--   ARC Vets (2-site independent emergency/referral vet hospital, Freemans Bay + Albany - under the
--   chain threshold) was checked for the Clinic/Other cap but no named owner/director or email was
--   found on its own site (team/about pages blocked or 404).
-- Next batch: Education is now the hardest category to fill - Auckland's independent PTEs keep turning
--   out to be chain-owned (ICL Education Group, Yoobee, Study Group) or lack a named-contact + own-site
--   email combo. Try smaller single-site NZQA-registered trade/vocational providers not yet checked
--   (e.g. specific hairdressing/beauty academies individually rather than as a group), or independent/
--   private schools (not large multi-campus colleges). Hospitality is still productive - keep using the
--   mailto: grep approach on real (search-verified, not guessed) domains in fresh suburbs. Clinic/Other
--   stays at the 15% cap with just 1 lead by design - only add another if truly standout.
-- Eliette's Music Academy skipped (3+ Auckland sites - Albany/Botany/Takapuna - treated as a chain).
-- ECE hunt this batch (Remuera, Sandringham, Mt Roskill, Herne Bay, Parnell, One Tree Hill) hit
--   mostly chains (Kindercare, BestStart, Bear Park x11 sites, KiNZ, Kidicorp/First Steps, Bright
--   Beginnings x3+ sites) or unconfirmed roles (Village Square Trust, Parnell - CEO named in an
--   undated Rotary talk, not confirmed current) - none added. Tasman International Academies
--   (Auckland CBD language PTE) had a named NZQA contact but only a third-party-sourced role title
--   and a 2025 NZQA report showing enrolment down to 6 international students - skipped as too
--   uncertain a going concern.
-- Checked and already duplicates this batch (not re-added): Soljans Estate Winery and Kumeu River
--   Wines (both already in docs/db/2026-07-06-sales-leads-seed-5.sql).
-- Restaurant hunt in Devonport/Birkenhead/Mt Eden/Epsom this batch found named owners (Duo Eatery -
--   Sarah & Jordan MacDonald; Stone Oven - Brendan & Dani; Forest - Plabita Florence; One Tree Grill -
--   Guy Malyon, possibly outdated) but no email on any of their own sites, so none added.
-- Mix is close to target overall (Offices a bit high, Clinic/Other untouched by design).
-- Next batch: keep Education and Hospitality going in fresh suburbs; a standout A clinic/vet/gym
--   lead would be fine to round out the Clinic/Other 15% cap, but don't go looking for volume there
--   (it was over-mined on 2026-10-11). Undertow Media (Grey Lynn PR agency) was checked and found
--   to already be a duplicate in docs/db/2026-08-02-sales-leads-seed-7.sql - not re-added.
-- Sectors/suburbs covered: architecture practices (Ponsonby x2, Devonport, Freemans Bay, Herne Bay),
--   mortgage/finance brokers (Ponsonby), fine-dining restaurant (Herne Bay), cocktail bar (Ponsonby),
--   culinary/hospitality/wine PTE (Auckland CBD/Viaduct), hairdressing/beauty NZQA academy (Newton),
--   boutique law firms (Parnell, Newmarket, Ellerslie) sourced via the NZ Law Society official
--   register (name/role/email combo) cross-checked against each firm's own domain for the email.
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
--   tutor networks, not fixed premises, or franchise-style - skipped). Also attempted this batch:
--   accounting/mortgage firms (Guardian Smith, adviceHQ, Takapuna - named director/founder found
--   (Mikey Smith, David Green) but no email on own site - Wix/no-text contact forms), law firms
--   outside this batch's picks (Mt Eden Legal - director named, Mt Eden domain didn't resolve;
--   Henderson Reeves - director named with email but only a PO Box address found for the Auckland
--   branch, so skipped pending a confirmed street address). Restaurants in Mission Bay/Kingsland/
--   Browns Bay/Takapuna mostly had only a first name or no contact at all for the owner (Franc's
--   appears to have closed; Takapuna Beach Cafe is HIP Group-owned, a 8+ venue Auckland group -
--   skipped as a chain); Markovina Estate (Kumeu wedding venue) had a named owner from an old
--   cached page but no email on the current live site, so skipped as unconfirmed.
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

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'New Zealand School of Food and Wine', 'Culinary / hospitality / wine training establishment (NZQA PTE)', 'https://www.foodandwine.co.nz', NULL, 'Level 3, 104 Customs Street West, Viaduct, Auckland 1010', 'Celia Hay', 'Founder', 'admin@foodandwine.co.nz', '09 377 7961', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered private training establishment - full-time cookery/bakery, hospitality and wine courses plus short courses, real teaching-kitchen premises in the Viaduct). Founder Celia Hay named on the school''s own About Us page (foodandwine.co.nz/about-us); she is also the school''s registered contact on the official NZQA provider register (nzqa.govt.nz, providerId 988555001), which publishes the admin@foodandwine.co.nz email. MX ok (foodandwine.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('New Zealand School of Food and Wine'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('admin@foodandwine.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Servilles Academy', 'Hairdressing / beauty training academy (NZQA PTE)', 'https://www.servillesacademy.com', NULL, '8 Canada Street, Newton, Auckland 1010', 'Paul Serville', 'Founder & Director', 'academy@servilles.com', '0800 737 845', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered hairdressing/beauty training academy, 30+ years, main campus premises with training salon floor). Founder & Director Paul Serville is well documented in press (NZ Herald "Celebrating 30 years of Servilles"); the academy''s own contact page (servillesacademy.com/contact) publishes the academy@servilles.com enquiries inbox alongside named staff Serena Bond and Lauren Clark. MX ok (servilles.com -> servilles-com.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Servilles Academy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('academy@servilles.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Cowan Law', 'Law firm', 'https://www.cowanlaw.co.nz', NULL, '168 Parnell Road, Parnell, Auckland 1052', 'Douglas Cowan', 'Sole Practitioner / Director', 'doug.cowan@cowanlaw.co.nz', '09 320 4616', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). Boutique litigation/commercial/property law firm with its own Parnell Road premises (confirmed via Yellow directory listing; also employs named staff Jacqueline Li and Oliver Sweeney per the same register). Douglas Cowan named as Sole Practitioner/Director with his direct work email published on the official NZ Law Society register (lawsociety.org.nz/register/douglas-austin-cowan). MX ok (cowanlaw.co.nz -> cowanlaw-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Cowan Law'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('doug.cowan@cowanlaw.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Pacific Legal', 'Law firm (immigration law)', 'https://www.pacificlegal.co.nz', NULL, 'Level 5, 130 Broadway, Newmarket, Auckland 1023', 'Richard Small', 'Director', 'office@pacificlegal.co.nz', '09 666 0440', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). Award-winning specialist immigration law firm in its own Newmarket office. Richard Small named as Director on the official NZ Law Society register (lawsociety.org.nz/register/richard-andrew-charles-small), 20+ years in immigration law per a Newmarket business directory profile. office@pacificlegal.co.nz confirmed published on the firm''s own homepage (pacificlegal.co.nz). MX ok (pacificlegal.co.nz -> pacificlegal-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Pacific Legal'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@pacificlegal.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'KempsWeir', 'Law firm (property law)', 'https://www.kempsweir.co.nz', NULL, 'Ground Floor, Building 1, Central Park, 660-670 Great South Road, Ellerslie, Auckland 1051', 'Joshua Garnett', 'Director', 'joshua@kempsweir.co.nz', '09 525 7711', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). Established 1996 property law firm (Alliott Global Alliance NZ representative firm) in its own Ellerslie office premises. Joshua Garnett named as Director on the official NZ Law Society register (lawsociety.org.nz/register/joshua-kirk-garnett), which also publishes his direct work email. MX ok (kempsweir.co.nz -> mx1/mx2.nz.smxemail.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('KempsWeir'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('joshua@kempsweir.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'New Zealand Academic and Learning Institute', 'Financial-adviser / business training establishment (NZQA PTE)', 'https://www.nzali.ac.nz', NULL, '12 Huron Street, Takapuna, Auckland 0622', 'Duncan Balmer', 'Founder', 'duncan.balmer@nzali.ac.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered PTE delivering financial-adviser and business training from its own Takapuna premises). Duncan Balmer established the institute per a Good Returns industry profile; he is also the registered contact on the official NZQA provider register (nzqa.govt.nz, providerId 802189001), which publishes his duncan.balmer@nzali.ac.nz email. Street address (12 Huron Street, Takapuna) cross-checked via Study With New Zealand and an earlier NZQA provider report. MX ok (nzali.ac.nz -> nzali-ac-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('New Zealand Academic and Learning Institute'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('duncan.balmer@nzali.ac.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Taylors on Hurstmere', 'Wine bar / restaurant', 'https://www.taylorsonhurstmere.co.nz', NULL, '168 Hurstmere Road, Takapuna, Auckland 0622', 'Steve Taylor', 'Owner', 'taylorsonhurstmere@gmail.com', '09 489 9510', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (wine bar/restaurant, also does private functions, own Takapuna premises on Hurstmere Road). Owner Steve Taylor named in local food press (Channel magazine, "Taylors on Hurstmere") - he bought the business (formerly Pinot Plus) in 2017; the venue trades under his own name. Contact email taylorsonhurstmere@gmail.com confirmed published (obfuscated) on the venue''s own contact page (taylorsonhurstmere.co.nz/contact) - a free-mail address but the one the business itself publishes. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Taylors on Hurstmere'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('taylorsonhurstmere@gmail.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Goode PR', 'PR / marketing agency', 'https://www.goodepr.co.nz', NULL, '1 Northumberland Avenue, Hauraki, Auckland 0622', 'Vikki Lee Goode', 'Founder', 'info@goodepr.co.nz', '09 480 9948', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (PR/marketing agency). Boutique PR agency (founded 1991) in its own North Shore office. Founder Vikki Lee Goode named on the agency''s own About page (goodepr.co.nz/about); info@goodepr.co.nz confirmed published on the same site. MX ok (goodepr.co.nz -> goodepr-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Goode PR'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@goodepr.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Totara Law', 'Law firm', 'https://www.totaralaw.co.nz', NULL, '3 Totara Avenue, New Lynn West, Auckland 0600', 'Michael Richardson', 'Director', 'office@totaralaw.co.nz', '09 827 5907', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). Law firm in its own New Lynn West premises. Michael Richardson named as Director on the official NZ Law Society register (lawsociety.org.nz/register/michael-john-richardson); office@totaralaw.co.nz and other named staff emails (lene@, johng@) confirmed published on the firm''s own site (totaralaw.co.nz). MX ok (totaralaw.co.nz -> totaralaw-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Totara Law'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('office@totaralaw.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Duncan King Law', 'Law firm', 'https://www.dklaw.co.nz', NULL, '40 George Street, Kingsland, Auckland 1024', 'Kristine King', 'Director', 'reception@dklaw.co.nz', '09 623 0515', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). Law firm (trading also as Duncan Horrocks Law/Sandringham Law/Wadsworth Ray, all consolidated at one Kingsland office per the firm''s own site) in its own George Street premises. Kristine Ann King named as Director on the official NZ Law Society register (lawsociety.org.nz/register/kristine-ann-king). reception@dklaw.co.nz confirmed published on the firm''s own contact page (dklaw.co.nz/contact). MX ok (dklaw.co.nz -> dklaw-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Duncan King Law'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@dklaw.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Excel School of Performing Arts', 'Performing arts training establishment (NZQA PTE)', 'https://excel.ac.nz', NULL, '20 Portage Road, New Lynn, Auckland 0600', 'Deborah Knight', 'Principal', 'deborah@excel.ac.nz', '09 827 7327', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered performing arts PTE, est. 1994, own New Lynn studio/theatre premises). Principal Deborah Knight named with her direct email on the school''s own team page (excel-nz.squarespace.com/our-team), alongside Academic Manager John Knight and other named staff. MX ok (excel.ac.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Excel School of Performing Arts'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('deborah@excel.ac.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Structure Design Ltd', 'Structural engineering consultancy', 'https://www.structuredesign.co.nz', '18', 'Suite 207, Geyser Building, 100 Parnell Road, Parnell, Auckland 1052', 'Peter Boardman', 'Founder', 'info@structuredesign.co.nz', '09 302 0205', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (structural engineering, 150+ years combined team experience, commercial/educational/residential work). Founder Peter Boardman and the 18-employee headcount are both published in the firm''s own site structured data (structuredesign.co.nz); info@structuredesign.co.nz confirmed on the same site. MX ok (structuredesign.co.nz -> structuredesign-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Structure Design Ltd'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@structuredesign.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Jim Thompson Law', 'Law firm', 'https://www.jimthompsonlaw.co.nz', NULL, '121A Kitchener Road, Milford, Auckland 0620', 'Nicholas Kearney', 'Director', 'reception@shorelegal.co.nz', '09 486 0745', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (law firm). North Shore law firm (registered as Shore Legal Ltd, trading as Jim Thompson Law) in its own Milford premises. Nicholas Kearney named as Director on the official NZ Law Society register (lawsociety.org.nz/register/nicholas-norman-kearney). reception@shorelegal.co.nz confirmed published on the firm''s own contact page (jimthompsonlaw.co.nz/contact). MX ok (shorelegal.co.nz -> mx-01/02.eml100syd.ctr.sophos.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Jim Thompson Law'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@shorelegal.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Cocoro', 'Japanese fine-dining restaurant', 'https://www.cocoro.co.nz', NULL, '56a Brown Street, Ponsonby, Auckland 1011', 'Makoto Tokuyama', 'Chef-Owner', 'bookmytable@cocoro.co.nz', '09 360 0927', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (award-winning Japanese degustation restaurant, own Ponsonby premises, Metro Top 50 regular). Chef-Owner Makoto Tokuyama (opened 2010) and co-owner Ricky Lee named in NZ Herald/Metro restaurant coverage. bookmytable@cocoro.co.nz confirmed published on the restaurant''s own homepage (cocoro.co.nz). MX ok (cocoro.co.nz -> mail.cocoro.co.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Cocoro'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('bookmytable@cocoro.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Tala', 'Modern Samoan restaurant', 'https://www.tala.co.nz', NULL, '235 Parnell Road, Parnell, Auckland 1052', 'Henry Onesemo', 'Owner', 'hello@tala.co.nz', '021 172 8349', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (award-winning modern Samoan restaurant, Cuisine New Restaurant of the Year, own Parnell premises). Owner Henry Onesemo named in NZ Herald/Cuisine coverage (opened with his wife Debby). hello@tala.co.nz confirmed published on the restaurant''s own site (tala.co.nz/contact). MX ok (tala.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Tala'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@tala.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Modern Music Learning', 'Music tuition school', 'https://www.modernmusiclearning.co.nz', NULL, '2 Sanders Avenue, Takapuna, Auckland 0622', 'Peter Hickman', 'Founder & Director', 'contact@modernmusiclearning.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (music tuition school - piano/guitar/drums/bass/singing, own Takapuna studio premises, 9 named tutors). Founder & Director Peter Hickman named with his role on the school''s own About page (modernmusiclearning.co.nz/about); contact@modernmusiclearning.co.nz confirmed published on the same site. MX ok (modernmusiclearning.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Modern Music Learning'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('contact@modernmusiclearning.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Carbon Method CrossFit', 'Gym / CrossFit studio', 'https://www.carbonmethodcrossfit.co.nz', NULL, '3 George Street, Mount Eden, Auckland 1024', 'Mark Holyoake', 'Founder', 'hello@carbonmethodcrossfit.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Clinic/Other (gym - standout A only, per the cap on this category). CrossFit affiliate gym in its own Mount Eden premises (sweat/equipment-heavy floor, real cleaning need). Founder Mark Holyoake named on the gym''s own About page (carbonmethodcrossfit.co.nz/about); Mellissa Teh is also named as Owner & General Manager on the gym''s official CrossFit.com affiliate listing. hello@carbonmethodcrossfit.co.nz confirmed published on the gym''s own contact page. MX ok (carbonmethodcrossfit.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Carbon Method CrossFit'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@carbonmethodcrossfit.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Hotel DeBrett', 'Boutique hotel', 'https://www.hoteldebrett.com', NULL, '2 High Street, Auckland 1010', 'Jess Singh', 'Hotel Manager', 'reception@hoteldebrett.com', '09 925 9000', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (independent boutique heritage-building hotel, CBD, part of 2-property Habitat Hotels group - under the chain threshold). Hotel Manager Jess Singh named signing the hotel''s own guest-review responses (public replies on review platforms). reception@hoteldebrett.com confirmed published on the hotel''s own homepage (hoteldebrett.com). MX ok (hoteldebrett.com -> hoteldebrett-com.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Hotel DeBrett'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('reception@hoteldebrett.com'));
insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Imperial College of New Zealand', 'English language / business training establishment (NZQA PTE)', 'https://www.imperial.ac.nz', NULL, 'Level 3, 16 Waverley Street, Auckland 1010', 'Kanwalpreet Kaur', 'Principal', 'info@imperial.ac.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA-registered PTE delivering English language and business/employment pathway courses from its own Level 3 Waverley Street premises in the CBD; first registered 2002, MoE provider 7499). Principal Kanwalpreet Kaur named with her role on the college''s own About Us page (imperial.ac.nz/about-us), alongside a message from the college''s Managing Director. info@imperial.ac.nz confirmed published on the same page. MX ok (imperial.ac.nz -> mta.1stdomains.net.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Imperial College of New Zealand'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@imperial.ac.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Water Boy', 'Restaurant / bar (beachfront)', 'https://www.waterboystheliers.co.nz', NULL, '413 Tamaki Drive, St Heliers, Auckland', 'Patrick Kean', 'Partner / Co-owner', 'thirsty@waterboystheliers.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (modern beachfront pub/restaurant, own St Heliers premises on Tamaki Drive). Partners Patrick Kean and Victoria Blake named as the duo behind Water Boy (and Remuera''s The Corner) in The Denizen''s opening feature (thedenizen.co.nz/new-opening/meet-water-boy-the-laid-back-new-beachfront-local-in-the-heart-of-st-heliers). Email thirsty@waterboystheliers.co.nz confirmed via a mailto link on the venue''s own homepage. MX ok (waterboystheliers.co.nz -> smtp.google.com). Only 2 venues under this ownership, below the 3-site chain threshold. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Water Boy'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('thirsty@waterboystheliers.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'The Corner', 'Restaurant / bar', 'https://www.thecornerremuera.co.nz', NULL, '604 Remuera Road, Remuera, Auckland', 'Patrick Kean', 'Partner / Co-owner', 'enquiries@thecornerremuera.co.nz', '09 283 0377', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (established neighbourhood restaurant/pub, own Remuera Road premises). Partners Patrick Kean and Victoria Blake (also of St Heliers'' Water Boy) named in NZ Herald and Denizen coverage as the duo behind The Corner. Email enquiries@thecornerremuera.co.nz confirmed via a mailto link on the restaurant''s own homepage. MX ok (thecornerremuera.co.nz -> Google Workspace aspmx records). Only 2 venues under this ownership, below the 3-site chain threshold. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('The Corner'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('enquiries@thecornerremuera.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Ragtag', 'Restaurant (Mexican-inspired bistro)', 'https://www.ragtagnz.com', NULL, '162 Garnet Road, Westmere, Auckland', 'Dan Freeman', 'Founder / Chef-owner', 'hello@ragtagnz.com', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (buzzy neighbourhood Mexican-inspired restaurant, own Westmere premises, opened Dec 2022). Founder/chef Dan Freeman named in Broadsheet and Metro reviews as having grown the restaurant out of his own taco pop-ups. Email hello@ragtagnz.com confirmed via a mailto link on the restaurant''s own homepage. MX ok (ragtagnz.com -> Google Workspace aspmx records). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Ragtag'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@ragtagnz.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Techtorium NZIIT', 'IT training establishment (NZQA PTE)', 'https://techtorium.ac.nz', NULL, 'Level 3, 182 Broadway, Newmarket, Auckland 1023', 'Patrick Dowling', 'Managing Director', 'learn@techtorium.ac.nz', '0800 529 7523', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Education (NZQA Category 1 private training establishment delivering computer engineering/software development diplomas from its own Newmarket campus, single Auckland site, operating 10+ years). Managing Director Patrick Dowling named and signing a message from the Managing Director on the college''s own About Us page (techtorium.ac.nz/about-us). Email learn@techtorium.ac.nz confirmed published on the same site''s homepage and contact page. MX ok (techtorium.ac.nz -> techtorium-ac-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Techtorium NZIIT'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('learn@techtorium.ac.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Browne Street', 'Restaurant / gastropub', 'https://www.brownestreet.co.nz', NULL, '50 Rosebank Road, Avondale, Auckland', 'Sam Fraser', 'Co-owner', 'hello@brownestreet.co.nz', NULL, 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (gastropub in a converted two-level former transport depot building, own Avondale premises). Co-owner Sam Fraser named in a Metro magazine feature (metromag.co.nz/food/food-cafes/contemporary-new-cafe-browne-st-opens-in-avondale) as one of the business partners behind Browne Street, who also co-own Blockhouse Bay''s The Block cafe - 2 venues total, below the 3-site chain threshold. Email hello@brownestreet.co.nz confirmed via a mailto link on the restaurant''s own live homepage. MX ok (brownestreet.co.nz -> mx1/mx2.sparkbusinessmail.co.nz). Press is from 2018 so ownership should be reconfirmed before contact. No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Browne Street'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@brownestreet.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'OneHQ', 'Managed IT services', 'https://onehq.nz', NULL, '60 Broadway, Newmarket, Auckland 1023', 'Mark Anyon', 'Managing Director', 'enquiries@onehq.nz', '09 222 0888', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (managed IT services firm, founded in Auckland in 2005 as Fission IT, now trading as OneHQ; single Auckland office plus a Christchurch office, under the 3-Auckland-site chain threshold). Mark Anyon named as Managing Director on the company''s own Management Team page (onehq.nz/management-team). enquiries@onehq.nz confirmed published on the company''s own contact page (onehq.nz/contact), alongside helpdesk@onehq.nz. MX ok (onehq.nz -> onehq-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('OneHQ'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('enquiries@onehq.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Vivid Icon', 'Graphic design / branding studio', 'https://vividicon.co.nz', NULL, '9 Laidlaw Way, East Tamaki, Auckland 2013', 'Shabbir Mohammed', 'Creative Director', 'sales@vividicon.co.nz', '021 141 6190', 'sunday-burst-2026-11-22', 'A', 'new', '[Sunday burst 2026-11-22] Category: Offices (independent branding/graphic design studio with its own East Tamaki premises, 25+ years production experience, single site). Shabbir Mohammed named as Creative Director via the studio''s own homepage and schema.org structured data (vividicon.co.nz). Email sales@vividicon.co.nz confirmed in the same page''s organization/LocalBusiness schema and footer. MX ok (vividicon.co.nz -> mta.1stdomains.net.nz). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Vivid Icon'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('sales@vividicon.co.nz'));

-- ===== B-GRADE (no named contact / directory-only email) =====

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Vin Alto', 'Restaurant / winery function venue', 'https://www.vinalto.co.nz', NULL, 'Clevedon, Auckland', NULL, NULL, 'enquiries@vinalto.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (renovated winery/restaurant venue in the Clevedon hills doing weddings, functions and degustation dining, own rural Auckland premises). enquiries@vinalto.co.nz confirmed published on the venue''s own live site. An old tour flyer names Enzo & Margaret Bettio (founders of Del Maine Fine Food) as owners, but that is unconfirmed and the current site names no one, so left without a named contact. MX ok (vinalto.co.nz -> Google Workspace aspmx records). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Vin Alto'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('enquiries@vinalto.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Space on Crummer', 'Function / events venue', 'https://www.spaceoncrummer.co.nz', NULL, '12 Crummer Road, Auckland 1021', NULL, NULL, 'hello@spaceoncrummer.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (independent industrial-style wedding/corporate events venue, own Grey Lynn-area premises). Email hello@spaceoncrummer.co.nz confirmed via a mailto link on the venue''s own homepage. No named owner/manager found on the site. MX ok (spaceoncrummer.co.nz -> Google Workspace aspmx records). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Space on Crummer'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@spaceoncrummer.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Lloyd Hartley Architects', 'Architecture practice', 'http://lloydhartley.com', NULL, '56B Brown Street, Ponsonby, Auckland 1021', NULL, NULL, 'info@lloydhartley.com', '09 281 5505', 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Offices (architecture). Architecture practice in its own Ponsonby premises. Email info@lloydhartley.com published on the practice''s own contact page. Earlier directory results named two directors (Mike Hartley, Ben Lloyd) but the practice''s current own site does not name either, so left out as unconfirmed. MX ok (lloydhartley.com -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Lloyd Hartley Architects'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('info@lloydhartley.com'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Thirty Nine', 'Cocktail bar', 'https://thirtynine.co.nz', NULL, '39 Ponsonby Road, Ponsonby, Auckland 1011', NULL, NULL, 'bookings@thirtynine.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Hospitality (cocktail bar, own Ponsonby Road premises). Email bookings@thirtynine.co.nz published on the bar''s own homepage (thirtynine.co.nz). No named owner/manager found on the bar''s own site (press mentions an owner but not by name tied to this venue specifically). MX ok (thirtynine.co.nz -> aspmx.l.google.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Thirty Nine'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('bookings@thirtynine.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Howick Dance Studio', 'Dance school/studio', 'https://www.howickdance.co.nz', NULL, '3/121 Elliot Street, Howick, Auckland 2014', 'Sharon Barber', NULL, 'sharon.barber@howickdance.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Education (dance school, established 1992 per third-party listings, own Howick studio premises). Sharon Barber is named via a mailto link on the studio''s own homepage, but no role/title is stated anywhere on the site, so her position (owner/director/teacher) is unconfirmed - graded B on that basis even though the email is personal and own-site. MX ok (howickdance.co.nz -> aspmx.l.google.com and others). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Howick Dance Studio'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('sharon.barber@howickdance.co.nz'));

insert into public.sales_leads (company, industry, website, staff_size, address, contact_name, contact_role, email, phone, source, quality_rank, status, notes)
select 'Expressions Dance', 'Dance school/studio', 'https://www.expressionsdance.co.nz', NULL, 'Te Tuhi, 21 William Roberts Road, Pakuranga, Auckland', NULL, NULL, 'hello@expressionsdance.co.nz', NULL, 'sunday-burst-2026-11-22', 'B', 'new', '[Sunday burst 2026-11-22] Category: Education (dance school operating out of the Te Tuhi arts centre in Pakuranga). The current live site names no owner/director. hello@expressionsdance.co.nz confirmed on the school''s own current homepage. MX ok (expressionsdance.co.nz -> expressionsdance-co-nz.mail.protection.outlook.com). No renewal hint found.'
where not exists (select 1 from public.sales_leads where lower(company) = lower('Expressions Dance'))
  and not exists (select 1 from public.sales_leads where lower(email) = lower('hello@expressionsdance.co.nz'));

