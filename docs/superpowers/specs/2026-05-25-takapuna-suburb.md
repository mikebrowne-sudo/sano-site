# Takapuna Suburb Page — Approved Brief

> **Status:** approved brief, ready for drafting. No code changes yet.
> **Date:** 2026-05-25
> **Slug:** `takapuna`
> **Route:** `/service-area/takapuna`
> **File:** `src/app/(public)/service-area/takapuna/page.tsx`
> **Related:** `/service-area`, `/services/regular-cleaning`, `/services/deep-cleaning`, `/services/end-of-tenancy`, `/services/commercial-cleaning`, `/services/post-construction`, `/services/carpet-upholstery`, `/services/window-cleaning`, `/contact`, `/guarantee`, `/faq`
> **Source:** `sano-suburb-page-planner` brief (2026-05-25, chat), with Mike's confirmed inputs substituted in §3 and §5.
> **Builds on:** [Mount Eden pilot spec](./2026-05-25-mount-eden-suburb-pilot.md) §11 (canonical reference) + [Suburb rollout plan](./2026-05-25-suburb-rollout-plan.md) Part A2 (Takapuna is Stage 1 suburb #1).
> **Pilot status:** this is the **second** Sano suburb page (Mount Eden = first). Takapuna deliberately tests whether the pilot template flexes for **property + workplace-led mixes** rather than residential-led (Mount Eden's mix). If this ships cleanly, the template is proven across two materially different mixes.

---

## 1. Recommendation + rationale

**`proceed`** — all three Mike confirmations supplied, all four smaller calls supplied. The page can be drafted as soon as Mike runs the §10 next-prompt in a future session.

Mike's confirmed inputs:

- **Service mix priority** — top-4 services (Regular house cleaning, End of tenancy, Commercial and office, Window cleaning); Deep, Carpet, Post-construction stay available as supporting services. Commercial and office explicitly treated as top-3 so the page leads with the property + workplace grouping.
- **Operational truth sentence** — *"Takapuna is within Sano's Auckland service area, with the same careful cleaners, clear scopes, and practical quote process available across the wider city."*
- **Property-mix observation** — *"Takapuna has a mix of apartments, family homes, offices, rentals, and commercial spaces, so cleaning needs can vary from regular upkeep through to handovers, workplace presentation, and specialist surface cleaning."*

Smaller calls all locked too: no "beachfront" in subtitle, reuse `/images/herne-bay-residential.jpg` for intro image, property+workplace cleaning leads the services grouping, "Family homes" as the second property-type card, no nearby-suburb links (first North Shore page).

---

## 2. Pilot page brief

| Field | Value |
|---|---|
| **Name** | Takapuna |
| **Slug** | `takapuna` (matches `src/lib/service-areas.ts:67`, postcode `0622`, North Shore, active) |
| **Audience** | Takapuna householders, tenants/owners/property managers, and office/commercial-space managers |
| **Primary search intent** | "cleaner takapuna" / "house cleaning takapuna" — householder; **plus** "office cleaning takapuna" / "commercial cleaning takapuna" — office/commercial manager. Two co-equal intents for this suburb, not the single-residential intent Mount Eden led with. |
| **Top-4 services (Mike's confirmed order)** | 1. Regular house cleaning → `/services/regular-cleaning`<br>2. End of tenancy cleaning → `/services/end-of-tenancy`<br>3. Commercial and office cleaning → `/services/commercial-cleaning`<br>4. Window cleaning → `/services/window-cleaning` |
| **Supporting services (still available, linked in grouped section)** | Deep cleaning, Carpet and upholstery, Post-construction |
| **Primary CTA** | `Get a Free Quote` → `/contact` |
| **Related service links** | All 7 service pages above + `/services` as the catch-all |

---

## 3. Approved hero + meta wording

**Locked by Mike (2026-05-25). Use verbatim during draft.**

### Hero eyebrow

> Takapuna cleaning services

(All caps in the rendered hero — handled by `SubpageHero`.)

### Hero title

> Cleaning for apartments, homes, and workplaces.

(Sentence case, ends with full stop per `SANO_COPY_RULES.md` H1/H2 rule. **Suburb name absent** — eyebrow carries the suburb signal. Use-case-led, promotes the property-mix angle to the headline.)

### Hero subtitle

> From apartments and family homes to offices and rentals, Sano helps match the cleaning scope to the property and the reason for the clean.

(Suburb name absent. Covers all four likely audience types. **No "beachfront" framing per Mike's smaller-call lock.**)

### Meta title

> Takapuna Cleaning Services | Sano

(Matches the existing `<Service> Services | Sano` pattern on sibling service pages.)

### Meta description

**Mike's recommended verbatim** (≈201 chars — over the typical 155-char SEO cap):

> Cleaning services for Takapuna apartments, homes, offices, and rentals. Sano helps match the right cleaning scope to regular upkeep, handovers, workplace presentation, and specialist surface cleaning.

**Trimmed alternative under 155 chars** (recommended for actual `<meta name="description">` use during draft, preserves intent):

> Cleaning for Takapuna apartments, homes, offices, and rentals: regular upkeep, handovers, workplace presentation, and specialist surfaces.

(140 chars. Mike to confirm which version lands in the page during draft. The Mount Eden pilot meta sat at 154 chars; matching that ceiling here avoids truncation in Google snippets.)

---

## 4. Recommended route + file location

- **URL:** `/service-area/takapuna`
- **File:** `src/app/(public)/service-area/takapuna/page.tsx`
- **Route group:** `(public)` — matches the parent `src/app/(public)/service-area/page.tsx`. Same as Mount Eden.

Slug already exists in `src/lib/service-areas.ts:67`. **Do not modify** `service-areas.ts`. Static-file-per-suburb (no dynamic `[slug]` route per rollout plan Part E Trigger B).

---

## 5. Recommended page sections

Final scroll order. Mirrors Mount Eden v5 (per pilot spec §11) with Takapuna-specific substitutions in the intro body, services-group ORDER, and property-type cards.

| # | Section | Component | What ships |
|---|---|---|---|
| 1 | Hero | `SubpageHero` from `@/components/SubpageHero` | §3 wording verbatim. Primary CTA `Get a Free Quote` → `/contact`. `DEFAULT_TRUST_ITEMS`. Image: `/images/heroes/regular-house-cleaning-hero.jpg` (reused — same as Mount Eden default; swap when Takapuna-specific photography exists). |
| 2 | Intro / property context | **Inline `<section>`** (NOT shared `ServiceInformation`) — matches Mount Eden v5 pattern | One image only (`/images/herne-bay-residential.jpg` per Mike's smaller-call lock), sized + treated to match the standard service-page system: `lg:grid-cols-[1.2fr_0.8fr]`, `aspect-[4/3]`, `rounded-2xl`, `object-cover`, `sizes="(max-width: 1024px) 100vw, 45vw"`. H2 `Service Information` with `border-b border-sage-100` underline + `body-text space-y-4` paragraphs match sibling styling. **Two paragraphs (use verbatim):**<br><br>*"Takapuna has a mix of apartments, family homes, offices, rentals, and commercial spaces, so cleaning needs can vary from regular upkeep through to handovers, workplace presentation, and specialist surface cleaning."*<br><br>*"Takapuna is within Sano's Auckland service area, with the same careful cleaners, clear scopes, and practical quote process available across the wider city."*<br><br>First paragraph = Mike-confirmed property mix. Second paragraph = Mike-confirmed operational truth. The shared `ServiceInformation` component (and the six service pages that use it) stays untouched. |
| 3 | Why Sano | `WhyChooseSection` from `services/_components/` | **Same as Mount Eden v5 — 4 cards, 2x2 grid on desktop, no Takapuna mentions in any card.** Heading: *Why choose Sano*. Subtitle: *What to expect from Sano on any clean, regardless of the property or the reason.* Cards (titles + bodies verbatim from Mount Eden):<br>1. **Clear scopes and simple quotes** — Scope and pricing agreed upfront. Send through the property details and the service you need, and we come back with a clear, practical quote.<br>2. **Careful cleaners** — Methodical work with detail-focused finishing on touchpoints, skirting boards, and the obvious surfaces.<br>3. **Insured and vetted teams** — All cleaners background-checked, trained, and fully insured.<br>4. **Follow-up if needed** — If something is missed, let us know and we will make it right where reasonable. |
| 4 | Services available in Takapuna | Custom inline section (mirrors Mount Eden v5 structure) | **Property + workplace LEADS the grouping order per Mike's smaller-call lock.** Heading: *Services available in Takapuna*. Highlight: *Takapuna*. Subtitle: *From everyday home cleaning to specialist surfaces and commercial spaces, every Sano service is available here. Pick one to read its full scope.* Three groups in this order:<br><br>**1. Property and workplace cleaning** — Commercial and office cleaning · Post-construction cleaning<br>**2. Home cleaning** — Regular house cleaning · Deep cleaning · End of tenancy cleaning<br>**3. Specialist cleaning** — Carpet and upholstery cleaning · Window cleaning<br><br>**All seven Sano services linked through.** Replaces Mount Eden's residential-led order. **This is the suburb where the template-flex test happens** — if the property-workplace lead reads naturally on the deploy preview, the pattern is proven flexible. |
| 5 | Cleaning needs by property type | `WhatWeCoverSection` from `services/_components/` | Four cards customised for Takapuna. Eyebrow: `HOW WE APPROACH IT`. Heading: *Cleaning needs vary by property type*. Highlight: `property type`. Subtitle: *A short note on what we typically focus on for each kind of property.* Cards:<br><br>1. **Apartments and townhouses** (`Building2` icon) — Compact layouts where kitchens, bathrooms, glass, floors, and access timing matter.<br>2. **Family homes** (`Home` icon) — Regular upkeep across multiple living areas, kitchens, bathrooms, and finishing details that hold a household standard. *(Replaces Mount Eden's "Older homes and detailed interiors" per Mike's smaller-call lock — Takapuna's stock isn't predominantly older-character.)*<br>3. **Rentals and handovers** (`KeyRound` icon) — Clear scopes, practical timing, and attention to the areas owners or property managers are likely to check.<br>4. **Offices and small commercial spaces** (`Briefcase` icon) — Regular presentation, shared amenities, touchpoints, and cleaning that works around the business. *(Renamed from Mount Eden's "Workplaces and small commercial spaces" to lean into Takapuna's office mix.)*<br><br>Renders 4 cards on `lg:grid-cols-3` (3+1 orphan at lg — accepted from Mount Eden pilot; future call). |
| 6 | Booking steps | `BookingStepsSection` from `services/_components/` | Heading: *Book your clean in 3 simple steps* (no suburb). Three generic steps (same as Mount Eden v5):<br>1. **Send through details** — Share the property details and the service you need.<br>2. **We arrange a time** — A clear quote and a time that fits your schedule.<br>3. **Clean done properly** — The team arrives prepared and works through the agreed scope. |
| 7 | Schema (invisible) | Inline `<script type="application/ld+json">` | `Service` `@type`, `LocalBusiness` provider, `areaServed: { '@type': 'City', name: 'Auckland' }`. **No suburb-level `Place` schema** per pilot guard. Suggested description: *"Cleaning services across Takapuna: commercial, regular, end of tenancy, window, deep, carpet, and post-construction."* (Lists all 7, leads with commercial per the property+workplace orientation.) |
| 8 | CtaBanner | `CtaBanner` from `@/components/CtaBanner` | Headline: *Ready to book your clean?* (no suburb). Subtext: *Send through the property details and the service you need. We will come back with a clear, practical quote.* Same as Mount Eden v5 — suburb-light. |
| 9 | Closing trust strip | Inline `<section>` on cream | Three text links: `Check another suburb → /service-area`, `Our guarantee → /guarantee`, `FAQ → /faq`. **`SuburbChecker` intentionally NOT mounted** per pilot decision. Identical to Mount Eden v3 closing strip. |

---

## 6. Content angle

Mount Eden tested whether the pilot template works for a **residential-first mix**. Takapuna tests whether it flexes when **commercial and office cleaning is genuinely top-3** — leading the services grouping rather than supporting from below.

The angle is honest and supply-side: Takapuna is within Sano's Auckland service area, with the same standards as everywhere else. The page exists to (a) confirm coverage, (b) route residential or commercial visitors to the right service quickly, and (c) get them to a quote. No claims of local-presence, local history, or Takapuna-specific Sano relationships.

The genuinely Takapuna-specific contribution is the **property mix observation** (Mike-confirmed) and the **service emphasis** (residential + property/workplace, with commercial as a real top-3 not just a back-row mention). Everything else is the pilot template carried forward.

If the deploy preview reads naturally with property + workplace leading, the pattern is proven for at least two distinct suburb profiles (Mount Eden residential-first + Takapuna property+workplace-led) and the rollout plan can mechanically proceed to Manukau (Stage 1 #2). If the lead-order swap reads awkwardly, the pattern needs revisiting before suburb #3.

---

## 7. Internal links

All targets verified to exist in the repo at brief time (carried from Mount Eden's verified set + the four secondary service routes).

### Always-on links (closing trust strip + CTAs)

- (`Get a quote`, `/contact`) — `src/app/(public)/contact/page.tsx`
- (`Check another suburb`, `/service-area`) — `src/app/(public)/service-area/page.tsx`
- (`Our guarantee`, `/guarantee`) — `src/app/(public)/guarantee/page.tsx`
- (`FAQ`, `/faq`) — `src/app/(public)/faq/page.tsx`

Per Mount Eden lesson: `/guarantee` + `/faq` must be in the closing trust strip from v1 — not added later via thin-content-guard fix. Locked here from the start.

### All seven service links (grouped services section)

- (`Commercial and office cleaning`, `/services/commercial-cleaning`)
- (`Post-construction cleaning`, `/services/post-construction`)
- (`Regular house cleaning`, `/services/regular-cleaning`)
- (`Deep cleaning`, `/services/deep-cleaning`)
- (`End of tenancy cleaning`, `/services/end-of-tenancy`)
- (`Carpet and upholstery cleaning`, `/services/carpet-upholstery`)
- (`Window cleaning`, `/services/window-cleaning`)

### Nearby-suburb links

**Deferred.** Takapuna is the **first North Shore suburb page**. Per Mount Eden pilot spec §11 + rollout plan Part B, retrofit nearby-suburb links only once ≥3 sibling North Shore pages are live. Candidates for future North Shore pages: Devonport, Belmont, Birkenhead, etc. (verify slugs + active status in `SERVICE_AREAS` before queueing).

---

## 8. Risks / facts to avoid

### Mount Eden Do-not-claim list (locked, applies to every Sano suburb page)

The page must not assert any of:

- Specific job counts in Takapuna
- Recurring client clusters in Takapuna
- Sano local history in Takapuna ("we've been cleaning Takapuna apartments since…", etc.)
- Named local landmarks used as proof of service (**no Lake Pupuke, no Takapuna Beach, no Hurstmere Rd, no Devonport ferry references** used as social proof)
- Demographics, property values, or housing-stock characterisations (no "Takapuna apartment owners", "beachside community", "established residential streets")
- "Your local Takapuna team" / "Takapuna's trusted cleaner" / any phrasing implying a Takapuna-resident team
- Testimonials or referral sources tied to Takapuna
- Anything Mike has not personally verified beyond the operational-truth + property-mix sentences in §3

### Takapuna-specific additions (Mike-locked)

- **No luxury / premium / "beachfront lifestyle" framing.** Takapuna invites this voice — explicitly forbidden. The hero subtitle drops "beachfront" per Mike's smaller-call lock.
- **No Airbnb / short-stay / holiday-let specialisation claims.** Easy mis-step on a beach suburb — Sano doesn't have a confirmed book of work in this category locally.
- **No "salt-air specialist" / "coastal window expert" / similar invented niche.** Sano windows are Sano windows; no invented Takapuna-specific capability.
- **No CBD-style corporate positioning.** Even though Takapuna has a real commercial centre, the page voice stays practical and human, not corporate.
- **Do not imply Sano specialises in beach or coastal cleaning.** The property-mix observation can mention apartments and commercial spaces; it must not frame Sano as a beach specialist.

### Schema guard

Keep `areaServed` at `{ '@type': 'City', name: 'Auckland' }` to match every existing service page (`Service` `@type`, `LocalBusiness` provider). Inline `<script type="application/ld+json">` pattern. **Do not** introduce a suburb-level `Place` schema — pilot guard.

### Copy-rule guards (`docs/AI/SANO_COPY_RULES.md`)

- Forbidden phrases: `premium`, `eco-friendly`, `industry-leading`, `streamlined`, `world-class`, `transformative`, `luxury`
- Over-used (flag if >1× or where plainer fits): `bespoke`, `tailored`, `seamless`, `elevated`
- NZ English (`organise`, `colour`, `realise`)
- Phone format `0800 726 686` (only if a phone appears at all — not currently in the suburb-page pattern)
- No emoji
- **No em dashes in customer-facing copy** — rewrite, or use commas / parentheses / full stops
- Curly quotes in blockquotes, not straight quotes
- Display H1 may end with a full stop per the rule clarification (already applied to the §3 hero title)
- JSX comments and internal docs may use em dashes (internal-scope per `SANO_COPY_RULES.md` clarification)

### Metadata guard

Title and description mention Takapuna + the services without claiming local-Takapuna presence. The §3 wording is already aligned with this rule; do not drift during draft. Meta description length: target ≤155 chars (the trimmed alternative in §3 satisfies this; Mike's verbatim recommended version exceeds it).

---

## 9. Pattern guidance — what stays from Mount Eden vs what's new in Takapuna

### Same as Mount Eden v5 (durable across all suburbs)

- Route + file pattern (`src/app/(public)/service-area/<slug>/page.tsx`, static file per suburb)
- Component composition (final scroll order)
- Hero use-case-led + suburb-light cadence
- `WhyChooseSection` 4-card structure with identical card titles + bodies
- Custom inline single-image intro section (matches `ServiceInformation` proportions, one image only, image `/images/herne-bay-residential.jpg` as the shared default)
- `BookingStepsSection` generic 3-step
- `CtaBanner` suburb-light
- Closing trust strip with `/guarantee` + `/faq` + Check another suburb (locked from v1 this time per Mount Eden lesson)
- Schema convention (Auckland-level City `areaServed`)
- All Do-not-claim hard rails

### New in Takapuna vs Mount Eden

- **Service grouping LEADS with property + workplace cleaning** (Mount Eden led with Home cleaning). This is the central pattern-flex test of this page.
- **Top-4 service emphasis: Regular + End-of-tenancy + Commercial + Window** (Mount Eden's top-3 was Regular + Deep + End-of-tenancy).
- **Property-type card #2 is "Family homes"** (Mount Eden's was "Older homes and detailed interiors") — fits Takapuna's housing-stock profile per Mike's verification.
- **Property-type card #4 is "Offices and small commercial spaces"** (Mount Eden's was "Workplaces and small commercial spaces") — minor rename, leans into the office mix.
- **Property-mix observation explicitly includes "commercial spaces"** (Mount Eden's said "small commercial properties").
- **Operational truth sentence richer** — Mount Eden's was minimal; Takapuna's spells out the value Sano brings ("careful cleaners, clear scopes, practical quote process").
- **First North Shore page** — sets the regional precedent for Devonport / Belmont / Birkenhead etc.

### Lessons to surface back to the rollout plan after Takapuna ships

- Did the property + workplace lead grouping order read naturally on the deploy preview? If yes, the template is officially flexible across mix orientations.
- Did the meta description need to be trimmed during draft? (Recommended yes; confirm.)
- Did any new Takapuna-specific risks surface during the reviewer pipeline that should be added to the rollout plan's standard guardrails?
- Did the visual-review iteration count converge faster than Mount Eden's (3 visual-review passes on Mount Eden, expected ≤2 here)?

---

## 10. Suggested next prompt — drafting the page

Copy-paste this into a future session when ready to draft Takapuna:

```
Draft the Takapuna suburb page from the approved spec at:
docs/superpowers/specs/2026-05-25-takapuna-suburb.md

Do not abstract anything yet. Build Takapuna as a standalone static
page following the Mount Eden v5 shipped pattern (Mount Eden pilot
spec §11 is the canonical structural reference).

Decisions locked by the spec — do not change without going back to
Mike:
- Route: /service-area/takapuna
- File: src/app/(public)/service-area/takapuna/page.tsx
- Route group: (public), matching the existing service-area parent
- Slug already exists in src/lib/service-areas.ts (do not modify)
- Schema: inline application/ld+json, Service @type,
  areaServed = City "Auckland", LocalBusiness provider. NO suburb-
  level Place schema.
- SuburbChecker NOT mounted; closing trust strip has three text
  links: Check another suburb → /service-area, Our guarantee →
  /guarantee, FAQ → /faq.
- No nearby-suburb links (Takapuna is the first North Shore page;
  retrofit only when ≥3 sibling pages exist).
- No reusable suburb-page generator. No dynamic [slug] route.

Hero + meta wording — use VERBATIM from spec §3:
- Hero eyebrow "Takapuna cleaning services"
- Hero title "Cleaning for apartments, homes, and workplaces."
- Hero subtitle as written in §3 (no "beachfront")
- Meta title "Takapuna Cleaning Services | Sano"
- Meta description: use the trimmed under-155-char alternative
  from §3 ("Cleaning for Takapuna apartments, homes, offices, and
  rentals: regular upkeep, handovers, workplace presentation, and
  specialist surfaces."). If Mike prefers the longer verbatim
  version listed in §3, confirm during the visual review pass.

Component composition (spec §5, existing components only — no new
components, no edits to shared components):

1. SubpageHero (approved §3 strings, primary CTA Get a Free Quote →
   /contact, DEFAULT_TRUST_ITEMS, imageSrc
   "/images/heroes/regular-house-cleaning-hero.jpg")

2. Custom inline single-image intro section per Mount Eden v5
   pattern (NOT shared ServiceInformation):
   - Outer: <section className="section-padding bg-white py-10 lg:py-12">
   - Container: container-max
   - Grid: grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start
   - Left col: h2 "Service Information" with border-b border-sage-100 pb-4, body-text space-y-4, two paragraphs verbatim from spec §5 row 2
   - Right col: relative aspect-[4/3] overflow-hidden rounded-2xl
     wrapping next/image with src "/images/herne-bay-residential.jpg",
     alt "A residential Auckland home cared for by Sano", fill,
     object-cover, sizes="(max-width: 1024px) 100vw, 45vw"

3. WhyChooseSection — 4 cards verbatim from spec §5 row 3.

4. Custom inline grouped services section on cream
   (bg-[#faf9f6]):
   - Eyebrow "WHAT WE COVER"
   - Heading "Services available in Takapuna" with "Takapuna"
     highlighted in sage-500
   - Subtitle per spec §5 row 4
   - **Property and workplace cleaning** LEADS (Commercial and
     office · Post-construction)
   - Home cleaning (Regular · Deep · End of tenancy)
   - Specialist cleaning (Carpet and upholstery · Window cleaning)
   - All seven services linked to their /services/<slug> pages

5. WhatWeCoverSection (four cards in spec §5 row 5 order). Eyebrow
   "HOW WE APPROACH IT". Heading "Cleaning needs vary by property
   type" with "property type" highlighted. Subtitle per spec §5 row 5.
   Icons: Building2, Home, KeyRound, Briefcase.

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
- /services/regular-cleaning, /services/deep-cleaning,
  /services/end-of-tenancy, /services/commercial-cleaning,
  /services/post-construction, /services/carpet-upholstery,
  /services/window-cleaning (grouped services section)
- No nearby-suburb links

Do NOT claim (spec §8 — page must contain none of these):
- Specific job counts in Takapuna
- Recurring client clusters in Takapuna
- Sano local history in Takapuna
- Named local landmarks used as proof of service (no Lake Pupuke,
  Takapuna Beach, Hurstmere Rd)
- Demographics, property values, housing-stock characterisations
- "Your local Takapuna team" / "Takapuna's trusted cleaner"
- Testimonials or referral sources tied to Takapuna
- Luxury / premium / beachfront-lifestyle framing
- Airbnb / short-stay / holiday-let specialisation claims
- "Salt-air specialist" / "coastal window expert" / similar invented
  niche
- CBD-style corporate positioning
- Any framing that implies Sano specialises in beach or coastal
  cleaning

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
   swap of Mount Eden; confirm the property+workplace lead grouping
   is honest, not just keyword reshuffling
3. sano-visual-reviewer — confirm sage palette / type / spacing
   match siblings; specifically eyeball the property+workplace
   lead grouping (this is the pattern-flex test)
4. sano-scope-guard — confirm no out-of-scope changes (no service-
   areas.ts edits, no shared component edits, no schema-pattern
   divergence)
5. Local gauntlet: npm test (baseline 3 failures expected),
   npx next lint (zero Error lines), npx tsc --noEmit (clean)
6. /sano-ship to push + open PR against main

Hard stops:
- One file added: src/app/(public)/service-area/takapuna/page.tsx.
- No new shared components. No edits to src/lib/service-areas.ts,
  no edits to the parent /service-area page, no edits to existing
  service pages, no edits to shared service-page components.
- Do not introduce a suburb-level Place schema.
- Do not mount SuburbChecker on this page.
- Do not add nearby-suburb links until ≥3 North Shore siblings
  exist.
- Do not skip the reviewer pipeline.
- Do not commit until reviewers + gauntlet are green.
- Visual review iterations expected ≤2 (Mount Eden took 3 — the
  pattern is more proven now).
```

---

## Reference: key files at brief time

- `F:\Sano\01-Site\docs\superpowers\specs\2026-05-25-mount-eden-suburb-pilot.md` — canonical pilot pattern (§11 is the structural reference)
- `F:\Sano\01-Site\docs\superpowers\specs\2026-05-25-suburb-rollout-plan.md` — Stage 1 sequencing + standard build/review workflow
- `F:\Sano\01-Site\.claude\agents\sano-suburb-page-planner.md`
- `F:\Sano\01-Site\docs\AI\SANO_COPY_RULES.md`
- `F:\Sano\01-Site\src\lib\service-areas.ts` (Takapuna at line 67)
- `F:\Sano\01-Site\src\app\(public)\service-area\mount-eden\page.tsx` — the shipped pattern this brief mirrors
- `F:\Sano\01-Site\src\components\SubpageHero.tsx`, `src/components/CtaBanner.tsx`
- `F:\Sano\01-Site\src\app\(public)\services\_components\` — `WhyChooseSection`, `WhatWeCoverSection`, `BookingStepsSection` shared components
