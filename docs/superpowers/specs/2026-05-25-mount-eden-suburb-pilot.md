# Mount Eden Suburb Pilot — Approved Brief

> **Status:** approved brief, ready for drafting. No code changes yet.
> **Date:** 2026-05-25
> **Slug:** `mount-eden`
> **Route:** `/service-area/mount-eden`
> **Related:** `/service-area`, `/services/regular-cleaning`, `/services/deep-cleaning`, `/services/end-of-tenancy`, `/contact`, `/guarantee`, `/faq`
> **Source:** second-pass output of `sano-suburb-page-planner` (2026-05-25), with Mike's confirmed hero + meta wording substituted in §3.
> **Pilot status:** this is the first Sano suburb page. The pattern set here becomes the template for ~30 future suburbs, so the guard rails matter as much as the content.

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

**Locked by Mike (2026-05-25). Use verbatim — no rewording during draft.**

### Meta description

> Regular, deep, and end-of-tenancy cleaning for Mount Eden homes and rentals. Sano helps prepare properties for everyday living, inspections, and handovers.

(154 chars; under the 155 cap.)

### Hero eyebrow

> Mount Eden cleaning services

(All caps in the rendered hero — handled by `SubpageHero`.)

### Hero title

> Mount Eden cleaning for homes, rentals, and move-outs.

(Sentence case, ends with a full stop per the updated `SANO_COPY_RULES.md` H1/H2 rule.)

### Hero subtitle

> Whether you need a recurring clean, a deeper reset, or a property prepared for handover, Sano keeps the scope clear and the process simple.

### Meta title

(Not Mike-locked — recommend `Mount Eden Cleaning Services | Sano` to match the existing `<Service> Services | Sano` pattern visible on sibling service pages. Confirm during draft.)

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
