# Homepage + Service-page Hero Review

> **Status:** planning / review only. No code changes yet.
> **Date:** 2026-05-19
> **Owner:** Public-site audit, post Phases 1-3 + 5 + C-1 (PRs #146-#151)
> **Doc location:** matches the documented `docs/superpowers/specs/YYYY-MM-DD-*.md` convention in CLAUDE.md. The user-suggested `docs/public-site/` folder doesn't exist; placing this alongside other recent specs (`2026-05-12-quote-amendment-lifecycle.md`, `2026-05-12-portal-review-and-stabilisation-design.md`) keeps the review pattern consistent and discoverable. No new docs folder created.

---

## 1. Scope reviewed

| Surface | File | What was checked |
|---|---|---|
| Homepage hero | `src/components/HomeHero.tsx` | Headline, eyebrow, subtext, CTA, image source, trust signals, mobile sizing |
| Homepage first screen below hero | `src/app/(public)/page.tsx` "Why Auckland Chooses Sano" | Section image, copy, position |
| Service-page hero pattern | `src/components/HeroSection.tsx` + 7 service pages | Shared component, per-page headline/subtext/imageUrl |
| Header CTA | `src/components/Header.tsx` | Sticky top-bar phone + main "Get a Quote" button |
| All CTAs site-wide | grep across `src/` | Wording consistency |
| Available imagery | `public/images/` + `public/brand/` | What real Sano assets exist vs stock |

Surfaces explicitly out of scope: About page, suburb pages, portal, blog, contact page form.

---

## 2. Current above-the-fold state

### Homepage hero (`HomeHero.tsx`)

```
Eyebrow:     "Auckland Cleaning Services, Done Properly"
Headline:    "Clean spaces that feel better to be in."
Subtext:     "Sano means healthy. That's how we approach cleaning.
              Not just how a space looks, but how it feels. Fresh,
              consistent, and properly cared for."
Support:     "Residential and commercial cleaning across Auckland."
CTA:         "Request a Quote" (single button, white pill on dark)
Trust row:   (none above the fold — phone number lives in top-bar above the hero)
Image:       Unsplash photo-1600585154340-be6161a56a0c (stock, not Sano)
Hero height: 560px fixed
```

### Service-page hero (`HeroSection.tsx`, shared)

```
Headline:    <service-specific>, e.g. "Regular House Cleaning in Auckland"
Subtext:     <service-specific>
CTA:         "Get a Free Quote" (primary, white pill) + "Our Services" (ghost)
Trust row:   (none)
Image:       per-page imageUrl, full-bleed background, dark sage overlay
Min height:  520px
```

### CTA wording inventory (entire codebase)

Four different labels in active use:

| Label | Locations | Count |
|---|---|---|
| `Get a Free Quote` | `QuoteButton` default; service-area page; SuburbChecker; `CtaBanner` (default headline subtext) | majority of CtaBanners |
| `Get a Quote` | Header (desktop + mobile), inline buttons on all 7 service pages | 9 places |
| `Get a Quote →` | `QuickQuoteBar` | 1 |
| `Request a Quote` | `HomeHero` only | 1 |

The single biggest CTA inconsistency is that the **homepage hero** uses the weakest, most non-committal label (`Request a Quote`), while the Header, in-page buttons, and CtaBanners all use stronger labels.

---

## 3. Findings against the brief

### 3.1 Headline clarity — partial pass

**Current:** "Clean spaces that feel better to be in."

Pros:
- On-brand, distinctive, emotional. Reinforces the "Sano = healthy" positioning.
- Has been in place long enough to function as a known brand line.

Cons:
- Doesn't tell a first-time visitor WHO this is for, WHAT service is offered, or WHERE Sano operates.
- The actual specifics (residential + commercial, Auckland) are hidden in the support line at the very bottom of the hero content stack (eyebrow → headline → subtext → support line) and rendered in 50% white opacity, which makes them easy to miss.

The "3-second test" doesn't pass cleanly today: a visitor scanning the hero learns the brand voice but has to read all the way to the support line to learn what Sano sells.

### 3.2 Service clarity — fail above the fold

The fact that Sano does **both residential and commercial** is buried in the 8.125px (`text-[0.8125rem]`) support line at the bottom of the hero content, in `text-white/50`. On most monitors and on every mobile device, this is the lowest-contrast, smallest text in the hero — exactly where a visitor is least likely to read it.

### 3.3 Trust signals — fail above the fold

The hero has **zero trust signals**. The phone-number top-bar above the hero (`0800 726 686`) is the only trust cue. The four trust badges added to the Footer in PR #148 (`Insured`, `Vetted teams`, `Auckland-wide`, `Satisfaction guarantee`) don't surface anywhere near the hero. Specifically missing:
- No "Insured" badge
- No "Vetted teams" badge
- No "20+ years" mention (this IS in the body copy further down the page in the "Why Auckland Chooses Sano" section, but not above the fold)
- No "Auckland-wide" pill

### 3.4 CTA clarity — significant gap

The HomeHero CTA reads **"Request a Quote"**. This is the weakest of the four variants in use site-wide:
- "Request a Quote" implies a hoop to jump through.
- "Get a Quote" is more direct.
- "Get a Free Quote" adds the price-anchor reassurance + matches the actual offer ("Free quotes" appears in homepage and root metadata).

The audit's recommendation stands: **standardise on "Get a Free Quote"** as the single primary CTA across all surfaces. Costs nothing, removes a friction word.

### 3.5 Image trust — stock imagery still in 4 places

Two homepage stock images and two service-page stock heroes:

| Surface | Current image | Real or stock? |
|---|---|---|
| Homepage hero | `https://images.unsplash.com/photo-1600585154340-be6161a56a0c` | **Stock (Unsplash)** |
| Homepage "Why Auckland Chooses Sano" section image | `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6` | **Stock (Unsplash)** |
| Regular Cleaning hero (page + services.ts data) | `https://images.unsplash.com/photo-1631679706909-1844bbd07221` | **Stock (Unsplash)** |
| Commercial Cleaning hero (page + services.ts data) | `https://images.unsplash.com/photo-1497366754035-f200968a6e72` | **Stock (Unsplash)** |
| Deep Cleaning, End-of-Tenancy, Carpet, Window, Post-Construction heroes | `/images/<service>.jpg` | **Unconfirmed**; named after services but extension + naming pattern differs from clearly-Sano `*.jpeg` files. Need user confirmation. |

### 3.6 Available real Sano imagery in `public/images/`

Files following the `sano-`/`Sano-` naming convention with `.jpeg` extension look like the actual Sano photoshoot:

- `Sano-crew-auckland.jpeg` (418 KB, 2026-04-24)
- `sano-auckland-team.jpeg` (428 KB, 2026-04-14) — already used as the right-side image on the End-of-Tenancy page
- `sano-commercial-clean-auckland.jpeg` (460 KB, 2026-04-14) — natural candidate for the Commercial service hero
- `cleaning-shot-2.jpeg` (442 KB, 2026-04-14) — already used on the End-of-Tenancy page
- `cleaned-by-sano.jpg` (778 KB, 2026-04-24) — naming suggests real, larger file
- `executive-summary.jpg`, `proposal-banner.jpg` — labelled for internal proposal use

**Gap:** there's no clearly-labelled real Sano image suitable for the **homepage hero** (full-bleed, residential-feeling, hero-quality). The `Sano-crew-auckland.jpeg` could work depending on framing. The `sano-commercial-clean-auckland.jpeg` is well-suited for the Commercial service hero. The `sano-auckland-team.jpeg` is already in use on End-of-Tenancy.

### 3.7 Mobile first screen — short on info

On a typical mobile viewport (375x667), the hero takes the entire first screen at its 560px fixed height. The visitor sees:
- 9px sticky top bar with the 0800 number (small but readable)
- 80px white header strip with the Sano logo + hamburger
- The hero image with overlay, content roughly centred vertically:
  - Eyebrow (small, 50% opacity white) — likely missed at a glance
  - Headline (clamps down to ~32px on mobile via `clamp(2rem, 4vw, 2.75rem)`)
  - Subtext (~16px white/80)
  - Support line (~13px white/50) — easy to miss
  - "Request a Quote" CTA pill

The visitor learns the brand voice ("Sano means healthy", "clean spaces that feel better"), gets the 0800 number, and gets a CTA. They do NOT clearly learn that Sano does commercial work, that Sano is insured, that there are 20+ years of experience, or what suburbs are served. To find any of that they have to scroll past the entire hero into the "Why Auckland Chooses Sano" section.

For an Auckland-local quick-decision visitor on mobile ("I need a cleaner this week"), the hero answers "what's this brand?" but doesn't answer "should I trust them with my home?". That's the conversion gap.

### 3.8 Service-page heroes — adequate but unbranded

Service heroes do their job — clear service-specific headline, clear subtext, two CTAs (primary white + ghost). The full-bleed background image with the dark sage overlay reads well. No trust signals on these heroes either, but the page-level content shipped via PR #150 already covers the differentiation and the trust message lower down. **Lower priority than the homepage hero.** Worth fixing the two stock-image heroes (Regular + Commercial) when assets are available, but no copy intervention needed.

---

## 4. Recommended hero copy directions

Three options. **At least one preserves the existing brand line** per the brief.

### Option A — Preserve brand line, fix everything around it (minimal-change, recommended for first iteration)

```
Eyebrow:    "Cleaning Across Auckland"
Headline:   "Clean spaces that feel better to be in."     ← unchanged
Subtext:    "Residential and commercial cleaning by insured,
             carefully vetted teams. The same standard every visit."
CTA:        "Get a Free Quote"
Trust row:  ✓ Insured  ·  ✓ Vetted teams  ·  ✓ Auckland-wide  ·  ✓ Satisfaction guarantee
            (small pill row, sage-tinted, sits below the CTA;
             same visual language as the Footer trust badges)
```

**Trade-off:** keeps the emotional brand line intact (preserves the recognised tone). Loses the existing eyebrow's "Done Properly" claim (slightly defensive anyway). The current "Sano means healthy" line gets demoted — it could live in the "Why Auckland Chooses Sano" section instead.

### Option B — Specifics-first (closest to the user's suggested direction)

```
Eyebrow:    "Auckland Cleaning"
Headline:   "Reliable cleaning for homes, offices, and rentals."
Subtext:    "Insured and carefully vetted Sano teams. Clear quotes.
             The same standard every visit. Across Auckland."
CTA:        "Get a Free Quote"
Trust row:  ✓ Insured  ·  ✓ Vetted teams  ·  ✓ Auckland-wide  ·  ✓ Satisfaction guarantee
```

**Trade-off:** answers the "who/what/where" question instantly. Drops the "Clean spaces that feel better to be in." brand line from the hero (could be repositioned elsewhere on the page or in the Footer/About). More commercially direct, less emotionally distinctive.

### Option C — Brand line as headline, user's direction as subtext (hybrid)

```
Eyebrow:    "Residential and commercial cleaning across Auckland"
Headline:   "Clean spaces that feel better to be in."     ← unchanged
Subtext:    "Insured, carefully vetted Sano teams. Reliable service,
             clear quotes, and spaces properly cared for."
Support:    "Homes, offices, rentals, end-of-tenancy."
CTA:        "Get a Free Quote"
Trust row:  ✓ Insured  ·  ✓ Vetted teams  ·  ✓ Auckland-wide  ·  ✓ Satisfaction guarantee
```

**Trade-off:** preserves brand line AND adopts the user's suggested direction as the subtext. The eyebrow takes on the "where + what" disambiguation work, freeing the headline to be emotional. Loses the "Sano means healthy" beat (worth reusing elsewhere).

### Recommended

**Option A first** for a Phase 6 PR (minimal-change, ships immediately, preserves the brand line). Path to Option C later if you want a stronger answer to the service-breadth question in the eyebrow. Option B is the boldest but burns the existing brand line — only worth doing if you've decided to evolve the brand tone, which is a bigger conversation than this PR.

All three options:
- Reuse the existing Footer trust-badge component pattern (✓ pill style, sage-tinted).
- Use "Get a Free Quote" as the standard CTA.
- Preserve the existing 560px hero height + Framer Motion animation pattern.
- Need NO new images to ship.

---

## 5. Image asset gaps

To fully replace the 4 stock images:

| Stock image to replace | Recommended source | Available now? |
|---|---|---|
| Homepage hero | A real Sano residential or hybrid res/commercial shot, wide aspect, brightly lit, person ideally in frame or implied | **No** — `Sano-crew-auckland.jpeg` might work depending on framing/aspect, but worth a quick visual check. Otherwise needs a new shoot or a curated frame from existing assets. |
| Homepage "Why Auckland Chooses Sano" section image | A real Sano work shot — close-up of clean surface, person cleaning, or finished room | **Probably yes** — `cleaning-shot-2.jpeg` or `cleaned-by-sano.jpg` are candidates; visual review needed. |
| Regular Cleaning hero (Unsplash) | Real Sano residential clean shot | **Unconfirmed** — `sano-auckland-team.jpeg` is already in use on End-of-Tenancy; reusing it would be repetitive. Needs a different real shot. |
| Commercial Cleaning hero (Unsplash) | `sano-commercial-clean-auckland.jpeg` | **Yes, exact match** — file is named for this purpose. |

**Lowest-friction image swap:** Commercial Cleaning hero. Real asset exists and is named for the purpose. Can ship today with zero new asset gathering.

**Highest-value image swap:** Homepage hero. Needs a confirmed real-Sano hero-quality image; recommend gathering before the homepage hero PR.

---

## 6. Recommended PR plan

Three small PRs, ordered by what unblocks the most value with the least dependency on new assets.

### PR 1 — Homepage hero copy + trust signals + CTA standardisation
**Scope:**
- Apply Option A (or whichever option you approve) to `HomeHero.tsx`. Copy + structure changes only.
- Add the 4-badge trust row below the CTA in the hero.
- Standardise the CTA label: replace `"Request a Quote"` (HomeHero), `"Get a Quote"` (Header × 2), and `"Get a Quote →"` (QuickQuoteBar) with `"Get a Free Quote"`. This brings every primary CTA on the public site to a single consistent wording.
- Touches: `HomeHero.tsx`, `Header.tsx`, `QuickQuoteBar.tsx`. No image changes.
**Risk:** low — copy + JSX-additive only.
**Asset blockers:** none.

### PR 2 — Replace Commercial service hero stock image (asset already exists)
**Scope:**
- Change `imageUrl` in `commercial-cleaning/page.tsx` from the Unsplash URL to `/images/sano-commercial-clean-auckland.jpeg`.
- Change `heroImage` + `cardImage` in `services.ts` for the `commercial-cleaning` entry to match.
- Touches: 2 files, ~4 lines.
**Risk:** zero — one-for-one image swap with a clearly-labelled real Sano asset.
**Asset blockers:** none.

### PR 3 — Replace remaining stock imagery (homepage hero + section + Regular hero)
**Scope:**
- Replace the homepage hero Unsplash with a real Sano image.
- Replace the "Why Auckland Chooses Sano" section Unsplash with a real Sano image.
- Replace the Regular Cleaning hero Unsplash with a real Sano image.
- Update `services.ts` `heroImage`/`cardImage` for `regular-cleaning` to match.
**Risk:** low if assets are confirmed Sano-real; medium if aspect/crop don't match the current 560px wide-aspect hero.
**Asset blockers:** **3 confirmed real Sano hero-quality images.** Best path: you (Mike) review the existing `public/images/Sano-*.jpeg` candidates and either approve them in place, or supply 3 new images sized appropriately (≥ 1600px wide).

### PR 4 — (optional) Service-page hero polish
**Scope:** unify any inconsistent hero subtext, add a small trust row to service hero matching the homepage if desired.
**Risk:** low.
**Asset blockers:** none.
**Recommendation:** **skip unless the homepage hero PR (PR 1) lands and you decide trust signals on service heroes would help conversion further.** Probably a Phase 7 or later concern.

---

## 7. Decisions needed before PR 1 can start

1. **Hero copy direction** — Option A (preserve brand line, recommended), Option B (specifics-first), or Option C (hybrid)?
2. **Trust badge wording** — confirm the 4 labels (`Insured`, `Vetted teams`, `Auckland-wide`, `Satisfaction guarantee`) match what you want in the hero, OR whether to substitute the "Auckland-wide" pill for "20+ years" given the 20-years claim is currently supported elsewhere in the body copy.
3. **CTA label** — confirm `"Get a Free Quote"` as the single standard label across HomeHero + Header + QuickQuoteBar.
4. **Eyebrow** — Option A drops "Done Properly" and replaces with "Cleaning Across Auckland". Confirm or counter-propose.
5. **"Sano means healthy" line** — Option A removes this from the hero. Confirm it's OK to demote to the "Why Auckland Chooses Sano" body section (where it would naturally fit) rather than the hero.

## 8. Decisions needed before PR 2 can start

1. **Confirm `/images/sano-commercial-clean-auckland.jpeg` is the intended hero for the Commercial service page.** Visual review recommended (~30 seconds).

## 9. Decisions needed before PR 3 can start

1. **Homepage hero image** — provide a real Sano hero-quality image (≥1600px wide, residential-feeling, well-lit) OR approve one of the existing `public/images/Sano-*.jpeg` candidates as suitable.
2. **"Why Auckland Chooses Sano" section image** — provide or approve.
3. **Regular Cleaning hero image** — provide or approve.

---

## 10. What this review explicitly does NOT cover

- About page rewrite (Phase 4 from the original audit).
- Suburb-level landing pages (long-tail SEO, deferred).
- Blog topic clusters.
- Service-page-internal section reordering (template structure is fine).
- Portal, contractor portal, or any internal CRM surface.
- Live performance / Core Web Vitals review.
- Accessibility audit beyond the visible-text contrast note in §3.7.

---

## Appendix — current hero source for reference

`src/components/HomeHero.tsx` (paraphrased):
```
Eyebrow: "Auckland Cleaning Services, Done Properly"
Headline: "Clean spaces that feel better to be in."
Subtext (white/80): "Sano means healthy. That's how we approach cleaning.
                     Not just how a space looks, but how it feels.
                     Fresh, consistent, and properly cared for."
Support (white/50, 13px): "Residential and commercial cleaning across Auckland."
CTA: white pill, "Request a Quote", href /contact
Image: Unsplash photo-1600585154340-be6161a56a0c
Overlay: linear-gradient from dark-sage 88% on left to 5% on right
Height: 560px fixed, content vertically centred in left half
```
