# Suburb Page Rollout Plan — Post Mount Eden Pilot

> **Status:** planning only. No pages, no routes, no code changes proposed in this doc.
> **Date:** 2026-05-25
> **Builds on:** [Mount Eden pilot spec](./2026-05-25-mount-eden-suburb-pilot.md) (shipped via PRs #181 + #182)
> **Scope:** rollout strategy for the next 6–10 suburb pages following the Mount Eden pilot pattern.

---

## Framing

The Mount Eden pilot pattern (per §11 of the Mount Eden pilot spec) is now the canonical suburb-page template. This rollout plan picks the next batch of suburbs to test the pattern against **different property mixes and regions**, so we learn fast whether the template is robust or needs region-specific variants before we lock it in for ~30 suburbs.

**Core principle from the Mount Eden pilot, carried forward to every suburb:**

> Every suburb page needs a Mike-confirmed operational-truth sentence + a Mike-confirmed property-mix sentence before the planner returns `proceed`. No suburb page ships without those two inputs — even if the slug is on the active service-area list.

This plan does **not** invent property-mix or service-emphasis claims for any suburb. All such observations below are framed as **research candidates Mike should verify** before the planner runs.

---

## Part A — Three test suburb briefs

### A1. Epsom

| Field | Value / status |
|---|---|
| **1. Recommended route** | `/service-area/epsom` (slug `epsom` confirmed in `src/lib/service-areas.ts:39`, postcode `1023`, Central Auckland, active). File path: `src/app/(public)/service-area/epsom/page.tsx`. |
| **2. Likely property mix to research and verify** | Public characteristics suggest: predominantly residential (older villas + townhouses), some apartment density near Greenlane / hospital corridor, established school catchments. **All flagged as `needs Mike's verification`** — must not appear on the page until Mike confirms what Sano actually sees in this area. |
| **3. Likely service emphasis** | Residential-heavy (regular + deep + end-of-tenancy) likely dominant, similar to Mount Eden. Possible secondary commercial pull from healthcare corridor. **Needs Mike's call on which 2–3 services genuinely drive Epsom enquiries.** |
| **4. Suggested page angle** | "Cleaning across Epsom's residential mix" — same use-case-led framing as Mount Eden, adjusted to Epsom's actual property mix once Mike confirms it. Risk: too similar to Mount Eden (both Central Auckland, both residential-heavy) — pattern test may not surface new lessons. Consider running Epsom second if Takapuna can be queued first to test region variation harder. |
| **5. Risks / claims to avoid** | All Mount Eden Do-not-claim list items apply unchanged. Specific Epsom risks: school-zone framing (do not name or imply school catchments — invites parental targeting that doesn't fit Sano's voice), property-value claims (Epsom is a known higher-value area — do not lean into this), villa-heritage characterisations without Mike's confirmation Sano regularly works on older villa stock locally. |
| **6. Internal links to include** | Same always-on links as Mount Eden (`/contact`, `/service-area`, `/guarantee`, `/faq`). All seven service pages from the grouped services section. **Nearby-suburb links: Mount Eden** (once Epsom ships, Mount Eden + Epsom can finally link to each other — first reciprocal pair). |
| **7. Proceed now or needs more Mike input?** | **Needs more Mike input.** Same six unlocking questions as Mount Eden v1 spec §6: confirmed service mix, operational truth sentence, property-mix sentence, route placement (already settled as `/service-area/<slug>` post-Mount Eden), `SuburbChecker` decision (settled — omit), schema (settled — Auckland-level). So in practice: needs 3 confirmations (services / op truth / property mix). |

### A2. Takapuna

| Field | Value / status |
|---|---|
| **1. Recommended route** | `/service-area/takapuna` (slug `takapuna` confirmed in `src/lib/service-areas.ts:67`, postcode `0622`, North Shore, active). File path: `src/app/(public)/service-area/takapuna/page.tsx`. |
| **2. Likely property mix to research and verify** | Public characteristics suggest: significant apartment density (low-rise + tower), townhouses, standalone homes near the lake, substantial commercial / retail centre, possible short-stay/holiday-let inventory near the beach. **All flagged as `needs Mike's verification`** — Takapuna's mix is meaningfully different from Mount Eden, which is the value of testing it here. |
| **3. Likely service emphasis** | Likely a different mix than Central Auckland suburbs: end-of-tenancy and apartment-friendly regular cleaning may dominate (rental density); commercial / office cleaning genuinely relevant (real commercial centre, unlike Mount Eden where it's secondary). **Needs Mike's call** on whether the page should foreground commercial / office cleaning more prominently than Mount Eden does. |
| **4. Suggested page angle** | "Cleaning across Takapuna's mix of apartments, homes, and workplaces" — explicitly tests whether the pilot's residential-leading framing flexes when commercial is genuinely significant. If Mike confirms a stronger commercial pull here, this could become the first suburb where the grouped "Property and workplace cleaning" section is the visual lead rather than secondary. |
| **5. Risks / claims to avoid** | All Mount Eden Do-not-claim list items apply. Specific Takapuna risks: holiday-let / Airbnb framing (do not claim Sano specialises in short-stay turnover unless Mike confirms — easy mis-step on a beach suburb), beach-lifestyle / "luxury" copy (Takapuna invites this voice — explicitly forbidden per `SANO_COPY_RULES.md`), corporate / CBD-style positioning that doesn't match Sano's voice. |
| **6. Internal links to include** | Same always-on links as Mount Eden. All seven service pages from the grouped services section. **Nearby-suburb links: none initially** (Takapuna would be the first North Shore suburb page — wait for ≥2 more North Shore siblings before retrofitting). |
| **7. Proceed now or needs more Mike input?** | **Needs more Mike input** — and Takapuna's confirmed inputs are more valuable to gather than Epsom's because the property mix and service emphasis are likely genuinely different. Priority candidate for the first non-Mount-Eden brief. |

### A3. Manukau

| Field | Value / status |
|---|---|
| **1. Recommended route** | `/service-area/manukau` (slug `manukau` confirmed in `src/lib/service-areas.ts:94`, postcode `2104`, South Auckland, active). File path: `src/app/(public)/service-area/manukau/page.tsx`. |
| **2. Likely property mix to research and verify** | Public characteristics suggest: predominantly residential family homes, significant commercial centre (Manukau City Centre), industrial / logistics corridors, mix of property age + value, large school catchments. **Disambiguation question for Mike:** is "Manukau" being used here to mean the specific suburb (2104) or the wider Manukau region? The page should clearly mean the suburb to match the slug + the rest of the per-suburb model. **All flagged as `needs Mike's verification`.** |
| **3. Likely service emphasis** | Possibly the most commercial-heavy of the three (real commercial centre + industrial spillover). Residential + commercial split likely much closer to 50/50 than Mount Eden or Epsom. **Needs Mike's call** on whether Manukau is worth pursuing as a residential-led page or whether it makes more sense as a commercial-led page (or both — split into two pages later). |
| **4. Suggested page angle** | "Cleaning across Manukau" with explicit commercial / office cleaning emphasis if Mike confirms that's the dominant pull. This is the suburb that tests the pilot template's flexibility hardest — it might also be the suburb that reveals the template doesn't fit some service-mix profiles cleanly. |
| **5. Risks / claims to avoid** | All Mount Eden Do-not-claim list items apply, **and** Manukau has additional sensitivity around demographic / socioeconomic claims that are common in lazy SEO copy ("affordable suburbs", "growing area", "family-focused community") — **all explicitly forbidden**, none of those frames belong on a Sano page. Stay strictly on what Sano offers, not who lives there. |
| **6. Internal links to include** | Same always-on links as Mount Eden. All seven service pages from the grouped services section. **Nearby-suburb links: none initially** (first South Auckland suburb page — wait for ≥2 more South Auckland siblings before retrofit). |
| **7. Proceed now or needs more Mike input?** | **Needs more Mike input** — and Manukau is the suburb where Mike's input matters most because the right service emphasis is genuinely unclear from public characteristics alone. If Sano's actual Manukau work is mostly residential, the pilot template works. If it's mostly commercial, the template may need a commercial-led variant. Worth waiting until Mike has clearer operational data before queueing. |

---

## Part B — Recommended rollout order for the next 6–10 suburbs

**Sequencing principle:** test pattern flexibility early (different regions + property mixes) before back-filling clusters. Cluster fills come second so we have ≥3 sibling pages per region before retrofitting nearby-suburb links.

### Stage 1 — Pattern stress test (3 suburbs across 3 regions)

Run these in this order to learn fastest:

1. **Takapuna** (North Shore) — biggest test of pattern flexibility. Tests apartment-heavy + real commercial mix in a non-Central region.
2. **Manukau** (South Auckland) — second-biggest test. Tests commercial-heavy mix in a third region. Defer until Mike has operational input on residential-vs-commercial split.
3. **Epsom** (Central Auckland) — pattern reuse confirmation. Same region as Mount Eden, similar mix likely → mostly proves the template can be repeated cleanly. Lower priority than Takapuna or Manukau.

### Stage 2 — Central Auckland cluster fill (3 suburbs)

Run after Stage 1 so we have ≥3 Central pages live and the nearby-suburb retrofit becomes possible:

4. **Grey Lynn** (Central, `grey-lynn`, slug confirmed `service-areas.ts:42`)
5. **Kingsland** (Central, `kingsland`, slug confirmed `service-areas.ts:43`)
6. **Ponsonby** (Central, `ponsonby`, slug confirmed `service-areas.ts:47`)

These three plus Mount Eden + Epsom = five Central suburbs. At that point retrofit the nearby-suburb internal-link block onto Mount Eden + Epsom (per Mount Eden pilot spec §9 "retrofit ≥3 sibling pages").

### Stage 3 — Regional fill-in (2–4 more suburbs)

7. **One more North Shore** suburb so Takapuna has ≥2 siblings — candidate: Devonport (verify slug + active status before queueing).
8. **One more South Auckland** suburb so Manukau has ≥2 siblings — candidate: Papakura or Onehunga (verify).
9. **One East Auckland** suburb — first East page introduces cross-region pattern variety. Candidate: Mission Bay or Howick.
10. **One West Auckland** suburb — last region to test. Candidate: Henderson or Titirangi.

Total: 10 suburbs across all 5 active regions in `SERVICE_AREAS`, with at least one cluster (Central) reaching the 5-suburb threshold for the nearby-suburb retrofit.

**Pause point: after Stage 1 (3 suburbs live).** Review whether the template held up across regions. If it did, proceed to Stage 2 mechanically. If it didn't, run a brief retrospective with the planner before continuing.

---

## Part C — Standard suburb research brief template

Fill this in **before** invoking `sano-suburb-page-planner` on a new suburb. This is what Mike supplies; the agent reads it as the verified-facts input.

```
SUBURB RESEARCH BRIEF — <SUBURB NAME>

Date: <YYYY-MM-DD>
Slug: <kebab-case, must match src/lib/service-areas.ts>
Region: <Central / North Shore / East / South / West>
Postcode(s): <as listed in service-areas.ts>

1. Confirmed Sano service mix in this suburb
   (Pick 2–4 services that genuinely drive enquiries here. Be honest — if
   the page should foreground commercial, say so.)
   - Primary services:
     1. <service> → /services/<slug>
     2. <service> → /services/<slug>
     3. <service> (optional) → /services/<slug>
   - Other Sano services available in the area: <yes / list / no>

2. Operational truth sentence
   (One sentence Sano can stand behind locally, without inventing job
   counts or recurring client clusters. Used verbatim or near-verbatim
   in the intro section.)
   <e.g. "This part of Auckland is within Sano's normal service area,
   with the same team and standards as anywhere else Sano works.">

3. Property mix observation
   (Cautious, observable-from-the-street wording. Used verbatim in the
   intro section's opening sentence. Must not include demographics,
   property values, or any claim Mike can't stand behind.)
   <e.g. "<Suburb> has a mix of <observable property types>, so
   cleaning needs can vary…">

4. Route placement
   (Confirmed: /service-area/<slug> at
   src/app/(public)/service-area/<slug>/page.tsx — same as Mount Eden.
   Override only if there's a reason.)
   <confirmed / override and explain>

5. Hero image
   (Pilot default is /images/heroes/regular-house-cleaning-hero.jpg —
   reused from regular-cleaning service page. Confirm reuse, or supply
   a suburb-specific image path that exists in /public/images/.)
   <confirmed / new path>

6. Intro section image
   (Pilot default for Mount Eden is /images/herne-bay-residential.jpg.
   Confirm reuse, or supply a different existing image path.)
   <confirmed / new path>

7. Hero wording (locked by Mike before drafting)
   Eyebrow:  <Suburb> cleaning services
   Title:    <use-case-led, suburb-free, ends with full stop>
   Subtitle: <one sentence, suburb name appears at most once>

8. Meta description (locked by Mike before drafting)
   <≤155 chars, mentions suburb + services without local-presence claims>

9. Property-type cards
   (Mount Eden used 4: older homes / apartments / rentals / workplaces.
   For this suburb, list the 4 that fit the actual property mix.
   Supply-side wording — describe how Sano approaches each type, not
   what Sano has done with them locally.)
   - Card 1: <title> — <one-line body>
   - Card 2: <title> — <one-line body>
   - Card 3: <title> — <one-line body>
   - Card 4: <title> — <one-line body>

10. Nearby suburbs already live as their own pages
    (Used for the nearby-suburb internal-link block. Skip on the first
    page in a region; retrofit later when ≥3 siblings exist.)
    <list / none yet>

11. Suburb-specific Do-not-claim additions
    (Beyond Mount Eden pilot spec §8's locked list. Anything unique to
    this suburb that operators must not claim — e.g. for Takapuna:
    "no short-stay / Airbnb specialisation claims unless Sano actually
    runs that book of work locally".)
    <list / none>
```

---

## Part D — Standard build/review workflow

Five stages per suburb, mapping to the existing agents. Each stage has a clear entry condition and exit gate.

### Stage 1 — Planning

**Entry:** Mike has completed the Part C research brief for the suburb.
**Action:** Invoke `sano-suburb-page-planner` with the brief + the suburb name.
**Output:** Planner returns `proceed` / `proceed after Mike confirms details` / `defer` / `reject as too thin`.
**Exit gate:** `proceed` verdict. Otherwise resolve the planner's open questions and re-run.

### Stage 2 — Draft

**Entry:** Planner returned `proceed`.
**Action:** Draft the suburb page by copying `src/app/(public)/service-area/mount-eden/page.tsx` and substituting:
- Hero strings (from Part C item 7)
- Intro property-mix sentence (from Part C item 3)
- Intro image (from Part C item 6)
- Services-grouped section (drop categories if the suburb's mix doesn't include all 7 — per Mount Eden pilot spec §11 "Keep flexible per-suburb")
- Property-type cards (from Part C item 9)
- Meta title + description (from Part C item 8)
- Schema name + description (suburb-substituted)

**Hard stops:** no new shared components, no edits to `src/lib/service-areas.ts`, no edits to parent `/service-area/page.tsx`, no dynamic `[slug]` route, no `SuburbChecker` mount, no nearby-suburb links until ≥3 sibling pages in the region.

**Exit gate:** `npx tsc --noEmit` clean + `npx next lint` 0 errors on the new file.

### Stage 3 — Reviewer pipeline (parallel)

**Entry:** Draft compiles and lints clean.
**Action:** Run all four reviewer agents in parallel, briefing each with the new page + the Part C brief:
1. `sano-copy-reviewer` — enforces `SANO_COPY_RULES.md` + Mount Eden pilot spec §8 Do-not-claim list + Part C item 11 suburb-specific additions.
2. `sano-thin-content-guard` — flags template-swap risk, unsupported local claims, suburb-name-swap SEO patterns.
3. `sano-visual-reviewer` — static check on palette, type, spacing, mobile-fold-down, image proportions match the pilot's `1.2fr / 0.8fr` intro pattern.
4. `sano-scope-guard` — confirms diff is the one new file only, no out-of-scope touches.

**Exit gate:** all four pass (or pass-with-notes that are wording/visual judgement calls). `scope-fail` or `revise-before-publish` from any reviewer blocks until resolved.

### Stage 4 — PR + visual review

**Entry:** Reviewer pipeline green.
**Action:** Open a PR using the Sano workflow (`/sano-ship` or manual `gh pr create` per `feedback_pr_branch_hygiene` — feature branch off latest `origin/main`, rebased clean). Title: `Add <Suburb> service area page`. PR body covers route, scope, reviewer pipeline results, visual review checklist (per Mount Eden PR #181 / #182 pattern).

**Exit gate:** Mike approves the deploy preview visually. Mount Eden took three visual-review iterations on PR #181 + one more on PR #182 — early suburbs may take 2–3 too; later suburbs should converge faster as the template stabilises.

### Stage 5 — Merge + post-merge

**Entry:** Mike approves the deploy preview.
**Action:** Merge via `gh pr merge --merge --delete-branch`. Confirm local main fast-forwards. Confirm production deploy starts.

**Post-merge:** If the suburb completes a regional cluster (≥3 sibling pages now live), open a follow-up PR to retrofit the nearby-suburb internal-link block onto the earlier pages in that region.

### Decision points where Mike intervenes (summary)

| When | What Mike does |
|---|---|
| Before Stage 1 | Fills Part C research brief |
| End of Stage 1 | Confirms `proceed` verdict or resolves planner's open questions |
| Mid-Stage 2 | If reviewer pipeline flags spec drift mid-draft, Mike confirms whether to amend the brief or revert the drift |
| End of Stage 4 | Visual review on deploy preview — go / iterate |
| End of Stage 5 | (optional) Decides whether to retrofit nearby-suburb links if a regional cluster just hit 3 |

---

## Part E — When (if ever) to create a reusable suburb-page component or dynamic route

The Mount Eden pilot spec §10 explicitly defers this: *"Do not create a reusable suburb-page generator yet. Build Mount Eden as the pilot first, then review the pattern before abstracting anything."*

That instruction still stands. Here is the trigger-condition framework for when it stops standing:

### Trigger A — Reusable suburb-page component

**Don't abstract until at least:**

1. **≥5 suburb pages have shipped** following the Mount Eden pilot pattern.
2. **At least 2 different regions** are represented (e.g. Mount Eden + Epsom + Takapuna at minimum).
3. **At least 1 suburb has tested a service-mix variant** — e.g. commercial-led instead of residential-led (Manukau or Takapuna would be candidates).
4. **The visual review iteration count has converged** — the last 2–3 suburb pages should have needed ≤1 visual-review iteration each. If iterations are still surfacing structural feedback, the pattern isn't stable yet.

If all four trigger conditions are met, the abstraction worth building is:

```tsx
// src/app/(public)/service-area/_components/SuburbPage.tsx
export interface SuburbPageProps {
  meta: { title: string; description: string }
  hero: { eyebrow: string; title: string; subtitle: string }
  intro: { body: string[]; imageSrc: string; imageAlt: string }
  services: { home: ServiceLink[]; propertyWorkplace: ServiceLink[]; specialist: ServiceLink[] }
  propertyTypes: PropertyTypeCard[]  // exactly 4
  schemaDescription: string
  closingLinks: { suburbAnotherHref: string; guaranteeHref: string; faqHref: string }
}
```

Each suburb page becomes a thin shell:

```tsx
// src/app/(public)/service-area/<slug>/page.tsx
export default function SuburbPage() {
  return <SuburbPage {...EPSOM_CONFIG} />
}
```

Per-suburb config files (one per suburb) keep the Part C brief contents in code-shape. Reviewers and Mike still verify each new config; the structural drift surface drops to near zero.

**Don't build this earlier.** Pre-abstracting before 5 pages exist locks in pattern decisions that may need to flex during the next 2–3 suburbs.

### Trigger B — Dynamic `[slug]` route

**Don't introduce until at least:**

1. **All four Trigger A conditions are met**, AND
2. **≥10 suburb pages have shipped** and the per-suburb config-driven pattern is stable, AND
3. **A clear maintenance cost has appeared** — e.g. site-wide schema changes need to be repeated across 10+ config files, or per-page metadata is genuinely identical to the config and the config-file-per-suburb is now busywork.

If all three trigger conditions are met, the route becomes:

```
src/app/(public)/service-area/[slug]/page.tsx
src/lib/service-area-content.ts  // data per slug
```

`generateStaticParams()` builds one page per active slug from `SERVICE_AREAS`.

**This is later than people expect.** Mike's instinct on the Mount Eden pilot was right: a dynamic route built too early locks in template-swap thinking. Static-file-per-suburb keeps each one editable by hand for the first ~10 suburbs, which is exactly the right amount of friction for a content-quality-sensitive surface.

### Trigger C — Never (caveats)

- **Per-suburb Schema.org `Place` markup.** Stay at Auckland-level `City` `areaServed` indefinitely. The suburb signal lives in the URL slug, title tag, H1, and headings. Suburb-level `Place` markup invites scrutiny that Sano's actual local-presence story can't yet support.
- **Reusable property-type-card library.** The 4 property-type cards on Mount Eden (Older homes / Apartments / Rentals / Workplaces) shouldn't become a reusable set. Each suburb's property-type cards need to reflect that suburb's actual mix. A shared library invites template-swap.
- **A "suburb page generator" CLI / agent that creates pages without per-suburb Mike input.** The whole pilot pattern's value is operator-confirmed local input. Automating page creation without that input is the failure mode the entire `sano-suburb-page-planner` agent is designed to prevent.

---

## Summary

| Item | Recommendation |
|---|---|
| Next 3 suburbs (in order) | **Takapuna → Manukau → Epsom** — tests pattern flexibility across regions before back-filling clusters |
| Next 6–10 suburbs | Stage 1 (Takapuna/Manukau/Epsom) → Stage 2 (Grey Lynn/Kingsland/Ponsonby, completing Central cluster) → Stage 3 (one each from remaining regions) |
| Per-suburb input | Part C research brief, completed by Mike, before invoking planner |
| Per-suburb workflow | 5 stages (plan → draft → 4-agent review pipeline → PR + visual review → merge + cluster retrofit) |
| Reusable component | Build only after ≥5 suburb pages shipped + 2+ regions tested + service-mix variant tested + visual-review iterations have converged |
| Dynamic `[slug]` route | Build only after reusable component is stable + ≥10 suburb pages shipped + clear maintenance cost emerges |
| Pause points | After Stage 1 (3 suburbs live) — review whether template held across regions before mechanical fill-in |
| Hard "never" | Per-suburb `Place` schema, reusable property-type-card library, automated page generation without per-suburb Mike input |

---

## Open questions for Mike

None of these block this plan; all of them are needed before Stage 1 starts:

1. **Takapuna service emphasis** — is commercial / office cleaning genuinely a top-3 service for Takapuna enquiries, or is the page still residential-led with commercial as secondary? (Drives whether the grouped services section foregrounds commercial.)
2. **Manukau scope** — does "Manukau" here mean the suburb (postcode 2104) only, or are we using it as shorthand for the wider Manukau region? (Drives whether one page or eventually multiple pages.)
3. **Operational truths per suburb** — Mike supplies one sentence per suburb before the planner runs. Suggested cadence: Mike writes operational-truth sentences for all 3 Stage 1 suburbs in one sitting, then Stage 1 runs back-to-back.
4. **Property-mix observations per suburb** — same as above. One observable-from-the-street sentence per suburb, written by Mike, not the planner.
5. **Hero / intro image budget** — does Sano have suburb-specific photography for any of the three Stage 1 suburbs, or do all of them reuse the pilot defaults (`regular-house-cleaning-hero.jpg` + `herne-bay-residential.jpg`)?
6. **Pause point check** — does Mike want a sit-down review after Stage 1 (3 suburbs) before queueing Stage 2, or proceed mechanically through Stage 2 if Stage 1 goes well?

---

## What this plan does NOT do

- Does not create any pages
- Does not create any routes
- Does not edit application code
- Does not create a reusable suburb-page generator
- Does not create a dynamic `[slug]` route
- Does not invent property-mix or service-emphasis claims for any of the three suburbs — every such observation above is marked as `needs Mike's verification`
- Does not commit anything

Held for Mike's review.
