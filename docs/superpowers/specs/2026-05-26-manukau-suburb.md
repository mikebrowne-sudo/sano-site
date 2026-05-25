# Manukau Suburb Page — Approved Brief

> **Status:** approved brief, ready for drafting. No code changes yet.
> **Date:** 2026-05-26
> **Slug:** `manukau`
> **Route:** `/service-area/manukau`
> **File:** `src/app/(public)/service-area/manukau/page.tsx`
> **Related:** `/service-area`, `/services/regular-cleaning`, `/services/deep-cleaning`, `/services/end-of-tenancy`, `/services/commercial-cleaning`, `/services/post-construction`, `/services/carpet-upholstery`, `/services/window-cleaning`, `/contact`, `/guarantee`, `/faq`
> **Source:** `sano-suburb-page-planner` brief (2026-05-26, chat), with Mike's confirmed inputs substituted in §3 and §5.
> **Builds on:** [Takapuna spec](./2026-05-25-takapuna-suburb.md) (closest structural template — Manukau reuses Takapuna's property+workplace-led grouping order with stronger commercial weighting) + [Mount Eden pilot spec §11](./2026-05-25-mount-eden-suburb-pilot.md) (canonical pattern) + [Suburb rollout plan](./2026-05-25-suburb-rollout-plan.md) Part A3.
> **Pilot status:** this is the **third** Sano suburb page. Mount Eden (residential-led, Central) + Takapuna (mixed, North Shore) shipped 2026-05-25. Manukau (commercial-led, South Auckland) tests whether the pattern flexes for a commercial-foregrounded mix in a third region.
>
> **Scope note:** this page targets **the Manukau suburb** (postcode 2104, slug `manukau` per `src/lib/service-areas.ts:94`), not the wider Manukau region. Keep framing suburb / service-area based; do not try to cover all of South Auckland.

---

## 1. Recommendation + rationale

**`proceed`** — all four Mike confirmations supplied (service mix priority + operational truth + property mix + suburb/region scope clarification). Smaller calls also locked (services grouping lead, hero variant, property-type cards, image strategy).

Mike's confirmed inputs:

- **Service mix priority** — top-4 services: Commercial and office (#1), Post-construction, End of tenancy, Window cleaning. Supporting: Regular, Deep, Carpet. Commercial leads explicitly; Post-construction meaningfully important but not ahead of commercial.
- **Operational truth sentence** — *"Manukau is within Sano's Auckland service area, with the same careful cleaners, clear scopes, and practical quote process available across the wider city."* (Same template as Takapuna.)
- **Property-mix observation** — *"Manukau has a mix of offices, retail spaces, commercial premises, family homes, rentals, and properties being prepared for handover, so cleaning needs can range from workplace presentation and post-construction through to regular upkeep and inspection-ready cleans."*
- **Suburb vs region scope** — **suburb-level only.** Page does not claim coverage of wider Manukau region / South Auckland.

Smaller calls all locked:
- Services grouping leads with **Property and workplace cleaning** (matches Takapuna order)
- Hero is the **mixed-led variant** (not fully commercial-led)
- Four property-type cards: Offices and workplaces → Retail and customer-facing spaces → Family homes and rentals → Post-construction and fit-outs
- Intro image: recommend swap to `/images/sano-commercial-clean-auckland.jpeg` (a commercial-flavoured image already in the repo) — better fit than the Mount Eden / Takapuna residential default. See §5 row 2.
- No nearby-suburb links (first South Auckland page)

This is Stage 1 suburb #3 per the rollout plan. After Manukau ships, the pattern will have been validated across three regions (Central / North Shore / South) and three mix orientations (residential-led / mixed / commercial-led). The rollout plan's pause point after Stage 1 then becomes the right moment to decide whether to proceed mechanically into Stage 2 or revise the pattern.

---

## 2. Pilot page brief

| Field | Value |
|---|---|
| **Name** | Manukau |
| **Slug** | `manukau` (matches `src/lib/service-areas.ts:94`, postcode `2104`, South Auckland, active) |
| **Audience** | Office and commercial-space managers in Manukau, property managers handling rentals + handovers in the area, builders and fit-out clients needing post-construction cleaning, householders. (Audience tilts more commercial than Mount Eden or Takapuna.) |
| **Primary search intent** | "commercial cleaning manukau" / "office cleaning manukau" — workplace / office manager. **Plus** "cleaner manukau" / "end of tenancy cleaning manukau" — householder or property manager. Commercial intent leads here, residential is secondary. |
| **Top-4 services (Mike's confirmed order)** | 1. Commercial and office cleaning → `/services/commercial-cleaning`<br>2. Post-construction cleaning → `/services/post-construction`<br>3. End of tenancy cleaning → `/services/end-of-tenancy`<br>4. Window cleaning → `/services/window-cleaning` |
| **Supporting services (still available, linked in grouped section)** | Regular house cleaning, Deep cleaning, Carpet and upholstery |
| **Primary CTA** | `Get a Free Quote` → `/contact` |
| **Related service links** | All 7 service pages above + `/services` as the catch-all |

---

## 3. Approved hero + meta wording

**Locked by Mike (2026-05-26). Use verbatim during draft.**

### Hero eyebrow

> Manukau cleaning services

(All caps in the rendered hero — handled by `SubpageHero`.)

### Hero title

> Cleaning for offices, homes, and workplaces.

(Sentence case, ends with full stop per `SANO_COPY_RULES.md` H1/H2 rule. **Suburb name absent** — eyebrow carries the suburb signal. Use-case-led, promotes the office + commercial mix to the headline. Same shape as Takapuna's title with "apartments" → "offices" to reflect Manukau's commercial weighting.)

### Hero subtitle

> From offices and family homes to retail spaces, rentals, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean.

(Suburb name absent. Mike's locked mixed-led variant — leads with offices, includes family homes second, then retail / rentals / handovers. Covers all five audience types without overclaiming commercial dominance.)

### Meta title

> Manukau Cleaning Services | Sano

(Matches the existing `<Service> Services | Sano` pattern on sibling service pages.)

### Meta description

**Mike's recommended verbatim** (~156 chars — at the edge of the 155-char SEO cap):

> Cleaning services for Manukau offices, homes, rentals, and commercial spaces. Sano helps match the right scope to workplaces, handovers, and regular upkeep.

**Trimmed alternative under 155 chars** (recommended for actual `<meta name="description">` use if Mike prefers safer truncation behaviour; preserves intent):

> Cleaning for Manukau offices, homes, rentals, and commercial spaces. Sano matches the scope to workplaces, handovers, and regular upkeep.

(~138 chars. Mike to confirm which version lands in the page during draft. Mount Eden meta sat at 154 chars; Takapuna at 140 chars; Manukau's verbatim recommended is at the edge.)

---

## 4. Recommended route + file location

- **URL:** `/service-area/manukau`
- **File:** `src/app/(public)/service-area/manukau/page.tsx`
- **Route group:** `(public)` — matches Mount Eden + Takapuna pattern.

Slug already exists in `src/lib/service-areas.ts:94`. **Do not modify** `service-areas.ts`. Static-file-per-suburb (no dynamic `[slug]` route per rollout plan Part E Trigger B).

---

## 5. Recommended page sections

Final scroll order. Mirrors Takapuna v1 (per Takapuna spec §5) with Manukau-specific substitutions in hero strings, intro body, property-type cards, schema description, and the intro image. Component composition is identical to Mount Eden v5 + Takapuna.

| # | Section | Component | What ships |
|---|---|---|---|
| 1 | Hero | `SubpageHero` from `@/components/SubpageHero` | §3 wording verbatim. Primary CTA `Get a Free Quote` → `/contact`. `DEFAULT_TRUST_ITEMS`. **Hero image — Mike's call during draft:** default carryforward `/images/heroes/regular-house-cleaning-hero.jpg` (consistent with Mount Eden + Takapuna) OR swap to `/images/heroes/commercial-office-cleaning-hero.jpg` (exists in repo, stronger visual match for commercial-led Manukau). Recommended: swap to the commercial-office hero so the page's visual identity matches its lead. Confirm during draft. |
| 2 | Intro / property context | **Inline `<section>`** (NOT shared `ServiceInformation`) — matches Mount Eden v5 / Takapuna pattern | One image only. **Image: `/images/sano-commercial-clean-auckland.jpeg`** (commercial-flavoured Auckland shot already in repo — better fit for commercial-led Manukau than the Mount Eden / Takapuna residential default). Mike's locked direction was "swap to a commercial-neutral image if one exists" — this one does, so the swap is recommended. Sized + treated identically to siblings: `lg:grid-cols-[1.2fr_0.8fr]`, `aspect-[4/3]`, `rounded-2xl`, `object-cover`, `sizes="(max-width: 1024px) 100vw, 45vw"`. H2 **`Cleaning across Manukau`** with `border-b border-sage-100` underline + `body-text space-y-4` paragraphs. **Two paragraphs (use verbatim):**<br><br>*"Manukau has a mix of offices, retail spaces, commercial premises, family homes, rentals, and properties being prepared for handover, so cleaning needs can range from workplace presentation and post-construction through to regular upkeep and inspection-ready cleans."*<br><br>*"Manukau is within Sano's Auckland service area, with the same careful cleaners, clear scopes, and practical quote process available across the wider city."*<br><br>Alt text suggestion for the image: *"Sano commercial cleaning across Auckland workplaces"* — avoids any Manukau-specific claim while accurately describing the image. |
| 3 | Why Sano | `WhyChooseSection` from `services/_components/` | **Same as Mount Eden v5 / Takapuna — 4 cards verbatim, no Manukau mentions in any card.** Heading: *Why choose Sano*. Subtitle: *What to expect from Sano on any clean, regardless of the property or the reason.* Cards (titles + bodies verbatim from Mount Eden / Takapuna):<br>1. **Clear scopes and simple quotes** — Scope and pricing agreed upfront. Send through the property details and the service you need, and we come back with a clear, practical quote.<br>2. **Careful cleaners** — Methodical work with detail-focused finishing on touchpoints, skirting boards, and the obvious surfaces.<br>3. **Insured and vetted teams** — All cleaners background-checked, trained, and fully insured.<br>4. **Follow-up if needed** — If something is missed, let us know and we will make it right where reasonable. |
| 4 | Services available in Manukau | Custom inline section (mirrors Mount Eden v5 / Takapuna structure with Takapuna-aligned wording from PR #184) | **Property + workplace LEADS the grouping order** per Mike's smaller-call lock (matches Takapuna). Heading: *Services available in Manukau*. Highlight: *Manukau*. Subtitle (Takapuna-aligned, locked across both shipped suburb pages): *"From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope."* Three groups in this order:<br><br>**1. Property and workplace cleaning** — Commercial and office cleaning · Post-construction cleaning<br>**2. Home cleaning** — Regular house cleaning · Deep cleaning · End of tenancy cleaning<br>**3. Specialist cleaning** — Carpet and upholstery cleaning · Window cleaning<br><br>**All seven Sano services linked through.** Identical group order to Takapuna — tests whether the property+workplace lead reads naturally in a third region. |
| 5 | Cleaning needs by property type | `WhatWeCoverSection` from `services/_components/` | Four cards customised for Manukau's commercial-heavy mix. Eyebrow: `HOW WE APPROACH IT`. Heading: *Cleaning needs vary by property type*. Highlight: `property type`. Subtitle: *A short note on what we typically focus on for each kind of property.* Cards (Mike's locked mix):<br><br>1. **Offices and workplaces** (`Briefcase` icon) — Regular presentation, shared amenities, touchpoints, and cleaning that works around the business. *(Promoted to card #1; was Takapuna's card 4. Commercial-led Manukau warrants top placement.)*<br>2. **Retail and customer-facing spaces** (`Store` icon — verify exists in lucide-react during draft) — Front-of-house finish, frequent touchpoints, and timing that fits around customers and trading hours. *(NEW vs Mount Eden + Takapuna — Manukau's retail centre justifies a dedicated card.)*<br>3. **Family homes and rentals** (`Home` icon) — Regular upkeep, inspection-ready handovers, and finishing details that help maintain a household standard. *(Combined "Family homes" + "Rentals" into one card to free space for Retail and Post-construction.)*<br>4. **Post-construction and fit-outs** (`Hammer` icon — verify exists in lucide-react during draft) — Builders' dust, fine surfaces, glass, and the final detail pass before a space opens or hands back. *(NEW vs Mount Eden + Takapuna — Manukau's development activity justifies a dedicated card.)*<br><br>Renders 4 cards on `lg:grid-cols-3` (3+1 orphan at lg — accepted from Mount Eden / Takapuna pilot; no change). |
| 6 | Booking steps | `BookingStepsSection` from `services/_components/` | Heading: *Book your clean in 3 simple steps* (no suburb). Three generic steps (same as Mount Eden v5 / Takapuna):<br>1. **Send through details** — Share the property details and the service you need.<br>2. **We arrange a time** — A clear quote and a time that fits your schedule.<br>3. **Clean done properly** — The team arrives prepared and works through the agreed scope. |
| 7 | Schema (invisible) | Inline `<script type="application/ld+json">` | `Service` `@type`, `LocalBusiness` provider, `areaServed: { '@type': 'City', name: 'Auckland' }`. **No suburb-level `Place` schema** per pilot guard. Suggested description: *"Cleaning services across Manukau: commercial, post-construction, end of tenancy, window, regular, deep, and carpet."* (Lists all 7, leads with commercial + post-construction per the lead-service order.) |
| 8 | CtaBanner | `CtaBanner` from `@/components/CtaBanner` | Headline: *Ready to book your clean?* (no suburb). Subtext: *Send through the property details and the service you need. We will come back with a clear, practical quote.* Same as Mount Eden v5 / Takapuna — suburb-light. |
| 9 | Closing trust strip | Inline `<section>` on cream | Three text links: `Check another suburb → /service-area`, `Our guarantee → /guarantee`, `FAQ → /faq`. **`SuburbChecker` intentionally NOT mounted** per pilot decision. Identical to Mount Eden v5 / Takapuna closing strip. |

---

## 6. Content angle

Mount Eden tested residential-first. Takapuna tested mixed / property+workplace-led with commercial as co-equal top-3. Manukau tests **commercial-as-lead-service**: commercial and office cleaning is the #1 service, post-construction is meaningfully important, and residential is genuinely secondary. The page's framing reflects this without overclaiming.

The angle is honest and supply-side: Manukau is within Sano's Auckland service area, with the same standards as everywhere else. The page exists to (a) confirm coverage, (b) route office / commercial / property-manager / householder visitors to the right service quickly, and (c) get them to a quote. No claims of Manukau-specific Sano history, no demographic framing, no "South Auckland specialist" / "CBD" / airport-proximity positioning.

The genuinely Manukau-specific contributions are:
- **Property-mix observation** — Mike-confirmed verbatim, includes "retail spaces" and "commercial premises" alongside the residential mix
- **Top-4 service mix** — Commercial / Post-construction / End of tenancy / Window (vs Mount Eden's Regular / Deep / End of tenancy; vs Takapuna's Regular / End of tenancy / Commercial / Window)
- **Property-type cards** — Offices / Retail / Family homes + rentals / Post-construction (only one card overlaps with Mount Eden or Takapuna; Retail and Post-construction are genuinely new)
- **Image strategy** — recommended swap to commercial-flavoured intro image (and optionally hero image) so visual identity matches the lead

Everything else is the pilot template carried forward exactly, which is the value of running three Stage 1 suburbs in close succession.

After Manukau ships, the rollout plan's Stage 1 pause point is reached. The pattern will have been tested across:
- 3 regions (Central, North Shore, South Auckland)
- 3 lead orientations (Home, Property+Workplace, Commercial-foregrounded)
- 2 image strategies (full residential reuse vs commercial-flavoured swap)
- 1 multi-region cluster pause-and-review opportunity (before mechanically moving to Stage 2 cluster fill)

---

## 7. Internal links

All targets verified to exist in the repo at brief time (carried from Mount Eden + Takapuna's verified set).

### Always-on links (closing trust strip + CTAs)

- (`Get a quote`, `/contact`) — `src/app/(public)/contact/page.tsx`
- (`Check another suburb`, `/service-area`) — `src/app/(public)/service-area/page.tsx`
- (`Our guarantee`, `/guarantee`) — `src/app/(public)/guarantee/page.tsx`
- (`FAQ`, `/faq`) — `src/app/(public)/faq/page.tsx`

Per Mount Eden lesson: `/guarantee` + `/faq` are in the closing trust strip from v1.

### All seven service links (grouped services section)

- (`Commercial and office cleaning`, `/services/commercial-cleaning`)
- (`Post-construction cleaning`, `/services/post-construction`)
- (`Regular house cleaning`, `/services/regular-cleaning`)
- (`Deep cleaning`, `/services/deep-cleaning`)
- (`End of tenancy cleaning`, `/services/end-of-tenancy`)
- (`Carpet and upholstery cleaning`, `/services/carpet-upholstery`)
- (`Window cleaning`, `/services/window-cleaning`)

### Nearby-suburb links

**Deferred.** Manukau is the **first South Auckland suburb page**. Per Mount Eden pilot spec §11 + rollout plan Part B, retrofit nearby-suburb links only once ≥3 sibling South Auckland pages are live. Candidates for future South Auckland pages: Onehunga, Papakura, Ellerslie, Botany Downs (verify slugs + active status in `SERVICE_AREAS` before queueing per rollout plan Stage 3).

---

## 8. Risks / facts to avoid

### Mount Eden Do-not-claim list (locked, applies to every Sano suburb page)

The page must not assert any of:

- Specific job counts in Manukau
- Recurring client clusters in Manukau
- Sano local history in Manukau ("we've been cleaning Manukau offices since…", etc.)
- Named local landmarks used as proof of service (**no Westfield Manukau, Manukau Civic Centre, Vodafone Events Centre, Rainbow's End, Auckland International Airport, MIT, Hayman Park** references used as social proof)
- Demographics, property values, or housing-stock characterisations
- "Your local Manukau team" / "Manukau's trusted cleaner" / any phrasing implying a Manukau-resident team
- Testimonials or referral sources tied to Manukau
- Anything Mike has not personally verified beyond the operational-truth + property-mix sentences in §3

### Manukau-specific additions (Mike-locked)

- **No demographic / socioeconomic / property-value claims, full stop.** Manukau has known demographic profiles that lazy SEO copy might lean into ("affordable suburbs", "growing area", "diverse community", "family-focused", "working community", "value-conscious"). All explicitly forbidden. The page stays on what Sano OFFERS, not who lives there.
- **No "South Auckland specialist" framing.** Sano is an Auckland-wide service. Claiming regional specialty without operational backing is overclaiming. Same risk applies to any "specialist in [region]" copy.
- **No commercial-experience overclaiming.** The page leads commercial — but commercial cleaning is a service Sano offers, not a claim about Manukau-specific commercial reference work. Phrasing stays supply-side: "offices and workplaces" not "we know Manukau's offices."
- **No "we know the Manukau commercial market" / "we understand local businesses" framing.**
- **No property-management-firm specialisation claims** unless Mike confirms Sano has named property-manager relationships in Manukau.
- **No airport-proximity framing** ("close to Auckland International Airport", "airport-area cleaning", "hospitality-adjacent"). Manukau is genuinely close to AKL Airport but this invites hospitality / hotel positioning Sano can't support.
- **No CBD / "Auckland's second CBD" / "South Auckland CBD" framing.** Manukau has a real commercial centre but the CBD framing pulls toward corporate voice Sano doesn't use.
- **No "regional hub" / "regional specialist" framing.**
- **No claim Sano specialises in retail or hospitality cleaning** unless Mike confirms. Retail is one of the property-type cards (supply-side: how Sano approaches the type), not a specialism claim.

### Schema guard

Keep `areaServed` at `{ '@type': 'City', name: 'Auckland' }` to match every existing service page (`Service` `@type`, `LocalBusiness` provider). Inline `<script type="application/ld+json">` pattern. **Do not** introduce a suburb-level `Place` schema — pilot guard.

### Copy-rule guards (`docs/AI/SANO_COPY_RULES.md`)

- Forbidden phrases: `premium`, `eco-friendly`, `industry-leading`, `streamlined`, `world-class`, `transformative`, `luxury`
- Over-used (flag if >1× or where plainer fits): `bespoke`, `tailored`, `seamless`, `elevated`
- NZ English (`organise`, `colour`, `realise`)
- Phone format `0800 726 686` (only if a phone appears at all — suburb pages don't currently render one)
- No emoji
- **No em dashes in customer-facing copy** — rewrite, or use commas / parentheses / full stops
- Curly quotes in blockquotes, not straight quotes
- Display H1 may end with a full stop per the rule clarification (applied to the §3 hero title)
- JSX comments and internal docs may use em dashes (internal-scope per `SANO_COPY_RULES.md` clarification)

### Metadata guard

Title and description mention Manukau + the services without claiming local-Manukau presence. The §3 wording is already aligned with this rule; do not drift during draft. Meta description length: target ≤155 chars (the trimmed alternative in §3 satisfies this; Mike's verbatim recommended is at the edge).

---

## 9. Pattern guidance — what stays from Takapuna vs Manukau-specific

### Same as Takapuna v1 (durable across all suburbs)

- Route + file pattern (`src/app/(public)/service-area/<slug>/page.tsx`, static file per suburb)
- Component composition (final scroll order)
- Hero use-case-led + suburb-light cadence
- `WhyChooseSection` 4-card structure with identical card titles + bodies
- Custom inline single-image intro section (matches `ServiceInformation` proportions, one image only)
- Intro H2 `Cleaning across <suburb>` pattern (Mount Eden + Takapuna both use this post PR #184)
- Services subtitle Takapuna-aligned ("From regular home cleaning to workplace presentation and specialist surfaces, Sano services are available across the area. Pick a service to read its full scope.") — locked across Mount Eden + Takapuna
- Services grouping LEADS with Property and workplace cleaning (matches Takapuna; tests pattern reuse in a third region)
- `BookingStepsSection` generic 3-step
- `CtaBanner` suburb-light
- Closing trust strip with `/guarantee` + `/faq` + Check another suburb
- Schema convention (Auckland-level City `areaServed`)
- All Do-not-claim hard rails

### New in Manukau vs Takapuna

- **Top-4 service emphasis: Commercial + Post-construction + End-of-tenancy + Window** (Takapuna's was Regular + End-of-tenancy + Commercial + Window). Commercial promoted to #1, Post-construction joins top-4, Regular drops out of top-4.
- **Property-type cards substantially different:** Offices and workplaces (was Takapuna's card 4 — promoted to #1), Retail and customer-facing spaces (NEW), Family homes and rentals (combines Takapuna's cards 2 + 3), Post-construction and fit-outs (NEW). Only 1 of 4 cards (Offices / Workplaces) directly carries from Takapuna.
- **Intro image swapped** to `/images/sano-commercial-clean-auckland.jpeg` (commercial-flavoured) vs Mount Eden + Takapuna's `/images/herne-bay-residential.jpg` default. Better visual match for a commercial-led page.
- **Hero image recommended swap** to `/images/heroes/commercial-office-cleaning-hero.jpg` (Mike's call during draft — both options viable).
- **Schema description leads with commercial + post-construction** vs Takapuna's commercial-then-regular order.
- **Property-mix observation** explicitly mentions "retail spaces" and "properties being prepared for handover" (Takapuna's said "commercial spaces" generically).
- **First South Auckland page** — sets the regional precedent for Onehunga / Papakura / Ellerslie etc.

### Lessons to surface back to the rollout plan after Manukau ships

- Did the property + workplace lead grouping order read naturally in a third region (South Auckland) on top of two regions already (Central, North Shore)? Confirms the lead order is regionally robust.
- Did the commercial intro image read naturally vs the residential default on Mount Eden + Takapuna? Decision point for image strategy going forward.
- Did the 4-card property-types section with the Retail + Post-construction substitutions feel coherent? Lesson for the next commercial-heavy suburb (Albany, Penrose, Wiri candidates).
- Did the meta description need trimming during draft (verbatim version is at the 155-char edge)? Lesson for future suburbs with longer service lists.
- Did the visual-review iteration count converge to ≤1 (Mount Eden took 3 visual-review passes on PR #181 + one more on PR #182; Takapuna landed clean on iteration 1 with one round of copy refinements; expected Manukau ≤1)?
- Did any new Manukau-specific risks surface that should be added to the rollout plan's standard guardrails (e.g. airport-proximity, CBD framing, retail / hospitality specialism)?

After Manukau merges, **the rollout plan's pause point after Stage 1 is reached** — review whether the template held across all three Stage 1 suburbs before queueing Stage 2 cluster fill (Grey Lynn / Kingsland / Ponsonby).

---

## 10. Suggested next prompt — drafting the page

Copy-paste this into a future session when ready to draft Manukau:

```
Draft the Manukau suburb page from the approved spec at:
docs/superpowers/specs/2026-05-26-manukau-suburb.md

Do not abstract anything yet. Build Manukau as a standalone static
page following the Takapuna shipped pattern (Takapuna spec is the
closest structural reference; Mount Eden pilot spec §11 is the
canonical pattern reference).

Decisions locked by the spec — do not change without going back to
Mike:
- Route: /service-area/manukau
- File: src/app/(public)/service-area/manukau/page.tsx
- Route group: (public), matching the existing service-area parent
- Slug already exists in src/lib/service-areas.ts (do not modify)
- Schema: inline application/ld+json, Service @type,
  areaServed = City "Auckland", LocalBusiness provider. NO suburb-
  level Place schema.
- SuburbChecker NOT mounted; closing trust strip has three text
  links: Check another suburb → /service-area, Our guarantee →
  /guarantee, FAQ → /faq.
- No nearby-suburb links (Manukau is the first South Auckland
  page; retrofit only when ≥3 sibling pages exist).
- No reusable suburb-page generator. No dynamic [slug] route.
- Page targets the Manukau suburb, NOT the wider Manukau region.

Hero + meta wording — use VERBATIM from spec §3:
- Hero eyebrow "Manukau cleaning services"
- Hero title "Cleaning for offices, homes, and workplaces."
- Hero subtitle as written in §3
- Meta title "Manukau Cleaning Services | Sano"
- Meta description: use the trimmed under-155-char alternative
  from §3 ("Cleaning for Manukau offices, homes, rentals, and
  commercial spaces. Sano matches the scope to workplaces,
  handovers, and regular upkeep."). If Mike prefers the longer
  verbatim version listed in §3, confirm during draft.

Hero image — Mike's call during draft:
- Default carryforward: /images/heroes/regular-house-cleaning-hero.jpg
  (consistent with Mount Eden + Takapuna)
- RECOMMENDED swap: /images/heroes/commercial-office-cleaning-hero.jpg
  (stronger visual match for commercial-led Manukau; exists in repo)

Intro image — locked by spec §5 row 2:
- /images/sano-commercial-clean-auckland.jpeg (commercial-flavoured,
  exists in repo, better fit than the Mount Eden / Takapuna
  residential default)
- Alt text: "Sano commercial cleaning across Auckland workplaces"
  (avoids Manukau-specific claim while describing the image)

Component composition (spec §5, existing components only — no new
components, no edits to shared components):

1. SubpageHero (approved §3 strings, primary CTA Get a Free Quote →
   /contact, DEFAULT_TRUST_ITEMS, imageSrc per hero-image call above)

2. Custom inline single-image intro section per Mount Eden v5 /
   Takapuna pattern (NOT shared ServiceInformation):
   - Outer: <section className="section-padding bg-white py-10 lg:py-12">
   - Container: container-max
   - Grid: grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start
   - Left col: h2 "Cleaning across Manukau" with border-b border-sage-100 pb-4, body-text space-y-4, two paragraphs verbatim from spec §5 row 2
   - Right col: relative aspect-[4/3] overflow-hidden rounded-2xl
     wrapping next/image with src "/images/sano-commercial-clean-auckland.jpeg",
     alt per spec §5 row 2, fill, object-cover,
     sizes="(max-width: 1024px) 100vw, 45vw"

3. WhyChooseSection — 4 cards verbatim from spec §5 row 3.

4. Custom inline grouped services section on cream
   (bg-[#faf9f6]):
   - Eyebrow "WHAT WE COVER"
   - Heading "Services available in Manukau" with "Manukau"
     highlighted in sage-500
   - Subtitle per spec §5 row 4 (Takapuna-aligned verbatim)
   - **Property and workplace cleaning** LEADS (Commercial and
     office · Post-construction)
   - Home cleaning (Regular · Deep · End of tenancy)
   - Specialist cleaning (Carpet and upholstery · Window cleaning)
   - All seven services linked to their /services/<slug> pages

5. WhatWeCoverSection (four cards in spec §5 row 5 order). Eyebrow
   "HOW WE APPROACH IT". Heading "Cleaning needs vary by property
   type" with "property type" highlighted. Subtitle per spec §5 row 5.
   Icons: Briefcase (Offices), Store (Retail — verify in lucide-react
   during draft), Home (Family homes and rentals), Hammer (Post-
   construction — verify in lucide-react during draft).

6. BookingStepsSection — three generic steps verbatim from spec §5
   row 6.

7. Inline JSON-LD per spec §5 row 7 (Service @type, areaServed City
   Auckland, description suggested in spec).

8. CtaBanner — headline "Ready to book your clean?", subtext per
   spec §5 row 8.

9. Closing trust strip on cream — three text links per spec §5
   row 9.

Internal links (spec §7 — every target verified):
- /contact (hero CTA + CtaBanner)
- /service-area (closing trust strip "Check another suburb")
- /guarantee, /faq (closing trust strip)
- /services/commercial-cleaning, /services/post-construction,
  /services/regular-cleaning, /services/deep-cleaning,
  /services/end-of-tenancy, /services/carpet-upholstery,
  /services/window-cleaning (grouped services section)
- No nearby-suburb links

Do NOT claim (spec §8 — page must contain none of these):
- Specific job counts in Manukau
- Recurring client clusters in Manukau
- Sano local history in Manukau
- Named local landmarks used as proof of service (no Westfield
  Manukau, Manukau Civic Centre, Vodafone Events Centre, Rainbow's
  End, AKL Airport, MIT, Hayman Park)
- Demographics, socioeconomic, or property-value claims
- "Your local Manukau team" / "Manukau's trusted cleaner"
- Testimonials or referral sources tied to Manukau
- "South Auckland specialist" / "regional specialist" framing
- Commercial-experience overclaiming
- "We know the Manukau commercial market" / similar
- Property-management-firm specialisation (unless Mike confirms)
- Airport-proximity / hospitality-adjacent framing
- CBD / "Auckland's second CBD" / "South Auckland CBD" framing
- Retail or hospitality specialism claims

Copy-rule guards (docs/AI/SANO_COPY_RULES.md):
- No premium / eco-friendly / industry-leading / streamlined /
  world-class / transformative / luxury
- Flag bespoke / tailored / seamless / elevated if used >1×
- NZ English
- Phone 0800 726 686 only if a phone appears (suburb pages don't
  currently render one)
- No emoji
- No em dashes in customer-facing copy
- Eyebrow handled by SubpageHero (ALL CAPS, 0.22em)

Post-draft pipeline — run BEFORE opening a PR:
1. sano-copy-reviewer — enforce SANO_COPY_RULES.md + the Do-not-
   claim list (spec §8)
2. sano-thin-content-guard — flag if the page reads as a template
   swap of Mount Eden or Takapuna; confirm the commercial-led
   framing is honest, not just keyword reshuffling
3. sano-visual-reviewer — confirm sage palette / type / spacing
   match siblings; specifically eyeball the commercial intro image
   + (if swapped) commercial hero image
4. sano-scope-guard — confirm no out-of-scope changes (no service-
   areas.ts edits, no shared component edits, no schema-pattern
   divergence)
5. Local gauntlet: npm test (baseline 3 failures expected),
   npx next lint (zero Error lines), npx tsc --noEmit (clean)
6. /sano-ship to push + open PR against main

Hard stops:
- One file added: src/app/(public)/service-area/manukau/page.tsx.
- No new shared components. No edits to src/lib/service-areas.ts,
  no edits to the parent /service-area page, no edits to existing
  service pages, no edits to shared service-page components.
- Do not introduce a suburb-level Place schema.
- Do not mount SuburbChecker on this page.
- Do not add nearby-suburb links until ≥3 South Auckland siblings
  exist.
- Do not skip the reviewer pipeline.
- Do not commit until reviewers + gauntlet are green.
- Visual review iterations expected ≤1 (Mount Eden took 3,
  Takapuna took 1, pattern should now be fully proven).

Lucide icon verification before draft:
- Briefcase — already used on Takapuna; confirmed available
- Store — NEW for suburb pages; verify import works in lucide-react
  before drafting (likely exists as of standard lucide bundle)
- Home — already used; confirmed
- Hammer — NEW for suburb pages; verify import works in lucide-react
  before drafting (likely exists)

If either Store or Hammer is unavailable, fall back to:
- Store → Building2 (matches Takapuna's apartments icon, reasonable
  semantic stretch for retail)
- Hammer → PlusCircle (generic addition icon, suboptimal but works)

Flag the fallback during draft for Mike's awareness.
```

---

## Reference: key files at brief time

- `F:\Sano\01-Site\docs\superpowers\specs\2026-05-25-mount-eden-suburb-pilot.md` — canonical pilot pattern (§11 is the structural reference)
- `F:\Sano\01-Site\docs\superpowers\specs\2026-05-25-takapuna-suburb.md` — closest structural template; property+workplace-led precedent
- `F:\Sano\01-Site\docs\superpowers\specs\2026-05-25-suburb-rollout-plan.md` — Stage 1 sequencing + standard build/review workflow + pause-point guidance
- `F:\Sano\01-Site\.claude\agents\sano-suburb-page-planner.md`
- `F:\Sano\01-Site\docs\AI\SANO_COPY_RULES.md`
- `F:\Sano\01-Site\src\lib\service-areas.ts` (Manukau at line 94)
- `F:\Sano\01-Site\src\app\(public)\service-area\mount-eden\page.tsx` — shipped Mount Eden page (residential-led pattern)
- `F:\Sano\01-Site\src\app\(public)\service-area\takapuna\page.tsx` — shipped Takapuna page (property+workplace-led pattern this brief mirrors)
- `F:\Sano\01-Site\src\components\SubpageHero.tsx`, `src/components/CtaBanner.tsx`
- `F:\Sano\01-Site\src\app\(public)\services\_components\` — `WhyChooseSection`, `WhatWeCoverSection`, `BookingStepsSection` shared components
- `F:\Sano\01-Site\public\images\sano-commercial-clean-auckland.jpeg` — recommended intro image (commercial-flavoured)
- `F:\Sano\01-Site\public\images\heroes\commercial-office-cleaning-hero.jpg` — optional hero swap (commercial-led)
