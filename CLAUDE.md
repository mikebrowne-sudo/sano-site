# Sano Site + Portal — Claude Code Context

> Auto-loaded by Claude Code when working in this repo.
> Keep this accurate — it replaces the "paste the master brief into chat" ritual.
> Last synced from `F:\Claude\Projects\sano-site.md` on 2026-04-19.

## Working in this repo

- **Repo root:** `F:\Sano\01-Site\` (post-reorganisation; was `F:\Sano\Sano-site\`)
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind, Supabase, Resend, Framer Motion
- **Hosting:** Netlify project `sanonz1`, auto-deploys from GitHub `main`
- **Portal architecture reference:** see `docs/PORTAL.md` for the full CRM spec

## Guardrails when generating code

- Portal and marketing site share this codebase intentionally — don't propose splitting unless asked.
- Never suggest committing anything from `F:\Sano\30-Accounting\`, `F:\Sano\40-Business\`, or anywhere outside this repo root.
- Brand voice rules: never use "premium", "eco-friendly", "industry-leading". No fake testimonials. No pricing on homepage.
- Design tokens live in `tailwind.config.ts` (sage palette); type styles in `src/app/globals.css`.

---

## Overview
Full redevelopment of www.sano.nz — repositioned from generic cleaning company to reliable, detail-focused Auckland cleaning brand.

- **Live site:** https://sano.nz
- **Codebase:** F:/Sano/01-Site (Next.js 14, Tailwind CSS, TypeScript)
- **GitHub:** https://github.com/mikebrowne-sudo/sano-site
- **Hosting:** Netlify (project: sanonz1)
- **Domain registrar:** Rocketspark

---

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS with custom sage colour palette
- Framer Motion (scroll animations, stagger effects)
- Noto Serif (display/headings) + Outfit (body)
- Supabase (form submissions → quote_requests table)
- Resend (transactional email)
- Netlify (@netlify/plugin-nextjs)

---

## Brand Direction
- **Business name:** Sano Property Services Limited
- **Tagline:** Clean spaces — Healthy living
- **Positioning:** Cleaning that improves how a space feels, not just how it looks
- **Tone:** Reliable, detail-focused, easy to deal with
- **Never use:** premium, eco-friendly, industry-leading, fake testimonials, pricing on homepage

---

## Contact Details (live on site)
- **Phone:** 0800 726 669
- **Email:** hello@sano.nz
- **Location:** Auckland, New Zealand

---

## Pages Built

### Homepage (/)
- Full-bleed hero (560px) with gradient overlay + Framer Motion stagger entrance
- "Why Auckland Chooses Sano" section with image + credibility points
- Services grid (7 cards, no pricing, equal height)
- ProcessSteps — "Simple from start to finish" with left-to-right card animation
- CtaBanner

### Service Pages
All use consistent layout: Hero → Intro (image + text) → What's Included (list + image) → Two-column middle section → Why Sano (image + text) → Process + FAQ (two columns) → Related services → CtaBanner

| Page | URL | Static route |
|------|-----|-------------|
| Regular House Cleaning | /services/regular-cleaning | src/app/services/regular-cleaning/page.tsx |
| Deep Cleaning | /services/deep-cleaning | src/app/services/deep-cleaning/page.tsx |
| End of Tenancy | /services/end-of-tenancy | src/app/services/end-of-tenancy/page.tsx |
| Commercial & Office | /services/commercial-cleaning | src/app/services/commercial-cleaning/page.tsx |
| Carpet & Upholstery | /services/carpet-upholstery | src/app/services/carpet-upholstery/page.tsx |
| Window Cleaning | /services/window-cleaning | src/app/services/window-cleaning/page.tsx |
| Post-Construction | /services/post-construction | src/app/services/post-construction/page.tsx |

### Other Pages
- **/about** — Brand story, trust points, values grid
- **/contact** — Quote request form (left info + right form)
- **/faq** — FAQ accordion
- **/services** — Services listing (uses dynamic [slug] fallback)

---

## Key Files

```
src/
  app/
    globals.css          — Type scale, utility classes (.eyebrow, .section-y, .body-text)
    layout.tsx           — Font variables (Noto Serif + Outfit)
    page.tsx             — Homepage
    about/page.tsx
    contact/page.tsx
    services/[slug]/page.tsx   — Generic fallback for service pages
    services/regular-cleaning/page.tsx
    services/deep-cleaning/page.tsx
    services/end-of-tenancy/page.tsx
    services/commercial-cleaning/page.tsx
    services/carpet-upholstery/page.tsx
    services/window-cleaning/page.tsx
    services/post-construction/page.tsx
    api/submit-quote/route.ts  — Form handler (Supabase + Resend)
  components/
    Header.tsx           — 3-col grid, logo left, nav centre, CTA right
    Footer.tsx           — 4-col grid, "Sano" text logo, contact details
    HomeHero.tsx         — Full-bleed hero with Framer Motion
    FadeIn.tsx           — FadeIn, Stagger, StaggerItem components
    ServiceCard.tsx      — Clickable card, no pricing, equal height
    ProcessSteps.tsx     — 3-step how it works with animated cards
    HeroSection.tsx      — Reusable hero for service pages
    QuoteForm.tsx        — Contact form
    QuoteButton.tsx      — CTA button
    CtaBanner.tsx        — Dark CTA footer section
  lib/
    services.ts          — All 7 service definitions (slug, name, descriptions, images)
    resend.ts            — Email functions (from: noreply@sano.co.nz)
    supabase.ts          — Supabase client (server + browser)
    fonts.ts             — Noto Serif + Outfit font setup
    utils.ts             — cn() utility (clsx + tailwind-merge)
public/
  brand/
    sano-logo.jpg        — Main logo (used in header)
  images/
    deep-cleaning.jpg
    carpet-upholstery.jpg
    window-cleaning.jpg
    end-of-tenancy.jpg
    post-construction.jpg
```

---

## Design System

### Colours (Tailwind)
```
sage-50:  #F7F9F7  (very light bg)
sage-100: #E0EAE3  (borders, light bg)
sage-300: #7EC87A  (light accent)
sage-500: #076653  (brand green, eyebrows, bullets)
sage-600: #5C6B64  (body text)
sage-800: #06231D  (headings, dark text, footer bg)
```

### Typography
- **H1:** clamp(2.125rem, 4vw, 3rem) — Noto Serif, bold, lh 1.08, tracking -0.025em
- **H2:** clamp(1.625rem, 2.75vw, 2.125rem) — Noto Serif, bold, lh 1.15, tracking -0.015em
- **H3:** 1.0625rem — Outfit, semibold
- **Body (.body-text):** 1.0625rem, sage-600, lh 1.75
- **Eyebrow (.eyebrow):** 0.6875rem, uppercase, tracking 0.2em, sage-500

### Layout
- **Container:** max-w-6xl mx-auto
- **Section spacing (.section-y):** py-20 lg:py-24
- **Horizontal padding (.section-padding):** px-4 sm:px-6 lg:px-8
- **Alternating backgrounds:** white / #faf9f6

---

## Infrastructure

### Netlify
- Auto-deploys from GitHub (main branch)
- Environment variables required:
  - `RESEND_API_KEY`
  - `SANO_NOTIFY_EMAIL` (hello@sano.nz)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_TELEMETRY_DISABLED`

### DNS
- Nameservers moved from Rocketspark to Netlify DNS (Apr 2026)
- Netlify nameservers:
  ```
  dns1.p01.nsone.net
  dns2.p01.nsone.net
  dns3.p01.nsone.net
  ```
- SSL: Let's Encrypt, auto-renews via Netlify DNS
- Domain registered through Rocketspark, renews Mar 2027

### Supabase
- Table: `quote_requests`
- Fields: name, email, phone, service, postcode, message, preferred_date
- Server client uses SUPABASE_SERVICE_ROLE_KEY

### Resend
- Sender domain: sano.co.nz (verified in Resend)
- From address: noreply@sano.co.nz
- sendQuoteConfirmation → customer's email
- sendQuoteNotification → SANO_NOTIFY_EMAIL

---

## Known Issues / To Do
- [ ] Confirm email delivery working (Resend not showing sends — debugging in progress)
- [ ] Replace remaining Unsplash placeholder images with real Sano photography
- [ ] Regular house cleaning hero image still using Unsplash
- [ ] Consider adding a services index page (/services)
- [ ] FAQ page may need content update to match new brand tone

---

## Git History (key commits)
- `5cecd41` — Surface email error in API response for debugging
- `57d30fa` — Remove ease from ProcessSteps variants (Framer Motion TS fix)
- `17e581d` — Full site rebuild (main launch commit)
- `53cc1b2` — Fix email send on serverless (await Promise.all)
