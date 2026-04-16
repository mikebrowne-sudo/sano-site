# Header Redesign — Sano.nz
**Date:** 2026-04-14

## Overview

Replace the existing `Header.tsx` with a two-tier sticky header: a slim evergreen top bar above a clean white main header. Matches the Enhanced Cleaning reference layout. Adds new nav items (Join Our Team, Blog, About dropdown) and hover-triggered dropdowns.

---

## Top Bar

- **Background:** `#344C3D` (evergreen)
- **Height:** ~35px
- **Layout:** full-width strip, content right-aligned and positioned to sit centred above the "Get a Quote" button (matching its horizontal inset)
- **Content:** phone icon (SVG) + "Call us for a free quote" (muted green `#a8c5b0`) + "0800 726 669" (white, bold) — all on one line, no wrapping
- **Font:** Poppins 13px, line-height 1.5
- **No social icons**

---

## Main Header

- **Background:** white
- **Sticky:** `position: sticky; top: 0; z-index: 50`
- **Border:** `1px solid #E0EAE3` bottom, subtle box-shadow
- **Layout:** three-column flex (logo | nav | CTA)

### Logo
- Use existing `/brand/sano-logo.jpg` image file (height: 67px, width: auto)
- Inset from left: `margin-left: 12%`

### Navigation (centre)
- Font: Poppins 15px, font-weight 600, color `#374151`, line-height 1.5
- Hover color: `#344C3D`
- Items in order: **Home** | **Services ▾** | **Join Our Team** | **Blog** | **About ▾** | **Contact Us**

#### Services Dropdown (hover to open)
Trigger: `onMouseEnter` / `onMouseLeave` on the button+dropdown wrapper

Items:
1. All Services (bold header link → `/services`)
2. Regular House Cleaning
3. Deep Cleaning
4. End of Tenancy Cleaning
5. Commercial & Office Cleaning
6. Carpet & Upholstery Cleaning
7. Window Cleaning
8. Post-Construction Cleaning

Dropdown style: white card, `rounded-2xl`, `shadow-lg`, `border border-sage-100`, min-width 240px, positioned below the trigger.

#### About Dropdown (hover to open)
Trigger: same hover pattern as Services

Items:
1. About Us
2. Service Area
3. Our Guarantee
4. Our Policies
5. FAQ

### CTA Button
- Label: "Get a Quote →"
- Background: `#344C3D`, white text, Poppins 15px bold
- Shape: `rounded-full` (pill)
- Shadow: `0 2px 8px rgba(52,76,61,0.28)`
- Hover: slight scale up + deeper shadow
- Inset from right: `margin-right: 12%`
- Links to `/contact`

---

## Typography System (apply globally)

| Context   | Size     | Weight | Line Height |
|-----------|----------|--------|-------------|
| Base body | 16px     | 400    | 1.5         |
| Nav       | 15px     | 600    | 1.5         |
| Top bar   | 13px     | 400/700| 1.5         |
| Hero      | 52–60px  | 700+   | 1.4         |

Font: **Poppins** (already loaded via `next/font` or Google Fonts)

---

## Mobile Behaviour

- Breakpoint: `md` (768px) — below this, hide nav and CTA, show hamburger
- Hamburger: three-line icon, top-right, toggles mobile menu
- Mobile menu (full-width panel below header):
  - All nav items listed vertically, 15px
  - Services items listed indented below (always visible or expandable accordion — use always visible for simplicity)
  - About items listed indented below
  - Divider
  - Phone number: phone icon + "Call us for a free quote" + "0800 726 669"
  - "Get a Quote" full-width button at bottom

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Full replacement |
| `src/lib/fonts.ts` | Ensure Poppins is exported and applied |
| `src/app/layout.tsx` | Confirm Poppins variable applied to `<html>` |
| `tailwind.config.ts` | Add Poppins to `fontFamily.sans` if not present |

---

## Out of Scope

- Join Our Team page (new page, separate task)
- Blog page and article sub-pages (separate task)
- Service Area, Our Guarantee, Our Policies pages (separate tasks — links can be added now, pages built later)
