# Public Site Layout + Spacing Review

> **Status:** planning / review only. No code changes yet.
> **Date:** 2026-05-19
> **Owner:** Public-site audit, post Phases 1-3 + 5 + C-1 + hero clarity (PRs #146-#152)
> **Doc location:** matches the documented `docs/superpowers/specs/YYYY-MM-DD-*.md` convention. A sibling spec from earlier today (`2026-05-19-homepage-hero-review.md`) covers hero/CTA/imagery; this one is the spacing/rhythm pass. Two specs from the same day with distinct slugs and topics keeps each focused and easy to find.

---

## 1. Scope reviewed

Every public page that's likely to be in active rotation, plus the shared components that control vertical rhythm:

| Surface | File |
|---|---|
| Homepage | `src/app/(public)/page.tsx` |
| HomeHero | `src/components/HomeHero.tsx` |
| Services index | `src/app/(public)/services/page.tsx` |
| 7 service pages | `src/app/(public)/services/*/page.tsx` |
| Service hero (shared) | `src/components/HeroSection.tsx` |
| About | `src/app/(public)/about/page.tsx` |
| Contact / quote stepper | `src/app/(public)/contact/page.tsx` |
| FAQ | `src/app/(public)/faq/page.tsx` |
| Guarantee | `src/app/(public)/guarantee/page.tsx` |
| Policies | `src/app/(public)/policies/page.tsx` |
| Service Area | `src/app/(public)/service-area/page.tsx` |
| Join Our Team (+ apply) | `src/app/(public)/join-our-team/page.tsx` + careers components |
| CtaBanner | `src/components/CtaBanner.tsx` |
| ProcessSteps | `src/components/ProcessSteps.tsx` |
| Global utility classes | `src/app/globals.css` |
| Header / Footer | already audited in earlier passes |

Out of scope per the brief: commercial proposal generator, portal, contractor portal, quote/invoice/job logic.

---

## 2. The global spacing system

All public pages compose from three custom Tailwind utilities defined in [src/app/globals.css](src/app/globals.css):

```css
.section-padding   { @apply px-4 sm:px-6 lg:px-8; }
.section-y         { @apply py-20 lg:py-24; }   /* 80px mobile, 96px desktop, BOTH sides */
.container-max     { @apply max-w-6xl mx-auto; }
```

`.section-y` is the rhythm unit. **80px top + 80px bottom on mobile, 96px + 96px on desktop = 160-192px of vertical padding per section.** This is the "stretched" feel: many pages stack 4-8 sections each using `section-y`, yielding 1100-1500px of pure padding before any content height.

Other recurring patterns observed across pages:

- **`gap-16 lg:gap-24`** on two-column grids (64-96px between columns on desktop). Used on the homepage Why-section AND every single service page's Intro / Features / Why-Sano / Process+FAQ blocks. This is the **primary horizontal "stretched" culprit** on wide viewports.
- **CtaBanner** uses `py-14 md:py-16` (56-64px) — **already tighter than `section-y`.** Good baseline reference.
- **HeroSection** (service-page shared) uses `min-h-[520px] + py-16 md:py-20` — already smaller than `section-y`.
- **Internal heading/body gaps** vary: `mb-14` (services index intro), `mb-10` (ProcessSteps), `mb-8` (most service-page section headings). The `mb-14` cases are the most visually wasted.

---

## 3. Findings

### 3.1 Likely root cause: global, not per-page

The "too stretched" feel is **primarily a global system issue**, not isolated to specific pages.

`section-y` at `py-20 lg:py-24` is the single biggest contributor. Any page stacking ≥4 `section-y` blocks (which is most of them) crosses the threshold where the visitor feels like they're scrolling through padding rather than content.

Evidence that the system can work with tighter values: the **Guarantee, Service Area, and Policies pages already use `py-10 md:py-14` or `py-12 md:py-16` deliberately**, and they read fine — even feel more efficient. These are existence proofs that tightening doesn't break the brand feel.

### 3.2 Per-page vertical density (worst to best)

| Page | Sections at full `section-y` | Estimated vertical padding alone |
|---|---|---|
| Service pages (×7, identical pattern) | 7-8 | ~1100-1500 px |
| Homepage | 4 (+ hero + CtaBanner at smaller padding) | ~700-900 px |
| Join Our Team | 4 components, mostly `py-20/24/28` | ~700-900 px |
| About | 3-4 (broken up by a full-bleed image, helps) | ~600 px |
| Guarantee | 4-5 at `py-10/12/14/16` (already compressed) | ~400-500 px |
| Service Area | 4-5 at `py-10/14` (already compressed) | ~400-500 px |
| Policies | 2 + parallax hero | ~400 px |
| FAQ | 2 (text-heavy accordion) | ~250 px |
| Contact | 2 (form-heavy) | ~250 px |
| Services index | 1 hero + CtaBanner | ~250 px |

**The worst offenders are the 7 service pages.** Same template, same problem, multiplied. Anything that improves them improves 7 surfaces at once.

### 3.3 The two-column gap is amplifying everything

`gap-16 lg:gap-24` on desktop creates **64-96 px of horizontal whitespace between the two columns**. Combined with `max-w-6xl` (1152 px) on `.container-max`, that means up to 96 px of "empty middle" splitting every two-column band on:

- Homepage Why-section
- Every service page's Intro, Features-vs-Image, Why-Sano, Process-vs-FAQ

When the section padding is also generous (`section-y`), the eye sees: **96 px above, 96 px below, 96 px between columns** — three large gaps boxing a band of content. That triple-cushioning is what reads as "stretched."

### 3.4 Internal heading-to-body spacing

`mb-14` (56 px gap between an intro heading and the body grid) on:
- `services/page.tsx:8` — intro paragraph to service grid: `mb-14`
- Homepage Services section: `mb-14` between heading-cluster and the grid

`mb-10` to `mb-8` elsewhere. The jump from heading to body in `mb-14` cases is the largest single intra-section gap on the site; reducing those alone helps without touching `section-y` at all.

### 3.5 CtaBanner is fine, ProcessSteps is fine

`CtaBanner` at `py-14 md:py-16` is **already the right rhythm** for a trailing CTA. The visual weight of the dark-sage band balances the smaller padding. Leave it.

`ProcessSteps` uses `section-y` for the outer wrapper but tight internal `gap-6` between cards. Internal grid is fine. Outer wrapper would shrink under any global change to `section-y`.

### 3.6 Mobile assumptions

`.section-y` becomes `py-20` (80px) on mobile (`lg:` breakpoint is 1024px). On a 667-px-tall mobile viewport, 80 px top + 80 px bottom = 160 px per section, which is **24%** of the viewport height per section. Scroll cost is real on mobile — tightening `section-y` to `py-14` mobile / `py-18` desktop would reduce that to ~17%, much more efficient for thumb-scrolling.

---

## 4. Recommended spacing principles

The brand reads "clean, professional, detail-focused" — that doesn't require generous padding everywhere. Specific surfaces benefit from generous space (heroes, before/after sections, single-image showcases). Listing surfaces and dense content blocks don't.

**Recommended scale (not yet applied):**

| Use | Current | Proposed | Net change |
|---|---|---|---|
| Standard section vertical rhythm (`section-y`) | `py-20 lg:py-24` (80/96) | `py-14 lg:py-18` (56/72) | -24px mobile, -24px desktop per side |
| Two-column grid gap | `gap-16 lg:gap-24` (64/96) | `gap-10 lg:gap-14` (40/56) | -24px mobile, -40px desktop |
| Intro-to-grid heading gap (homepage / services index) | `mb-14` (56) | `mb-8` or `mb-10` (32-40) | -16-24px |
| Hero min-heights | unchanged | unchanged | — |
| CtaBanner | `py-14 md:py-16` | unchanged | — (already right) |
| Compact-style pages (Guarantee / Service Area / Policies) | already at `py-10/12/14/16` | leave alone | — (already correct rhythm) |

Net effect on a typical service page: section-y change saves ~48 px × 8 sections × 2 sides = **~768 px of pure padding shaved per page**, plus the gap change pulls two-column bands ~40 px closer horizontally. Page-shrink wins without any content edits.

### Where to keep generous space (do NOT compress)

- **HomeHero** — full-bleed hero at 560 px fixed; visually anchors the homepage. Leave.
- **HeroSection** (service pages) — `min-h-[520px]` is purposeful; the dark sage overlay needs room. Leave.
- **About page full-bleed image** — currently `h-72 lg:h-[28rem]`. Big visual break is doing work. Leave.
- **Policies parallax hero** — the 500 px min-height + parallax effect is a design beat. Leave.
- **Footer** — visual weight at the page end is intentional. Leave.

---

## 5. Quick wins (lowest risk first)

| # | Change | Files | Risk | Visible impact |
|---|---|---|---|---|
| 1 | `mb-14` → `mb-10` on the 2 intro-to-grid heading clusters | `(public)/page.tsx`, `(public)/services/page.tsx` | Very low (single value, 2 spots) | Tightens intro→grid jump |
| 2 | `gap-16 lg:gap-24` → `gap-10 lg:gap-14` on the homepage Why-section + 7 service pages (Intro, Features, Why-Sano, Process+FAQ) | 8 files, ~32 spots | Low | Horizontal compression on desktop; major visual improvement |
| 3 | `.section-y` from `py-20 lg:py-24` → `py-14 lg:py-18` in `globals.css` | 1 file, 1 line | Medium | Affects every page using `section-y`; biggest impact |
| 4 | Trim internal `mb-*` values where redundant (case-by-case) | Various | Low | Targeted cleanup |
| 5 | Service-page hero `min-h-[520px]` → `min-h-[460px]` | `HeroSection.tsx` | Low | Lifts content closer to viewport top on service pages |

---

## 6. Recommended implementation phases

Three small PRs, ordered by risk/reward:

### PR 1 — Tighten grid column gaps and intro-to-grid gaps (~10 files, ~33 edits)
**Branch:** `feat/public-spacing-grid-gaps`
**Scope:**
- Replace `gap-16 lg:gap-24` with `gap-10 lg:gap-14` across:
  - `src/app/(public)/page.tsx` (Why section)
  - All 7 service pages (Intro / Features / Why-Sano / Process+FAQ blocks — 4 spots × 7 = 28)
- Replace `mb-14` with `mb-10` on:
  - `src/app/(public)/page.tsx` services-section heading cluster
  - `src/app/(public)/services/page.tsx` intro paragraph
**Risk:** Low. No new components. No layout structure change. Each line is a single Tailwind class swap. Easy visual rollback.
**Why first:** highest visible "tightness" win per line changed. Doesn't touch the global `.section-y` so changes are contained per-page and easy to evaluate on Netlify preview before committing to the global change.
**Expected outcome:** Two-column bands on the homepage and service pages no longer feel "split down the middle"; horizontal balance improves on desktop especially.

### PR 2 — Tighten global `section-y` (1 file, 1 line)
**Branch:** `feat/public-spacing-section-y`
**Scope:**
- `src/app/globals.css`: `.section-y { @apply py-14 lg:py-18; }` (was `py-20 lg:py-24`)
**Risk:** Medium. Touches every page that uses `section-y`. Could regress one specific page's intended balance if a section relied on tall padding to space against an oversized neighbour.
**Why second:** lets you see the PR 1 result first and decide whether further tightening is needed. If PR 1 alone reads well, you can park this. If pages still feel stretched after PR 1, PR 2 closes the gap.
**Expected outcome:** Every page ~768px shorter total. Pages with 7-8 sections (service pages) feel meaningfully more efficient.

### PR 3 — Service-page hero min-height + per-page leftovers (small)
**Branch:** `feat/public-spacing-hero-minheight`
**Scope:**
- `src/components/HeroSection.tsx`: `min-h-[520px]` → `min-h-[460px]`
- Spot-fix any `mb-*` or `space-y-*` that looks loose after PR 1 + PR 2 land.
- (Optional) Tighten Join Our Team's `py-20 lg:py-28` on `CareersHero` to match the new rhythm.
**Risk:** Low. Hero min-height is a single number on a single shared component.
**Why third:** these are polish-pass tweaks. The HeroSection min-height change in particular only makes sense once `section-y` is already tighter — otherwise the hero feels disconnected from the section below.

---

## 7. Risks and things to be careful of

1. **Don't compress all pages uniformly.** Guarantee, Service Area, Policies, FAQ, Contact, and the Services index already use deliberately smaller padding. PR 2's global `section-y` change will NOT touch them (they don't use `section-y` in those sections), but worth visually confirming on preview that they still look balanced after PR 1's grid-gap changes.
2. **Don't touch hero heights without a section-y change in flight.** A shorter hero against a tall section feels off; compressing the hero only makes sense if the section below is also compressed.
3. **Component-level guardrails.** `CtaBanner` and `ProcessSteps` are well-balanced today. Don't compress them as part of this work.
4. **About page's full-bleed image** is doing real visual work — don't replace it with a thinner band as part of spacing cleanup. That's a separate decision tied to the image-provenance review (real photo needed first).
5. **Don't redesign.** No new components, no grid restructures, no font-size changes. Pure padding/margin/gap value reductions.
6. **Don't pile multiple changes into one PR.** Per the brief: small focused PRs.
7. **Mobile/desktop balance.** Some sections feel okay on desktop and crowded on mobile, or vice versa. The proposed `py-14 lg:py-18` keeps the mobile/desktop ratio similar (-22%/-25%). Verify on a real mobile viewport, not just DevTools.

---

## 8. What this review does NOT cover

- **Image asset replacement** — handled in `2026-05-19-homepage-hero-review.md` and its appended Image Provenance Notes. Image changes are paused awaiting real Sano photography.
- **Typography sizing / line-heights** — the existing `clamp()` headline scales are fine and out of scope.
- **Colour / contrast adjustments** — out of scope.
- **Component-internal restructures** (Header dropdowns, mobile nav, etc.) — out of scope; this is purely padding/margin/gap.
- **Service-page content reorganisation** — the audit already addressed copy in PRs #146-#152; structure stays the same.
- **About / Join Our Team rewrites** — content work is blocked on real photography; structure stays.
- **Commercial proposal generator, portal, contractor portal** — out of scope by the brief.

---

## 9. Decisions needed from Mike before starting PR 1

1. **Approve the proposed scale.** `py-14 lg:py-18` for `section-y` and `gap-10 lg:gap-14` for two-column grids — call out any value to adjust before implementation.
2. **Pre-approval for PR 1 + PR 2 as a pair, or strictly one-at-a-time?** Recommendation: ship PR 1, view on production, then decide PR 2. Avoids over-correcting.
3. **Service-page hero min-height (PR 3) — fold into PR 2's branch or keep separate?** Either is fine; separate is safer per the "small focused PRs" preference.
4. **Confirm `CtaBanner` and `ProcessSteps` stay as-is.** Recommended — both are already at sensible rhythms.

---

## 10. First recommended PR

**PR 1 — Tighten grid column gaps and intro-to-grid gaps.**

- 8 files touched, ~33 single-class swaps.
- Pure visual compression, no structural change.
- Easy preview review on Netlify.
- Doesn't commit to any global change yet; gives Mike a deploy preview to evaluate whether further tightening (PR 2) is wanted before touching `.section-y`.
- High visible impact on the worst offenders (7 service pages × 4 two-column bands each).

If PR 1 lands and reads well, PR 2 (`section-y` tighten) is a one-line follow-up. If PR 1 alone is enough, PR 2 doesn't need to happen.
