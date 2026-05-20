# Public website — imagery, interactive checklists, and homepage feature sections

> **Status:** planning only. No code, no commits.
> **Authored:** 2026-05-20 (Sano `main` at `75773f7`, immediately after PR #159).
> **Scope boundary:** public marketing site only. No portal, no share, no auth, no quote/invoice, no contractor, no commercial-proposal code.
> **External reference:** [enhancedcleaning.com.au](https://enhancedcleaning.com.au/) — direction and structure only. Do not copy copy, branding, or layout 1:1.

---

## 1. Context

The public site has been through three recent visual passes:

- **PR #153** — public-site grid-gap tighten (`gap-16 lg:gap-24` → `gap-10 lg:gap-14`).
- **PRs #154 / #155 / #156** — homepage hero locked in (real Herne Bay photo, softened gradient, inline trust row + soft white card chips).
- **PR #158** — second-pass spacing tighten (`section-y`, CtaBanner, Footer).

The next phase is **content depth + premium-feeling feature sections + the imagery base required to make them sing**. The user has explicitly flagged this is a planning task — produce the doc, do not build.

What this doc plans:

1. **Image requirements audit** of every public page (which slots exist, which need replacing, which are missing entirely).
2. **Homepage feature sections** — restyled "How It Works", Sano Cleaning Standards teaser, guarantee teaser.
3. **The Sano Cleaning Standards** — a three-tier system of reusable, data-driven, interactive checklists, one per residential service page (Home Clean Standard / Deep Clean Detail / Property Reset).
4. **Naming, per-page SEO focus, data structure, placement, and phased rollout**.

**Originality is non-negotiable.** Enhanced Cleaning is referenced for structure and quality level only. No wording, no naming, no layout, no checklist content from there is permissible in Sano's data, copy, or markup.

What this doc explicitly does **not** plan:

- HeroSection `min-h` (520px) — already a separate shelved PR, untouched here.
- Portal, share, auth, quote/invoice, contractor, commercial-proposal surfaces.
- Replacement of the homepage hero (Herne Bay) — locked.
- New colour palette, new typography family, new global utilities — Sano brand stays as-is.
- Reskinning the existing `/guarantee` page — out of scope; this doc only references it as a link target for the homepage teaser.

---

## 2. Image requirements audit

### 2.1 Current image inventory

**`public/images/` (14 files)** — known provenance per the 2026-05-19 image audit:

| File | Bytes | Provenance | Used on |
|---|---|---|---|
| `herne-bay-residential.jpg` | 780 KB | ✅ **Real Sano photo** (Herne Bay) | Homepage hero |
| `cleaned-by-sano.jpg` | 778 KB | Likely AI (per provenance audit) | Not currently referenced |
| `executive-summary.jpg` | 502 KB | Likely AI | Proposal-side only — out of scope |
| `proposal-banner.jpg` | 673 KB | Likely AI | Proposal-side only — out of scope |
| `Sano-crew-auckland.jpeg` | 418 KB | Likely AI | Careers/About candidate, not currently referenced |
| `sano-auckland-team.jpeg` | 428 KB | Likely AI | "Why Sano" supporting image on every service detail page |
| `sano-commercial-clean-auckland.jpeg` | 460 KB | Likely AI | Supporting image on deep-cleaning, commercial-cleaning, post-construction pages |
| `cleaning-shot-2.jpeg` | 442 KB | Likely AI | Supporting image on regular-cleaning, end-of-tenancy, window-cleaning, carpet-upholstery |
| `deep-cleaning.jpg` | 436 KB | Likely AI | `/services/deep-cleaning` hero + intro + `/policies` background |
| `end-of-tenancy.jpg` | 647 KB | Likely AI | `/services/end-of-tenancy` hero + intro |
| `carpet-upholstery.jpg` | 469 KB | Likely AI | `/services/carpet-upholstery` hero + intro |
| `window-cleaning.jpg` | 500 KB | Likely AI | `/services/window-cleaning` hero + intro |
| `post-construction.jpg` | 383 KB | Likely AI | `/services/post-construction` hero + intro |
| `careers/` | — | — | Career page imagery (out of scope here) |

**External (Unsplash, hot-linked):** 5 distinct images still on production.

### 2.2 Page-by-page audit

For each page: current state, what each image slot is for, recommendation, priority (P0 = blocking; P1 = next; P2 = polish; P3 = nice-to-have), and ideal source format.

| Page | Slot | Current | Provenance | Recommendation | Priority |
|---|---|---|---|---|---|
| `/` Homepage | Hero | `/images/herne-bay-residential.jpg` (2912×1282, 780 KB) | ✅ Real Sano | **Keep** | — |
| `/` Homepage | "Why Auckland Chooses Sano" supporting image | Unsplash `photo-1618221195710` (clean interior) | Stock | Replace with real Sano interior shot (clean finished kitchen or living room, landscape, 1600×1200 ideal) | **P0** |
| `/about` | Hero left image | Unsplash `photo-1581578731548` (cleaner at work) | Stock | Replace with real Sano cleaner-at-work photo, portrait or square, 800×1000 ideal | **P0** |
| `/about` | Full-width banner mid-page | Unsplash `photo-1618221195710` (same as homepage) | Stock | Replace with a real Sano interior — **must be a different shot from the homepage** so the two pages don't show identical imagery | **P0** |
| `/services` (index) | None | — | — | None needed; cards already carry per-service imagery | — |
| `/services/regular-cleaning` | Hero | Unsplash `photo-1631679706909` (laundry/cleaning supplies) | Stock | Replace with real Sano regular-cleaning context shot (vacuuming, surface wipe-down, or finished room), landscape 1600×900 | **P0** |
| `/services/regular-cleaning` | Intro supporting | Unsplash `photo-1618221195710` (same as homepage) | Stock | Replace — same duplication concern | **P0** |
| `/services/regular-cleaning` | Includes-section supporting | `/images/cleaning-shot-2.jpeg` | Likely AI | Replace with real Sano photo when available | P1 |
| `/services/regular-cleaning` | Why-Sano supporting | `/images/sano-auckland-team.jpeg` | Likely AI | Replace with real team or work photo | P1 |
| `/services/deep-cleaning` | Hero | `/images/deep-cleaning.jpg` | Likely AI | Replace with real Sano deep-clean shot (oven detail, bathroom reset, tile grout) — landscape 1600×900 | P1 |
| `/services/deep-cleaning` | Intro supporting | `/images/deep-cleaning.jpg` (same as hero) | Likely AI | Replace and use a *different* shot from the hero | P1 |
| `/services/deep-cleaning` | Includes-section supporting | `/images/sano-commercial-clean-auckland.jpeg` | Likely AI | Replace; note current image's misalignment (commercial photo on a deep-clean page) | P1 |
| `/services/deep-cleaning` | Why-Sano supporting | `/images/sano-auckland-team.jpeg` | Likely AI | Replace | P1 |
| `/services/end-of-tenancy` | Hero | `/images/end-of-tenancy.jpg` | Likely AI | Replace with real end-of-tenancy reset shot (empty property, kitchen reset, bond-handover-ready), landscape 1600×900 | P1 |
| `/services/end-of-tenancy` | Intro supporting | `/images/end-of-tenancy.jpg` (same as hero) | Likely AI | Replace, different shot | P1 |
| `/services/end-of-tenancy` | Includes-section supporting | `/images/cleaning-shot-2.jpeg` | Likely AI | Replace | P1 |
| `/services/end-of-tenancy` | Why-Sano supporting | `/images/sano-auckland-team.jpeg` | Likely AI | Replace | P1 |
| `/services/commercial-cleaning` | Hero | Unsplash `photo-1497366754035` (office) | Stock | Replace with real Sano commercial site photo (lobby, office floor, breakroom, exterior), landscape 1600×900 | **P0** |
| `/services/commercial-cleaning` | Intro supporting | Unsplash `photo-1618221195710` (same as homepage) | Stock | Replace, must differ from homepage and About | **P0** |
| `/services/commercial-cleaning` | Includes-section supporting | `/images/sano-commercial-clean-auckland.jpeg` | Likely AI | Replace with real commercial site photo | P1 |
| `/services/commercial-cleaning` | Why-Sano supporting | `/images/sano-auckland-team.jpeg` | Likely AI | Replace | P1 |
| `/services/carpet-upholstery` | Hero | `/images/carpet-upholstery.jpg` | Likely AI | Replace with real carpet/upholstery shot (extraction equipment in use, before/after, fibre detail), landscape 1600×900 | P2 |
| `/services/carpet-upholstery` | Intro / supporting (×2) | various AI/likely-AI files | Likely AI | Replace | P2 |
| `/services/window-cleaning` | Hero | `/images/window-cleaning.jpg` | Likely AI | Replace with real window clean shot (squeegee on glass, exterior reach, finished pane detail), landscape 1600×900 | P2 |
| `/services/window-cleaning` | Intro / supporting (×2) | various AI/likely-AI files | Likely AI | Replace | P2 |
| `/services/post-construction` | Hero | `/images/post-construction.jpg` | Likely AI | Replace with real handover shot (cleared site, dust-removed finish detail), landscape 1600×900 | P2 |
| `/services/post-construction` | Intro / supporting (×2) | various AI/likely-AI files | Likely AI | Replace | P2 |
| `/guarantee` | None — uses gradients + iconography | — | — | **Recommended:** consider adding one warm Sano photo to the closing CTA band (currently a flat sage gradient). Portrait of cleaner-and-customer at handover would help. | P3 |
| `/faq` | None | — | — | **Recommended:** consider adding a single calm supporting image (interior, plant, light-filled room) to break up the long text list | P3 |
| `/contact` | None | — | — | **Recommended:** consider a small ground-truth Auckland photo (e.g. recognisable suburb, harbour, residential street) to anchor the location | P3 |
| `/service-area` | None | — | — | **Recommended:** consider an Auckland-context image (harbour, residential streetscape) in the hero band; map below would benefit from a visual frame | P2 |
| `/policies` | Hero background | `/images/deep-cleaning.jpg` | Likely AI | Replace or remove — policies pages typically don't need photographic hero | P3 |
| `/blog` index | Hero | Unsplash `photo-1600585154340` | Stock | Replace with a real Sano work photo or branded illustration; landscape 1600×900 | P2 |
| `/blog/[slug]` | Hero | Unsplash `photo-1600585154340` (default) | Stock | Each blog post should carry its own per-post image; planning to migrate to real or stock-licensed photography per-post | P2 |
| `/join-our-team` | (existing imagery) | — | (out of scope this doc) | Already covered by separate careers/`/images/careers/` content | — |

**Slots that need new images that don't currently exist anywhere:**

- A second clean-interior shot distinct from the homepage one (for About + Commercial intro use).
- Per-service hero shots — all 7 services currently use either Unsplash stock or likely-AI imagery (regular, deep, end-of-tenancy, commercial, carpet, window, post-construction).
- A cleaner-at-work portrait/square for the About hero left tile.
- An optional Sano team-in-context shot for the "Why Sano" repeating slot on service pages.

### 2.3 Image type / style guidance

Recommended visual style per slot category (Sano-on-brand: warm, calm, sage-leaning, no harsh fluorescent stock-photo look):

- **Service heroes:** action or finished-space photography, landscape orientation, ~16:9 aspect, sage-friendly tones (natural light preferred over fluorescent). Avoid generic "smiling cleaner in branded uniform" stock shots.
- **About hero:** real Sano team member in context — portrait or square, ~4:5 or 1:1, soft light.
- **About full-width band:** wide environmental shot — wide aspect (>2:1), interior or exterior, calm and considered.
- **Service-page intro supporting:** mirrors the service it sits next to. Tight, considered framing — surface detail, a cleaner mid-task, or a finished room.
- **Service-page "Why Sano" supporting:** team shot, behind-the-scenes, or considered Auckland context.
- **CTA / footer photos (if added):** warm, intimate; suggests "this is the team behind your clean".

### 2.4 Priority order for sourcing

**P0 (replace first — they're either Unsplash stock on a primary landing surface OR duplicated to the point that two pages share the same image):**
1. Homepage "Why Auckland Chooses Sano" image (Unsplash, duplicated on multiple pages)
2. About hero left image (Unsplash)
3. About full-width banner (Unsplash, duplicated)
4. Regular Cleaning hero (Unsplash)
5. Regular Cleaning intro supporting (Unsplash, duplicated)
6. Commercial Cleaning hero (Unsplash)
7. Commercial Cleaning intro supporting (Unsplash, duplicated)

**P1 (replace second — they're AI-generated `/images/*.jpg` on service heroes/intros):**
8. Deep Cleaning hero + intro
9. End of Tenancy hero + intro
10. All service-page "Why Sano" repeated team shot

**P2 (replace third — AI-generated on lower-traffic service pages, and missing-image opportunities):**
11. Carpet & Upholstery hero + supporting
12. Window Cleaning hero + supporting
13. Post-Construction hero + supporting
14. Service-area page imagery
15. Blog index + per-post hero

**P3 (polish — nice-to-have additions, not replacements of broken stock):**
16. /guarantee closing CTA photo
17. /faq supporting image
18. /contact location anchor image
19. /policies hero background (remove or replace)

### 2.5 Explicit constraints

- **No AI placeholders introduced.** If a real photo isn't available, leave the current image and add it to the queue.
- **No image replacement happens inside this planning doc.** Each P0/P1 item is its own future PR with the real photo + commit message naming the source.
- **Provenance must be recorded** when a real photo lands — append to `docs/superpowers/specs/2026-05-19-homepage-hero-review.md` "Image Provenance Notes" appendix (or a sibling doc) so the AI/real distinction stays trackable.

---

## 3. Homepage feature-section recommendations

### 3.1 Current homepage section order

1. `<HomeHero />` — locked, real Herne Bay photo.
2. "Why Auckland Chooses Sano" — bg-white, `section-y`, 2-column with stock interior photo + value props.
3. "Cleaning services that work around you." — `bg-[#faf9f6]`, `section-y`, 6 service cards (3-up grid).
4. `<ProcessSteps />` — `bg-[#faf9f6]`, `section-y`, three numbered cards "Get a quote" → "We take care of it" → "Walk into a better space".
5. `<CtaBanner />` — `bg-sage-800`.
6. `<Footer />` — `bg-sage-800`.

### 3.2 Recommended new homepage section order

1. `<HomeHero />` — unchanged
2. "Why Auckland Chooses Sano" — unchanged structure, P0 image swap (see §2.4)
3. "Cleaning services that work around you." — unchanged (full 7-service grid)
4. **`<ProcessSteps />` restyled** (see §3.3)
5. **NEW: Sano Cleaning Standards teaser** — 3 cards: Home Clean Standard / Deep Clean Detail / Property Reset (see §3.4)
6. **NEW: Guarantee / Service Promises teaser** (see §3.5)
7. `<CtaBanner />` — unchanged
8. `<Footer />` — unchanged

That adds **two new sections** between ProcessSteps and the CTA. Each is short (≤ ~3 rows of content) so the total page height grows modestly, not dramatically. Per Sano's spacing direction post-PR #158, these new sections should use `section-y` like the others.

### 3.3 ProcessSteps redesign

**Current weaknesses** (review against Enhanced Cleaning reference):

- Step number badges are small `w-8 h-8` circles disconnected from the cards below (numbered ring sits separately from the card body).
- Card icons in `bg-sage-50` rounded squares look slightly utilitarian.
- Animation: `delay: i * 1` (one second per card) is too slow for a homepage process row.
- Hierarchy: card body copy is 3–4 lines + a 3-bullet "benefits" list. Enhanced Cleaning keeps it to *one* short paragraph per step. The benefits list might be load-bearing — keep, but consider tightening.

**Recommended changes** (Sano-on-brand, do not clone Enhanced):

- Move the step number *inside* the card as a large faded numeral (e.g. `text-7xl text-sage-100`) sitting behind / beside the icon, instead of as a separate badge above. Visually unifies the step number and the card content.
- Lift the icon treatment: bigger icon (24px → 28px), sage gradient or filled background instead of flat `bg-sage-50`, subtle shadow on the icon tile.
- Tighten body copy from 3–4 lines per step to ~2 lines; keep the 3-bullet benefits list (it earns its space).
- Drop animation delay from `delay: i * 1` to `delay: i * 0.12` (matches the homepage hero stagger).
- Optional: replace the centred connecting line + ring badge above the cards with a subtle continuous arc/line that visually links the three cards (read-only decoration, not load-bearing).
- Keep the section background `bg-[#faf9f6]` so it stays in the same beige band as the Services section above.

**Don't:**
- Don't darken the section. ProcessSteps stays a light, calm band.
- Don't add a fourth step.
- Don't replace the icons with photographic illustrations.

### 3.4 Sano Cleaning Standards teaser section (new)

**Purpose:** introduce the three-tier Sano Cleaning Standards system (Home Clean Standard / Deep Clean Detail / Property Reset), signal depth and credibility, drive interest to the residential service pages where the full checklists live.

**Recommended framing:**
- Section eyebrow: **The Sano Cleaning Standards**
- Section headline: **A clearer clean, room by room** (or equivalent)
- Section subtext: **See what's included before we arrive.**

**Recommended layout:** 3 cards on desktop, single-column stack on mobile.

- **Card 1 — Home Clean Standard**
  Short label: `Sano 100-Point Home Clean Checklist`
  1-line description: "Our routine clean, every room covered consistently."
  Card CTA: "See the home clean checklist" → `/services/regular-cleaning#home-clean-checklist`
- **Card 2 — Deep Clean Detail**
  Short label: `Sano Deep Clean Detail Checklist`
  1-line description: "Where regular ends, deep starts — build-up, edges, fittings, the corners that get missed."
  Card CTA: "See the deep clean detail" → `/services/deep-cleaning#deep-clean-checklist`
- **Card 3 — Property Reset**
  Short label: `Sano 125-Point Property Reset Checklist`
  1-line description: "Move-out and rental handover, ready for inspection."
  Card CTA: "See the property reset checklist" → `/services/end-of-tenancy#property-reset-checklist`

Each card carries:
- Eyebrow ("Standard" / "Detail" / "Reset")
- Card headline (the short label above)
- 1-line body
- Subtle icon (lucide — `Home` / `Sparkles` / `KeyRound` reused from the homepage hero chips, or fresh icons if those duplicate too closely with the chip row visually)
- Card CTA link

**Visual treatment:** `bg-white` band (alternates with the beige Services + Process sections above). Cards are soft white-on-white with a sage tint border and a subtle shadow — same family as the homepage service chips so the standards row feels like a continuation of Sano's existing visual system. Card hover lifts slightly.

**Why three cards, not a single checklist preview:**
- A single 100-point preview card was the initial direction but it would visually under-sell the *system*. The three-tier framing makes the credibility claim broader ("we have a standard for every job"), not narrower ("here's the regular-clean list").
- Three cards mirror the trust decision the customer is making — routine vs deep vs end-of-tenancy.
- Avoids forcing one checklist into the spotlight at the expense of the other two.

**Why not just put a full checklist on the homepage:** the homepage is for orientation, not deep content. The teaser earns its slot because it announces the *system* and gives one click into each standard.

### 3.5 Guarantee teaser section (new)

**Purpose:** surface the guarantee/promises content from `/guarantee` onto the homepage to build trust before the CTA, without duplicating the whole page.

**Recommended layout:** dark sage band (`bg-sage-700` or similar) with a 2-column split.

- **Left column:** eyebrow ("Our promise") + headline ("Cleaning you can rely on") + 2-line supporting body + CTA ("Read our guarantee").
- **Right column:** 3 promise mini-cards (NOT 6 — the full 6 live on `/guarantee`). Pick the strongest three from the existing 6 on `/guarantee`:
  1. Reliable and consistent
  2. We stand behind our work
  3. Attention to detail

  Each card: icon + 1-line title + 1-line body. Compact.

**CTA target:** `/guarantee`.

**Visual treatment:** dark band breaks up the long sequence of light sections. Pairs visually with the dark CtaBanner immediately below — care needed not to make the whole bottom of the homepage one continuous dark slab (§9 open question).

**Why this works:** "trust block before the final CTA" is a common homepage pattern in this category. Sano's existing `/guarantee` page already has the substance (six service promises). The homepage version is a *teaser* — three cards distilled from those six — pointing customers to the full page for depth. Respects both content gravity and homepage scan-readability. The promise wording stays Sano's own — pulled from the existing `/guarantee` page, not borrowed from any external reference.

---

## 4. Interactive checklist component

### 4.1 Concept

A reusable, data-driven, room-by-room (or category-by-category) checklist component that turns a flat list of cleaning tasks into a navigable, premium-feeling section. Drop into the three residential service pages, each fed by its own data file:
- `/services/regular-cleaning` → `Sano 100-Point Home Clean Checklist`
- `/services/deep-cleaning` → `Sano Deep Clean Detail Checklist`
- `/services/end-of-tenancy` → `Sano 125-Point Property Reset Checklist`

The same React component handles all three. Only the data source and the intro copy change per page.

### 4.2 Desktop layout

- **Left rail (~30%):** room/category selector — a vertical list of room names (Kitchen, Bathrooms, Bedrooms, Living areas, etc.) with item counts (e.g. "Kitchen — 18 items"). Selected room is highlighted with a sage left border + lifted background.
- **Right detail panel (~70%):** the items in the selected room, displayed as a 2-column checklist grid. Each item: green checkmark + item description.
- Optional small header above the right panel: "Kitchen — 18 items in this room"
- Optional: room icon next to each room name in the left rail.

### 4.3 Mobile layout

- Accordion: each room collapses to a clickable header showing room name + count.
- Tap a header to expand the item list (single-column).
- Only one room open at a time (collapse previous when new opened).

### 4.4 Above and below the component

- **Above:** eyebrow + section headline + 1-paragraph intro (page-specific copy, e.g. "Sano 100-Point Home Clean Checklist — everything we do on a standard residential clean.")
- **Below:** an optional CTA strip: "Get a free quote for your home" → links to /contact (or quote form). Quietly anchored, not full-page interrupting.

### 4.5 Component shape (sketch)

```tsx
<ServiceChecklist
  checklist={SANO_100_POINT_HOME}          // imported from src/lib/checklists
  intro="Everything we do on a standard residential clean."
  eyebrow="Home Clean Standard"
  showQuoteCta={true}
/>

<ServiceChecklist
  checklist={SANO_DEEP_CLEAN_DETAIL}
  intro="Deep clean inclusions depend on property size, condition, access, selected scope and agreed time allowance."
  eyebrow="Deep Clean Detail"
  showQuoteCta={true}
/>

<ServiceChecklist
  checklist={SANO_125_POINT_PROPERTY_RESET}
  intro="Our reset for move-out and rental handover."
  eyebrow="Property Reset"
  showQuoteCta={true}
/>
```

### 4.6 Behaviour / interaction notes

- Selecting a room must be deep-linkable (e.g. `#kitchen`) so the homepage teaser CTA can land directly on a specific section if desired.
- No actual checkboxes (these aren't tasks to tick off — they're proof of what's included). Use ✓ icons.
- Keep the section accessible: room nav as a `<nav>`, items as a `<ul>`, room headings as proper `<h3>`.

### 4.7 Don'ts

- Don't gate it behind an email capture. It's credibility content, not a lead magnet.
- Don't animate it heavily. Subtle fade-in on selection change is enough.
- Don't add cost/time estimates per item. That belongs in the quote flow.
- Don't make it editable. Read-only display only.

---

## 5. The Sano Cleaning Standards — three-tier system

Three named standards, one per residential service, plus the umbrella system name:

| Tier | Service page | Checklist name | Short label | Purpose |
|---|---|---|---|---|
| 1 | `/services/regular-cleaning` | **Sano 100-Point Home Clean Checklist** | Home Clean Standard | Room-by-room routine clean for regular and recurring house cleaning. |
| 2 | `/services/deep-cleaning` | **Sano Deep Clean Detail Checklist** | Deep Clean Detail | Condition-based detail clean for build-up, edges, fittings, surfaces, corners, high-touch points, reachable dust and areas commonly missed during routine cleaning. Builds *from* the home clean system but has its own identity and extra detail. |
| 3 | `/services/end-of-tenancy` | **Sano 125-Point Property Reset Checklist** | Property Reset | Move-out and rental handover, ready for inspection by tenants, owners or agents. |

**Umbrella name** (for homepage teaser, navigation, and where the three tiers are introduced together): **The Sano Cleaning Standards**.

### 5.1 Naming rules

- Drop "Sparkling Home" entirely (overlaps with Enhanced Cleaning's "100-Point Sparkling Home Checklist").
- Each name carries the **Sano** prefix so the asset stays owned even when referenced elsewhere.
- Where a *number* is part of the standard ("100-Point", "125-Point"), the number leads — it's the credibility signal.
- The deep clean standard intentionally does **not** carry a point count — it's condition-based, not fixed-count, and capping it at a number would mis-state the offer.

### 5.2 What the three tiers do differently

- **Home Clean Standard** is *predictable* — the same routine every visit. Customer can mentally tick rooms off.
- **Deep Clean Detail** is *conditional* — actual inclusions depend on **property size, condition, access, selected scope and agreed time allowance**. The checklist is what *can* be addressed; the per-job quote tells the customer what *will* be addressed in their booked time. This caveat must appear on the deep-cleaning page and in any homepage card body for that tier.
- **Property Reset** is *exhaustive* — covers the inspection-grade reset list a landlord/agent expects, regardless of property condition on entry.

### 5.3 Relationship between the home clean and deep clean checklists

The deep clean page can reference the home clean system (e.g. "starts where a regular clean ends" or similar), and the deep clean checklist can be structured so its rooms mirror the home clean's rooms for navigation parity — but **the items inside each room are distinct**. The deep clean must not be the same items as the home clean with different headings; if there's no extra detail to list for a given room, that room either doesn't appear in the deep clean checklist or appears with a short note explaining the deep-clean focus for that room.

---

## 6. Page placement and SEO direction

### 6.1 Placement

| Checklist | Page | Slot | Notes |
|---|---|---|---|
| Sano 100-Point Home Clean Checklist | `/services/regular-cleaning` | New section between current "What's included" summary and "Why Sano" band | Primary home of the Home Clean Standard. |
| Sano Deep Clean Detail Checklist | `/services/deep-cleaning` | New section in the same slot as above | The dedicated deep clean standard — own checklist, not a re-skin of the 100-point list. Must include the caveat that deep clean inclusions depend on property size, condition, access, selected scope and agreed time allowance (see §5.2). |
| Sano 125-Point Property Reset Checklist | `/services/end-of-tenancy` | New section in place of (or above) current "What's included" band | Replaces the current 8-bullet `includes` array — that becomes the section header summary, the full 125 points sit in the interactive component. |
| Sano Cleaning Standards (umbrella teaser) | `/` (homepage) | New section §3.4, three cards | Teaser only — real interactive components live on the three service pages. |
| Any standard | `/services/post-construction` | **Not recommended** | Post-construction has a different brief (dust + finishing-trade debris). A 4th dedicated checklist would be over-build; the existing `includes` array is fine. |
| Any standard | `/services/commercial-cleaning` | **Not recommended** | Commercial scope varies too much per site. The proposal/quote flow handles depth here. |

### 6.2 Per-page SEO focus

Each of the three residential service pages owns a distinct keyword cluster. Copy, headings, meta description, and on-page H2/H3 hierarchy should reinforce the page's focus without bleeding into the others.

- **`/services/regular-cleaning`** — regular house cleaning, home cleaning, recurring cleaner, what's included in a house clean. The page anchor section (where the checklist lives) should be `#home-clean-checklist` or `#what-is-included`, and the H2 above the checklist should use language matching this cluster (e.g. "What's included in a Sano regular clean" — exact wording TBD).
- **`/services/deep-cleaning`** — deep cleaning, deep house cleaning, deep cleaning checklist, what's included in a deep clean. Page anchor `#deep-clean-checklist`. H2 wording reinforces "deep" repeatedly rather than borrowing "regular" or "tenancy" terms.
- **`/services/end-of-tenancy`** — end of tenancy cleaning, move out cleaning, rental handover cleaning, end of tenancy cleaning checklist. Page anchor `#property-reset-checklist`. H2 wording reinforces the bond / move-out / handover terms.

The umbrella name "Sano Cleaning Standards" is brand, not SEO — it can appear on every relevant page but it's not the page's keyword target. The keyword-target H1 / H2 belong to each service-specific cluster.

### 6.3 Internal linking

- Homepage teaser cards (§3.4) link directly to the three service-page anchors above.
- Each service page's checklist section should carry "Looking for a different standard?" footnote-style links to the other two pages, so search engines and users can move laterally across the three tiers.
- Avoid stuffing all three standards onto a single landing page — three separate URLs is better for both SEO clarity and customer scan-readability.

---

## 7. Required checklist data structure

### 7.1 Type definitions (proposed)

```ts
// src/types/checklist.ts

export interface ChecklistItem {
  /** Human-readable cleaning task. */
  text: string
  /** Optional clarifying detail, shown subtly under text. */
  note?: string
}

export interface ChecklistRoom {
  /** Stable slug used in deep-links (e.g. "kitchen"). */
  slug: string
  /** Display name in the left rail / accordion header. */
  name: string
  /** Optional lucide icon name for the room. */
  icon?: string
  /** Ordered list of items. */
  items: ChecklistItem[]
}

export type ChecklistSlug =
  | 'sano-100-point-home-clean'
  | 'sano-deep-clean-detail'
  | 'sano-125-point-property-reset'

export interface Checklist {
  /** Stable slug — one per Sano Cleaning Standard. */
  slug: ChecklistSlug
  /** Full display name (e.g. "Sano 100-Point Home Clean Checklist"). */
  name: string
  /** Short label for chips / cards (e.g. "Home Clean Standard"). */
  shortName: string
  /**
   * Total item count for headline use, derived at module load.
   *
   * Note: the deep clean checklist is condition-based and may not always
   * carry a meaningful "X-Point" claim. For the deep clean standard, prefer
   * surfacing room count or category count instead — see §5.2.
   */
  totalItems: number
  /** Optional caveat to render above the checklist (e.g. for deep clean). */
  caveat?: string
  /** Ordered rooms or categories. */
  rooms: ChecklistRoom[]
}
```

### 7.2 Storage shape

- One file per checklist:
  - `src/lib/checklists/sano-100-point-home-clean.ts`
  - `src/lib/checklists/sano-deep-clean-detail.ts`
  - `src/lib/checklists/sano-125-point-property-reset.ts`
- An index re-export: `src/lib/checklists/index.ts` exporting all three + a `getChecklistBySlug(slug)` helper.
- `totalItems` should be derived at module load: `rooms.reduce((acc, r) => acc + r.items.length, 0)` — that way the "100" / "125" claim stays accurate even if items are added/removed. For the deep clean checklist, surface this internally but don't render a "Deep Clean N-Point" headline (see §5.2).

### 7.3 What's blocking data entry

The actual item lists (room-by-room or category-by-category breakdowns) live in source files outside the repo. Until those are supplied as plain-text or markdown:

- The Home Clean and Property Reset standards can be scaffolded against placeholder rooms.
- The Deep Clean Detail standard needs to be **authored fresh** — it must not be a copy of the Home Clean items with different headings (§5.3). This may need a planning sub-pass with the user before content entry begins.

The component shell can be built and styled with placeholder data; content for all three goes in later.

### 7.4 Originality

All three checklists' content is original to Sano. The Enhanced Cleaning site has been reviewed for structure and quality bar only — no item wording, no room naming, no checklist content from there is permissible in the Sano data files.

---

## 8. Implementation phases

Suggested phasing — three phases, smallest-safe-changes within each, each its own PR. No phase begins until the previous merges and is verified live.

### Phase A — Planning (this doc)

- This planning document.
- User reviews and lands open decisions (§9).
- No code.

### Phase B — Data and component foundation

- Land the type definitions (`src/types/checklist.ts`).
- Land all three checklist data files as scaffolds with correct room/category names. Items can be placeholder while content is authored (see §7.3).
- Build `<ServiceChecklist>` as a styled, working component. Desktop + mobile layouts both working. Component supports the optional `caveat` field (for the deep clean property-size/condition note).
- No homepage changes. No service-page integration.
- Visual review on a preview branch before merge.

### Phase C — Service-page integration

- Drop `<ServiceChecklist>` into `/services/regular-cleaning`, `/services/deep-cleaning`, and `/services/end-of-tenancy` — one PR per page, in that order (smaller per-PR diffs, easier per-page visual review).
- Per-page intro copy + SEO H2 wording added per §6.2.
- Deep-cleaning page surfaces the property-size/condition/access/scope/time caveat above its checklist.
- Visual review per page.

### Phase D — ProcessSteps redesign

- Restyle `<ProcessSteps>` per §3.3.
- No new content; visual polish only.
- Visual review.

### Phase E — Homepage feature teasers

- **E1:** Add the Sano Cleaning Standards teaser section (§3.4) with three cards. Wire each card's CTA to the corresponding service-page anchor.
- **E2:** Add the guarantee teaser section (§3.5). Wire CTA to `/guarantee`.
- Each sub-phase is its own PR with its own visual review.

### Phase F — Image replacements (rolling)

- One PR per real image as it becomes available, in P0 → P1 → P2 → P3 priority order from §2.4.
- Each PR updates 1–2 image references + updates the provenance appendix.
- This phase runs in parallel with B–E once real photos start arriving.

### Phasing rationale

- B → C → D → E is the dependency chain (data before component; component before page integration; page integration before homepage teaser links to the integrated section).
- F runs in parallel because images are content-blocked, not code-blocked.
- D (ProcessSteps redesign) can swap with E if the user wants the homepage feel to come together before the checklist component is fully built — flagged in §9.

---

## 9. Risks and open decisions

### 9.1 Risks

- **Two new homepage sections + the existing CtaBanner could make the page too long.** Mitigated by keeping each teaser to ~3 content rows + using the post-PR-#158 spacing rhythm. Mitigation check: measure the new homepage scroll length on a preview branch before merging Phase E.
- **Dark guarantee teaser + dark CtaBanner immediately below.** Risk of one long dark slab at the bottom of the page. Mitigation: the guarantee teaser could be a slightly lighter sage (e.g. `sage-700` not `sage-800`) so there's a visible step-down into the CTA. Or insert a thin white separator band. Final treatment decided when building.
- **125-point checklist may genuinely require ~125 items.** If the source DOCX has 80, we shouldn't pad. Naming should reflect actual content — decide at content-entry time whether to keep "125" or rename to the real number.
- **Checklist component on mobile must not become a wall of accordions.** If a checklist has 12 rooms, that's 12 collapsed headers stacked. Mitigation: cap visible rooms on mobile via a "Show all rooms" expand toggle, or group rooms into 2–3 macro-sections.
- **Image P0 / P1 priorities assume real photography is forthcoming.** If real photos are weeks/months away, the audit's P0/P1 ordering still holds but the timeline slips. None of the code work in Phases B–E is blocked on imagery.

### 9.2 Open decisions for the user

**Q1 — Checklist landing routes.**
Should the three checklists each scroll-anchor to their own service page (recommended: `/services/regular-cleaning#home-clean-checklist`, `/services/deep-cleaning#deep-clean-checklist`, `/services/end-of-tenancy#property-reset-checklist`), or should there also be a single `/cleaning-standards` umbrella landing page that lists all three?
Recommendation: **scroll-anchor to the service pages**. Three URLs already exist, each is the SEO target for its keyword cluster (§6.2), and an extra umbrella route would dilute that. The homepage teaser is the umbrella surface.

**Q2 — Both homepage teasers, or stage them?**
The plan adds *two* new homepage sections (Cleaning Standards teaser §3.4 + Guarantee teaser §3.5). Comfortable adding both at once, or stage them (Standards first, Guarantee later)?
Recommendation: **stage them** — ship Standards teaser first (Phase E1), Guarantee teaser second (Phase E2). Two smaller PRs, two reviews.

**Q3 — Phase ordering: D before E, or E before D?**
ProcessSteps redesign (D) and homepage teasers (E) are independent. If the user wants the homepage to feel "more complete" sooner, E could come first. If How-It-Works polish first, D comes first.
Recommendation: **D first** — restyle ProcessSteps so the existing rhythm is right before adding new sections.

**Q4 — Image audit appendix location.**
Provenance notes for each image (real vs AI) — should they go in:
- (a) `docs/superpowers/specs/2026-05-19-homepage-hero-review.md` "Image Provenance Notes" appendix (existing)?
- (b) A new dedicated `docs/superpowers/specs/2026-05-20-image-provenance.md`?
Recommendation: **(b)** — image provenance is going to grow across many PRs; deserves its own home.

**Q5 — Are stock images acceptable as a stopgap?**
P0 image swaps need real Sano photos. If real photos aren't available within the next 1–2 weeks, is genuinely-licensed stock (Unsplash with attribution / paid stock) an acceptable temporary upgrade — at least for the most visible Unsplash duplicates?
Recommendation: **no** for AI-generated; **maybe yes** for genuinely-licensed stock specifically picked to feel Sano-on-brand (warm interiors, NZ context if findable). Final call is the user's.

**Q6 — Checklist content delivery format.**
For all three checklists. The Home Clean and Property Reset already exist as DOCX files (per the user's note); easiest ingest is plain-text or markdown export by room heading. The **Deep Clean Detail** needs to be authored fresh per §5.3 and §7.3 — it can't be derived mechanically from the home clean list.

Sub-questions:
- (a) Can you export Home Clean + Property Reset DOCXs to markdown/plain text?
- (b) Do you want to author the Deep Clean Detail content yourself, or have me draft a first cut for you to edit (based on the deep-cleaning page's existing `description` and `includes` array as the brief)?

**Q7 — Deep Clean Detail data shape.**
Two reasonable structures for the deep clean checklist:
- (a) **Mirror rooms with the Home Clean** (Kitchen, Bathrooms, Bedrooms, etc.), where each room contains only the *extra* detail-level items that go beyond a routine clean.
- (b) **Group by category** (Build-up & residue, Edges & skirting, High-touch points, Reachable dust, Fittings & fixtures, etc.) — categories that cut across rooms.
Recommendation: **(a)** for navigation parity (customer can compare "what does Sano do in the kitchen on regular vs deep?" directly). The category-grouping risks abstracting the customer away from the rooms they care about.

**Q8 — "Sparkling" elsewhere in copy.**
We're dropping "Sparkling Home" as the checklist name. The `/contact` page hero still reads *"Let's get your home sparkling."* Leave or update?
Recommendation: **leave as-is** for now — generic flavour word, not a feature name. Flag for a future copy pass.

**Q9 — Card iconography on the Cleaning Standards teaser.**
The three teaser cards (§3.4) need icons. The homepage hero chip row already uses `Home`, `Building2`, `KeyRound`, `ClipboardCheck` from lucide. Reusing `Home` + `Sparkles` (or `Brush`) + `KeyRound` keeps icon language consistent but risks the standards row looking like a second chip row. Alternative: a slightly different icon family (filled / two-tone) for the standards cards so they read as a distinct row.
Recommendation: **two-tone or filled lucide icons** for the standards cards, so the chip row stays the line-icon row and the standards row reads as its own visual block.

**Q10 — Should the homepage Services section be retained alongside the new Standards section?**
The current "Cleaning services that work around you" service card grid is broad (all 7 services). The new Standards teaser is focused (3 residential standards). Both could coexist (different purposes — "browse all services" vs "see what's included"), or the homepage could be tightened to one.
Recommendation: **keep both**. The Services grid drives discovery of commercial / carpet / window / post-construction — services without a checklist. The Standards teaser sits *after* the Services grid and zooms into the residential trio. Two distinct jobs, both earn their slot.

---

## 10. Enhanced Cleaning reference notes (structure only)

Captured from the WebFetch audit. Used to inform direction; **not for copying**.

- Section order: Hero → Service-selection cards → Press logos → 3-step "How It Works" → 100-Point Checklist teaser → Guarantee section → 6 Service Promises → Why Choose us → Testimonials → Instagram CTA → Footer.
- "How It Works" cards: vertical 3-column on desktop, large numeric eyebrow + bold headline + short body. No card icons in the markup (CSS-generated numerals).
- Checklist teaser: text-only intro, single CTA. No preview card, no item excerpts — just the claim + link.
- Guarantee: centred text block; six promise cards in a grid below; **not** a dark band on Enhanced's site (the headline + body lives on the standard white background).
- 6 promise cards: numbered heading + 1-sentence body, plain layout.
- Hero: solid/gradient background, big bold headline ("The Clean of Your Dreams, Guaranteed."), dual CTAs (quote + phone).
- Imagery: real photos throughout (no illustrations); luxury home interior stock + real Google review avatars.
- Typography: bold sans-serif headings, mid-tone grey body, sparse italic emphasis.
- Spacing: tightly paced, no extreme gaps.
- Colour: light primary, black/dark navy text, teal-ish CTA accent.

**Sano divergences from this reference (intentional):**

- Sano's hero uses real photography + sage gradient overlay (not Enhanced's flat coloured hero).
- Sano's homepage chip row + inline trust row is Sano-specific — don't replicate Enhanced's press-logo row.
- Sano runs a **three-tier Cleaning Standards system** (Home Clean / Deep Clean Detail / Property Reset), each with its own dedicated checklist and its own service-page anchor. Enhanced surfaces a single 100-point claim. Sano's wider system is the differentiator.
- Sano's homepage teaser surfaces **three Standards cards**, not a single text-only checklist callout. Each card links to a distinct service page (driving per-page SEO clusters per §6.2).
- Sano's guarantee teaser uses a darker band, where Enhanced keeps it light. This is a deliberate Sano-side choice — gives the bottom of the homepage a sense of "now committing".
- Sano keeps Noto Serif / Outfit typography (per CLAUDE.md); no font change.
- Sano stays on the sage palette; no teal CTA accent.

**Originality boundary (reinforced):**

- No copy, no item wording, no room naming, no layout patterns, no headlines, no card composition borrowed from Enhanced. Only structural questions ("how many cards?", "dark or light section?", "teaser or full content on homepage?") are informed by the reference.
- The three Sano checklists' content is authored fresh from Sano's own source material — Home Clean and Property Reset from existing DOCX files, Deep Clean Detail authored anew per §5.3.

---

*End of planning doc. No code touched. Awaiting user review and answers to §9 open decisions before Phase B begins.*
