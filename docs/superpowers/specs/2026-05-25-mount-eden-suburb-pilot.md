# Mount Eden Suburb Pilot — Approved Brief

> **Status:** **shipped** via PR [#181](https://github.com/mikebrowne-sudo/sano-site/pull/181) (merge commit `638d581`) and refined via PR [#182](https://github.com/mikebrowne-sudo/sano-site/pull/182) intro-layout follow-up (merge commit `586425e`). Both merged 2026-05-25.
> **Date:** 2026-05-25
> **Slug:** `mount-eden`
> **Route:** `/service-area/mount-eden`
> **File:** `src/app/(public)/service-area/mount-eden/page.tsx`
> **Related:** `/service-area`, `/services/regular-cleaning`, `/services/deep-cleaning`, `/services/end-of-tenancy`, `/services/commercial-cleaning`, `/services/post-construction`, `/services/carpet-upholstery`, `/services/window-cleaning`, `/contact`, `/guarantee`, `/faq`
> **Source:** second-pass output of `sano-suburb-page-planner` (2026-05-25), with Mike's confirmed wording iterated through three visual-review passes before merge.
> **Pilot status:** this is the first Sano suburb page. The pattern set here becomes the template for ~30 future suburbs, so the guard rails matter as much as the content.
>
> **Reading order:** §§1–10 capture the original brief (preserved as the historical record). **§11 captures the final shipped state** — the structural additions made during visual review (property-type section, grouped 7-service catalogue, trimmed WhyChooseSection, always-on `/guarantee` + `/faq` links). If §5 / §7 / §9 conflict with §11, **§11 is the canonical reference for future suburb pages.**

---

## 1. Recommendation + rationale

**`proceed after Mike confirms details`** → **upgraded to `proceed`** with the approved hero / meta wording in §3 below. Three earlier open calls are now closed:

1. **Meta description wording** — approved (§3).
2. **Hero eyebrow + title + subtitle wording** — approved (§3).
3. **SuburbChecker decision** — recommended **omit on suburb pages**, replaced by a single text link "Check another suburb → `/service-area`" inside the closing CTA (§5). Open for Mike's final OK during draft review.

No repo-level blocker. The `(public)/service-area/` directory exists with a planning comment anticipating exactly this slug pattern, the schema convention is consistent across all six service pages, and every shared component the brief needs already exists.

---

## 2. Pilot page brief

| Field | Value |
|---|---|
| **Name** | Mount Eden |
| **Slug** | `mount-eden` (matches `src/lib/service-areas.ts:44`) |
| **Audience** | Mount Eden householders and the tenants / owners / property managers responsible for a Mount Eden property |
| **Primary search intent** | "cleaner mount eden" / "house cleaning mount eden" — householder looking for a recurring or one-off residential cleaner |
| **Secondary search intent** | "end of tenancy cleaning mount eden" — tenant, owner, or property manager preparing for handover |
| **Primary services (Mike's confirmed order)** | 1. Regular house cleaning → `/services/regular-cleaning`<br>2. Deep cleaning → `/services/deep-cleaning`<br>3. End of tenancy / move-out cleaning → `/services/end-of-tenancy` |
| **Primary CTA** | `Get a Free Quote` → `/contact` (matches every existing service-page hero + the public-site `QuoteButton` default) |
| **Related service links** | The three primary services above, plus `/services` as the catch-all |

---

## 3. Approved hero + meta wording

**Final wording as shipped in PR #181 (2026-05-25).** The hero went through three iterations during visual review; the v3 wording below is what landed in production. Meta description + eyebrow stayed unchanged throughout. See §11 for the v1 → v3 evolution.

### Meta description (unchanged through all versions)

> Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals. Sano helps prepare properties for everyday living, inspections, and handovers.

(154 chars; under the 155 cap.)

### Hero eyebrow (unchanged through all versions)

> Mount Eden cleaning services

(All caps in the rendered hero — handled by `SubpageHero`.)

### Hero title (v3 final — changed from v1)

> Cleaning for homes, rentals, and workplaces.

(Sentence case, ends with a full stop per the `SANO_COPY_RULES.md` H1/H2 rule. **Suburb name dropped from the title** — eyebrow carries the suburb signal.)

### Hero subtitle (v3 final — changed from v1)

> From older homes and apartments to rentals, offices, and handovers, Sano helps match the cleaning scope to the property and the reason for the clean.

(Suburb name not mentioned. Use-case-led framing covering all four audience types on the page.)

### Meta title

> Mount Eden Cleaning Services | Sano

(Matches the existing `<Service> Services | Sano` pattern on sibling service pages.)

---

## 4. Recommended route + file location

- **URL:** `/service-area/mount-eden`
- **File:** `src/app/(public)/service-area/mount-eden/page.tsx`
- **Route group:** `(public)` — matches the parent `src/app/(public)/service-area/page.tsx`.

The planning comment in `src/lib/service-areas.ts:32` says `src/app/service-area/[slug]/page.tsx`. That comment **predates the `(public)` route-group reorg** and is stale on the path prefix while correct on the URL. Resolve in favour of the actual current directory structure.

No dynamic `[slug]` route on the pilot. One static `mount-eden/page.tsx` file. Move to a dynamic `[slug]` route once ≥3 suburb pages exist and the pattern is proven.

---

## 5. Recommended page sections (existing components only)

Scroll order. Every section uses a component that already exists in the repo. **No new components.**

| # | Section | Component | One-line content intent |
|---|---|---|---|
| 1 | Hero | `SubpageHero` from `@/components/SubpageHero` | Use the §3 approved eyebrow / title / subtitle. Primary CTA `Get a Free Quote` → `/contact`. Use `DEFAULT_TRUST_ITEMS`. |
| 2 | Service Information | `ServiceInformation` from the `services/_components/` directory (relative import or alias) | Three short paragraphs grounded *only* in Mike's operational-truth sentence: (a) Mount Eden sits inside Sano's normal Auckland service area; (b) this page exists to help residents and property managers find the right service quickly; (c) the same Sano team and standards apply as anywhere else Sano works. |
| 3 | What we cover in Mount Eden | `WhatWeCoverSection` from `services/_components/` | Three cards, one per confirmed service in Mike's order. Card 1: regular house cleaning. Card 2: deep cleaning. Card 3: end of tenancy / move-out. Each card body stays at "what the service is" with a "Read more" link to the existing service page. The suburb page must not duplicate service-page body content. |
| 4 | Why choose Sano | `WhyChooseSection` | Reuse the trust messaging pattern from sibling service pages (insured + vetted, consistent team, clear quotes, easy to deal with, detail-focused finish, NZ English voice). No claims about Mount Eden specifically. |
| 5 | Booking steps | `BookingStepsSection` | Three-step pattern matching existing service pages. Generic to all three services so the page does not imply a service-specific booking flow. |
| 6 | Closing CTA | `CtaBanner` | Single `Get a Free Quote` CTA, plain "Sano covers Mount Eden" framing, **plus a single text link "Check another suburb → `/service-area`"**. Do not mount `SuburbChecker`. |

### SuburbChecker decision

**Omit on the pilot.** Reasoning:

- The parent `/service-area` page already hosts the checker prominently (`page.tsx:147`).
- On a suburb landing page the visitor has by definition already confirmed Sano covers Mount Eden (they landed on this URL).
- A checker on a suburb page invites the user to either re-type the same suburb (poor UX) or type a different one and bounce off to a page that may not exist yet (no sibling suburb pages live).
- A single text link "Check another suburb → `/service-area`" in the closing CTA delivers the same affordance without the friction.

Worth Mike's final OK during draft review. This is the only structural deviation from the original brief and it bakes into the pilot pattern, so it deserves a sign-off rather than a quiet assumption.

---

## 6. Content angle (honest, "thin by design")

The angle is intentionally narrow: Mount Eden sits inside Sano's normal Central Auckland service area, and the page exists as a single, well-routed entry point for the three residential services Mike has confirmed Sano runs there — regular, deep, and end-of-tenancy. The page does not claim local presence, local history, or familiarity with Mount Eden specifically. Its job is to (a) confirm coverage, (b) route the visitor to the right service page, and (c) get them to a quote.

That is genuinely useful (no current page does all three for a single suburb), but it is thin by design and would mostly hold up if "Mount Eden" were swapped for "Mt Roskill" or "Mt Wellington" with the suburb name changed. That's honest given Sano has no Mount-Eden-specific facts to lean on yet. **The pilot's value is proving the pattern + guard rails, not making a unique claim.**

If we want a more distinctive Mount Eden voice in a later iteration, the kinds of inputs that would unlock it are: a notable villa-deep-clean cluster, a specific property-manager relationship, or genuine "we know the typical Mount Eden villa layouts and what they need" expertise. None of those exist yet; we don't fabricate them.

---

## 7. Internal links

All targets verified to exist in the repo at brief time.

### Always-on links (header / footer style — included in body or CTA)

- (`Get a quote`, `/contact`) — `src/app/(public)/contact/page.tsx` exists
- (`Service areas`, `/service-area`) — `src/app/(public)/service-area/page.tsx` exists
- (`Our guarantee`, `/guarantee`) — `src/app/(public)/guarantee/page.tsx` exists
- (`FAQ`, `/faq`) — `src/app/(public)/faq/page.tsx` exists

### Confirmed service links (one per `WhatWeCoverSection` card)

- (`Regular house cleaning`, `/services/regular-cleaning`)
- (`Deep cleaning`, `/services/deep-cleaning`)
- (`End of tenancy cleaning`, `/services/end-of-tenancy`)

### Nearby-suburb links

**Deferred.** No other suburb pages exist yet — Mount Eden is the pilot. For now the only "nearby suburb" affordance is the closing-CTA text link to `/service-area` as the catch-all.

Once at least three Central Auckland sibling suburb pages are live (candidates from `SERVICE_AREAS` active list: Epsom, Kingsland, Sandringham, Grey Lynn, Balmoral), retrofit a `Nearby suburbs we cover` block onto the earlier pages.

---

## 8. Risks / facts to avoid

### Mike's `Do not claim` list (locked, applies to every Sano suburb page)

The page must not assert any of:

- Specific job counts in Mount Eden
- Recurring client clusters in Mount Eden
- Sano local history in Mount Eden ("we've been cleaning Mount Eden homes since…", etc.)
- Named local landmarks used as proof of service (no Mt Eden summit, no Eden Park, no Maungawhau references used as social proof)
- Demographics, property values, or housing-stock characterisations ("Mount Eden villas", "Mount Eden townhouse owners", "family-heavy suburb")
- "Your local Mount Eden team" / "Mount Eden's trusted cleaner" / any phrasing implying a Mount-Eden-resident team
- Testimonials or referral sources tied to Mount Eden
- Anything Mike has not personally verified beyond his operational-truth sentence

### Copy-rule guards (`docs/AI/SANO_COPY_RULES.md`)

- Forbidden phrases: `premium`, `eco-friendly`, `industry-leading`, `streamlined`, `world-class`, `transformative`, `luxury`
- Over-used (flag if >1× or where plainer fits): `bespoke`, `tailored`, `seamless`, `elevated`
- NZ English (`organise`, `colour`, `realise`)
- Phone format `0800 726 686` (only if a phone appears at all)
- No emoji
- **No em dashes in customer-facing copy** — rewrite, or use commas / parentheses / full stops (per the customer-facing-only scope clarification in `SANO_COPY_RULES.md`)
- Curly quotes in blockquotes, not straight quotes
- Eyebrows ALL CAPS with `0.22em` letter-spacing (handled by `SubpageHero` automatically)
- Display H1 may end with a full stop per the recent rule clarification (already applied to the §3 hero title)

### Schema guard

Keep `areaServed` at `{ '@type': 'City', name: 'Auckland' }` to match every existing service page (`Service` `@type`, `LocalBusiness` provider). Inline `<script type="application/ld+json">` pattern, same shape as siblings. **Do not** introduce a suburb-level `Place` schema for the pilot — there is no precedent in the repo, and the conservative call is to match the convention until Mike says otherwise. The suburb signal lives in the URL slug, title tag, and H1.

### Metadata guard

Title and description mention Mount Eden + the three services without claiming local-Mount-Eden presence. The §3 wording is already aligned with this rule; do not drift during draft.

---

## 9. Pilot-pattern guidance — what to template, what to keep flexible

### Template these (durable across all suburb pages)

- **Route pattern:** `src/app/(public)/service-area/[slug]/page.tsx`, one static file per active suburb in `SERVICE_AREAS` until a dynamic `[slug]/page.tsx` route is justified.
- **Component composition:** `SubpageHero` → `ServiceInformation` → `WhatWeCoverSection` (cards routing to relevant service pages) → `WhyChooseSection` → `BookingStepsSection` → `CtaBanner`. No new components.
- **Schema pattern:** Auckland-level `areaServed`, `LocalBusiness` provider, no suburb-level `Place`.
- **CTA pattern:** single `Get a Free Quote` → `/contact`, repeated in hero and closing CTA.
- **Internal-link layout:** always-on links to `/service-area`, `/contact`, `/guarantee`, `/faq`; one link per confirmed service in `WhatWeCoverSection`; nearby-suburb links deferred until ≥3 sibling suburb pages exist in the same region.
- **SuburbChecker placement:** omitted on suburb pages, replaced by a single text link "Check another suburb → `/service-area`" in the closing CTA.
- **"What we will never claim" guard rail:** Mike's `Do not claim` list in §8 is durable. Every new suburb page needs its own Mike-confirmed operational-truth sentence — no template-swap.

### Keep flexible per-suburb

- **`WhatWeCoverSection` service mix.** Mount Eden = regular + deep + end-of-tenancy. Another suburb may need commercial or carpet front-and-centre. Do not lock the three-card mix into the template.
- **Hero copy.** Each suburb needs its own use-case-led hero approved by Mike before draft. Do not template-swap the hero wording.
- **Meta description.** Same.

### Caveats

- The pattern only works for suburbs where Sano genuinely services *and* where Mike supplies at least one verifiable operational-truth sentence. If a suburb has zero Mike-confirmed input, the planner should still return `defer` regardless of how clean the template is.
- Revisit the `SuburbChecker` omission if user-testing shows visitors want a "check another suburb" affordance more prominent than a single closing-CTA link.
- Retrofit nearby-suburb links onto earlier pages once ≥3 siblings ship in the same region.

---

## 10. Suggested next prompt — drafting the page (use only after Mike's final OK on §3 wording + §5 SuburbChecker decision)

Copy-paste this into a future session when ready to draft:

```
Draft the Mount Eden suburb pilot page from the approved spec at:
docs/superpowers/specs/2026-05-25-mount-eden-suburb-pilot.md

Do not create a reusable suburb-page generator yet. Build Mount Eden as the pilot first, then review the pattern before abstracting anything.

Decisions locked by the spec — do not change without going back to Mike:
- Route: /service-area/mount-eden
- File: src/app/(public)/service-area/mount-eden/page.tsx
- Route group: (public), matching the existing service-area parent
- Slug already exists in src/lib/service-areas.ts (do not modify)
- Schema: inline application/ld+json, match existing service-page convention
  (Service @type, areaServed = City "Auckland", LocalBusiness provider).
  Do NOT introduce a suburb-level Place schema.

Hero + meta wording — use VERBATIM from spec §3:
- Meta description (154 chars)
- Hero eyebrow "Mount Eden cleaning services"
- Hero title "Mount Eden cleaning for homes, rentals, and move-outs."
- Hero subtitle as written in §3
- Meta title: "Mount Eden Cleaning Services | Sano" (matches sibling pattern)

Component composition (spec §5, existing components only — no new components):
1. SubpageHero (approved §3 strings, primary CTA Get a Free Quote → /contact,
   DEFAULT_TRUST_ITEMS)
2. ServiceInformation (three short paragraphs grounded ONLY in the
   operational-truth sentence — spec §5 row 2 intent)
3. WhatWeCoverSection (three cards in Mike's confirmed order: regular,
   deep, end-of-tenancy — each card links to its full service page)
4. WhyChooseSection (trust messaging matching sibling service pages,
   no Mount-Eden-specific claims)
5. BookingStepsSection (three steps, generic to all three services)
6. CtaBanner (single Get a Free Quote, "Sano covers Mount Eden" framing,
   plus a single text link "Check another suburb → /service-area" — do
   NOT mount the SuburbChecker component on this page)

Internal links (spec §7 — every target verified):
- /contact (quote)
- /service-area (parent / "check another suburb")
- /guarantee, /faq
- /services/regular-cleaning, /services/deep-cleaning, /services/end-of-tenancy
- /services (catch-all)
- No nearby-suburb links — pilot only, deferred until ≥3 sibling pages exist.

Do NOT claim (spec §8 — page must contain none of these):
- Specific job counts in Mount Eden
- Recurring client clusters in Mount Eden
- Sano local history in Mount Eden
- Local landmarks used as proof of service
- Demographics, property values, housing-stock characterisations
- "Your local Mount Eden team" / "Mount Eden's trusted cleaner"
- Testimonials or referral sources tied to Mount Eden

Copy-rule guards (docs/AI/SANO_COPY_RULES.md):
- No premium / eco-friendly / industry-leading / streamlined / world-class /
  transformative / luxury
- Flag bespoke / tailored / seamless / elevated if used >1×
- NZ English
- Phone 0800 726 686 only if a phone appears
- No emoji
- No em dashes in customer-facing copy
- Eyebrow handled by SubpageHero (ALL CAPS, 0.22em)

Post-draft pipeline — run BEFORE opening a PR:
1. sano-copy-reviewer — enforce SANO_COPY_RULES.md + the Do-not-claim list
2. sano-thin-content-guard — flag if the page reads as a template swap
3. sano-visual-reviewer — confirm sage palette / type / spacing match siblings
4. sano-scope-guard — confirm no out-of-scope changes (no service-areas.ts
   edits, no new components, no schema-pattern divergence)
5. Local gauntlet: npm test (baseline 3 failures), npx next lint
   (zero Error lines), npx tsc --noEmit (clean)
6. /sano-ship to push + open PR against main

Hard stops:
- One file added: src/app/(public)/service-area/mount-eden/page.tsx.
- No new components. No edits to src/lib/service-areas.ts, no edits
  to the parent /service-area page, no edits to existing service pages.
- Do not introduce a suburb-level Place schema.
- Do not mount SuburbChecker on this page.
- Do not add nearby-suburb links until siblings exist.
- Do not skip the reviewer pipeline.
- Do not commit until reviewers + gauntlet are green.
```

---

## 11. Final shipped state — what actually landed (canonical reference)

PR #181 shipped a structurally richer page than §5 originally specified. The page evolved through three iterations during visual review. **For future suburb pages, this section is the canonical template, not §5.**

### Hero (v3 — landed)

- Eyebrow / Title / Subtitle / Meta as documented in §3 above (final wording).
- Image: `/images/heroes/regular-house-cleaning-hero.jpg` — accepted for the pilot; per-suburb hero selection deferred until ≥3 suburbs ship.

### Page sections — actual scroll order

| # | Section | Component | What shipped |
|---|---|---|---|
| 1 | Hero | `SubpageHero` | §3 v3 strings. Primary CTA `Get a Free Quote` → `/contact`. `DEFAULT_TRUST_ITEMS`. |
| 2 | Intro / property context | **Inline `<section>`** built per PR [#182](https://github.com/mikebrowne-sudo/sano-site/pull/182) — NOT the shared `ServiceInformation` component | **One image only.** Image `/images/herne-bay-residential.jpg`, sized + treated to match the standard service-page system exactly: `lg:grid-cols-[1.2fr_0.8fr]` grid, `aspect-[4/3]`, `rounded-2xl`, `object-cover`, `sizes="(max-width: 1024px) 100vw, 45vw"`. H2 `Service Information` with `border-b border-sage-100` underline + `body-text space-y-4` paragraphs match sibling styling. Two paragraphs grounded in Mike-approved property-mix wording: *"Mount Eden has a mix of homes, rentals, apartments, and small commercial properties…"*. Suburb named once in opener. The shared `ServiceInformation` component (and the six service pages that use it) stays untouched. |
| 3 | Why Sano | `WhyChooseSection` | **Moved earlier** (was originally planned later). **4 cards on a 2x2 grid**, not the 6-card sibling pattern. Cards: `Clear scopes and simple quotes`, `Careful cleaners`, `Insured and vetted teams`, `Follow-up if needed`. No Mount Eden mentions in any card. |
| 4 | Services available in Mount Eden | **Custom inline section** (not `WhatWeCoverSection`) | Three labelled groups on cream, each rendered as `<h3>` + inline-link `<p>`: **Home cleaning** (regular, deep, end-of-tenancy), **Property and workplace cleaning** (commercial, post-construction), **Specialist cleaning** (carpet, window). **All seven Sano services linked through.** Replaces the originally-planned 3-card `WhatWeCoverSection` so the page never implies only 3 services are available. |
| 5 | Cleaning needs by property type | `WhatWeCoverSection` | **NEW section, not in original §5.** Four cards: `Older homes and detailed interiors` (`Home` icon), `Apartments and townhouses` (`Building2`), `Rentals and handovers` (`KeyRound`), `Workplaces and small commercial spaces` (`Briefcase`). Eyebrow `HOW WE APPROACH IT` + supply-side subtitle so the section reads as cleaning-needs framing, not a Mount Eden housing-stock claim. Renders 4 cards on `lg:grid-cols-3` (3+1 orphan at lg — accepted for pilot; future call). |
| 6 | Booking steps | `BookingStepsSection` | Heading genericised to `Book your clean in 3 simple steps` (no suburb). Three generic steps. |
| 7 | Schema (invisible) | inline `<script type="application/ld+json">` | `Service` `@type`, `LocalBusiness` provider, `areaServed: { '@type': 'City', name: 'Auckland' }`. Description lists all 7 services: *"Cleaning services across Mount Eden: regular, deep, end of tenancy, commercial, carpet, window, and post-construction."* |
| 8 | CtaBanner | `CtaBanner` | Headline genericised to `Ready to book your clean?`. No suburb mention. |
| 9 | Closing trust strip | Inline `<section>` on cream | Three text links: `Check another suburb → /service-area`, `Our guarantee → /guarantee`, `FAQ → /faq`. **`SuburbChecker` intentionally NOT mounted** per §5 spec decision. |

### Internal links — actual rendered

All seven service pages linked from the grouped services section (§4 above), not just the three primary residential services originally specified in §7. Always-on `/guarantee` + `/faq` shipped in the closing strip (originally specified as always-on in spec §7 but only landed in v3 after `sano-thin-content-guard` flagged the gap).

### Mount Eden mention count — final

Customer-facing mentions: **7 total**:
- 4 in metadata where suburb naming belongs (meta title, meta description, schema name, schema description)
- 3 in visible content (hero eyebrow, intro body opener, services section heading)

**Zero mentions in hero title, hero subtitle, all 4 WhyChooseSection cards, the grouped services list bodies, all 4 property-type card bodies, BookingStepsSection, CtaBanner, or the closing strip.**

### Pilot pattern — what to template, post-merge

Updated from §9 to reflect what actually shipped:

**Template these (durable across all suburb pages):**

- **Route + file:** `src/app/(public)/service-area/<slug>/page.tsx`, one static file per suburb. No dynamic `[slug]` route until ≥3 suburbs ship and the pattern is proven.
- **Component composition** (final order): `SubpageHero` → **custom inline single-image intro section** (matches `ServiceInformation` proportions but with one image — see Section 2 row above for the exact Tailwind classes) → `WhyChooseSection` (4 cards) → custom inline grouped services section → `WhatWeCoverSection` (4 property-type cards) → `BookingStepsSection` → JSON-LD → `CtaBanner` → closing trust strip.
- **Schema:** `Service` `@type`, `LocalBusiness` provider, `areaServed = City Auckland`. No suburb-level `Place`.
- **CTA:** single `Get a Free Quote` → `/contact`, repeated in hero + `CtaBanner`.
- **Closing strip:** three text links — `Check another suburb`, `Our guarantee`, `FAQ`. No `SuburbChecker`.
- **Mount Eden mention cadence:** keep customer-facing mentions concentrated in metadata + one or two headings. Hero title + subtitle stay suburb-free.
- **"What we will never claim" guard rail:** Mike's §8 Do-not-claim list is durable. Plus: do not claim Sano has cleaned specific property types in the suburb specifically (Mike's v3 instruction).

**Keep flexible per-suburb:**

- **Hero copy.** Each suburb needs its own use-case-led hero and meta wording approved by Mike before draft. Do not template-swap.
- **Intro body + image.** Each suburb needs its own Mike-confirmed property-mix sentence (e.g. for Mount Eden: *"a mix of homes, rentals, apartments, and small commercial properties"*). No template-swap on the words. The intro image can be reused across suburbs initially (Mount Eden uses `/images/herne-bay-residential.jpg`) — swap per suburb if/when Mike supplies suburb-specific photography.
- **Grouped services mix.** Mount Eden surfaced all 7 services because all 7 are available. If a suburb has a different practical service mix (e.g. no commercial demand), the grouped section can drop categories — but each grouped row must still list real Sano services that actually serve the area.
- **Property-type cards.** The four property-type cards Mike approved for Mount Eden (older homes / apartments / rentals / workplaces) reflect the property mix Mike confirmed for this suburb. **Each new suburb needs its own Mike-confirmed property mix** before the property-type section is drafted. Same supply-side wording rule applies: describe how Sano approaches the property type, not what Sano has done with it in that suburb.

### What changed during visual review (v1 → v5)

PR #181 carried v1 → v3 (initial pilot draft + two visual-review iterations + merge). PR #182 carried v4 → v5 (post-merge intro-layout refinement).

- **v1:** 3-card `WhatWeCoverSection` for the three primary residential services + "Read more" router + "Also available" inline list. Hero title `Mount Eden cleaning for homes, rentals, and move-outs.` (suburb-named). Intro section used the shared `ServiceInformation` with two stacked images.
- **v2:** Hero title kept; meta + eyebrow unchanged. Wording polished. Schema description expanded. Supply-side wording fixes for "most relevant" / "most often booked" applied per `sano-thin-content-guard`.
- **v3 (shipped via PR #181, merge commit `638d581`):** Hero rewritten to suburb-free title + subtitle. `WhyChooseSection` moved earlier and trimmed to 4 cards. 3-card services replaced with the grouped 7-service inline section. **New property-type `WhatWeCoverSection` added.** `/guarantee` + `/faq` always-on links added to closing strip. Intro section still used the shared `ServiceInformation` with two stacked images at this point.
- **v4 (intermediate, shipped + reviewed within PR #182):** Intro section replaced with an inline single-image variant. First attempt used a fixed-width 320px image column — visually too small compared to the rest of the Sano service-page system.
- **v5 (final, shipped via PR #182, merge commit `586425e`):** Intro single-image variant sized to match the service-page system exactly: `lg:grid-cols-[1.2fr_0.8fr]`, `aspect-[4/3]`, `rounded-2xl`, `object-cover`, `sizes="(max-width: 1024px) 100vw, 45vw"`. Visual consistency with the rest of the public site preserved. One image only (`/images/herne-bay-residential.jpg`).

The §10 next-prompt below was executed in v1; v2 through v5 followed from operator visual-review feedback across PRs #181 and #182. For suburb #2, do not copy the §10 prompt verbatim — copy this §11 instead.

---

## Reference: key files at brief time

- `F:\Sano\01-Site\.claude\agents\sano-suburb-page-planner.md`
- `F:\Sano\01-Site\docs\AI\SANO_COPY_RULES.md`
- `F:\Sano\01-Site\src\lib\service-areas.ts` (Mount Eden at line 44; stale path comment at line 32)
- `F:\Sano\01-Site\src\app\(public)\service-area\page.tsx` (planning comment at lines 103-106)
- `F:\Sano\01-Site\src\app\(public)\services\regular-cleaning\page.tsx`
- `F:\Sano\01-Site\src\app\(public)\services\deep-cleaning\page.tsx`
- `F:\Sano\01-Site\src\app\(public)\services\end-of-tenancy\page.tsx`
- `F:\Sano\01-Site\src\app\(public)\services\_components\` (`ServiceInformation`, `WhyChooseSection`, `BookingStepsSection`, `WhatWeCoverSection`)
- `F:\Sano\01-Site\src\components\SubpageHero.tsx`
- `F:\Sano\01-Site\src\components\SuburbChecker.tsx`
- `F:\Sano\01-Site\src\app\(public)\contact\page.tsx`, `guarantee\page.tsx`, `faq\page.tsx` — all verified
