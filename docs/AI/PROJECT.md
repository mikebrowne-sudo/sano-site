# Sano - Project (1-page elevator pitch)

> 1-pager. The deep version is [`docs/PORTAL.md`](../PORTAL.md). The operating rules are [`docs/AI/SANO_EXECUTION_MODE.md`](./SANO_EXECUTION_MODE.md).

## What it is
Auckland cleaning business with a marketing site at https://sano.nz and an internal CRM at `/portal`. Two surfaces, one Next.js codebase, deployed via Netlify (`sanonz1`).

## Positioning
Reliable, detail-focused Auckland cleaning. Cleaning that improves how a space feels, not just how it looks.
**Tagline:** Clean spaces - Healthy living.

## Surfaces
- **Marketing site** - public homepage, services, about, contact, FAQ. Conversion target: residential + commercial enquiries.
- **Portal CRM** (`/portal`) - staff-only. Quotes, invoices, jobs, clients, people, payroll, settings. Auth-gated.
- **Contractor mobile views** (`/contractor`) - mobile-first contractor app surfaces.
- **Public share routes** (`/share/quote/[token]`, `/share/invoice/[token]`) - token-keyed deliverables for clients.

## Stack
Next.js 14 (App Router) - TypeScript - Tailwind - Framer Motion - Supabase (Auth + Postgres + RLS) - Resend (email) - Stripe (payments) - Twilio (SMS) - Mapbox (NZ-biased address autocomplete) - Puppeteer (server-side PDF) - Jest.

## Repo
- Path: `F:\Sano\01-Site`
- GitHub: `mikebrowne-sudo/sano-site`
- Live: https://sano.nz
- Netlify: `sanonz1` (auto-deploys from `main`, PR previews per branch)

## Where to look next
- Architecture and phased history - [`docs/PORTAL.md`](../PORTAL.md)
- Operating rules - [`docs/AI/SANO_EXECUTION_MODE.md`](./SANO_EXECUTION_MODE.md)
- What's currently live - [`docs/AI/STATE.md`](./STATE.md)
- Immediate queue - [`docs/AI/NEXT.md`](./NEXT.md)
- Sequencing - [`docs/AI/ROADMAP.md`](./ROADMAP.md)
- Architectural decisions - [`docs/AI/DECISIONS.md`](./DECISIONS.md)
- Personal/cross-project notes - [`docs/AI/OBSIDIAN_SECOND_BRAIN.md`](./OBSIDIAN_SECOND_BRAIN.md)
