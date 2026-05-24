# Sano Copy Rules (operational)

> Operational copy rules enforced by `sano-copy-reviewer` and any future
> Sano writer agents. The full brand kit lives at
> `F:\Sano\30-Accounting\Templates\Examples\BRAND.md` (voice, colour,
> typography, layout, components). This file is the **repo-tracked
> shortlist of rules an agent should always check** on customer-facing
> copy. Keep it short.
>
> Update this file when a copy rule changes. The agent reads it first.

---

## Voice

Sano should sound:

- Clear
- Calm
- Professional
- Practical
- Human
- Helpful
- Confident without being salesy

Use **NZ English** (`organise`, `colour`, `realise`, `practise`/`practice`).

Phone format: **`0800 726 686`**.

Avoid copy that sounds like:

- A press release
- A generic agency
- Polished marketing fluff
- Fake luxury positioning
- Greenwashing or vague sustainability claims
- Overclaiming

---

## Forbidden / over-used phrases

**Hard-banned** (flag every occurrence):

- "premium"
- "eco-friendly"
- "industry-leading"
- "streamlined"
- "world-class"
- "transformative"
- "luxury"

**Over-used** (flag if used more than once on a page, or where a plainer word fits):

- "bespoke"
- "tailored"
- "seamless"
- "elevated"

Also flag:

- Exaggerated trust claims without proof
- Fake local Auckland claims (must be true)
- Fake testimonials
- Vague sustainability claims (e.g. "green cleaning solutions")
- US spelling where NZ spelling is expected
- Emoji anywhere

---

## Em dashes

**Avoid em dashes in Sano writing.** This is Mike's preference and overrides
any older brand-kit example you may have seen.

Why: em dashes read as marketing voice on customer-facing copy. Sano voice
is calmer and reads better with full stops, commas, or parentheses.

**Scope:** This rule applies to **customer-facing copy** (public website,
marketing pages, quote/invoice/proposal documents, customer emails, SMS,
FAQ, blog). It does **not** apply to internal docs (CLAUDE.md, PORTAL.md,
agent instructions, ADRs, code comments, commit messages, PR descriptions).
Use em dashes freely in those internal contexts where they aid clarity.

**How to fix an em-dash flag:**

1. **Rewrite the sentence for clarity.** This is the preferred fix.
2. If a rewrite is awkward, use **commas**, **parentheses**, or a **full stop**.
3. **Never substitute a hyphen** for an em dash. That just creates a different
   typographic error.

Examples:

- ❌ "We organise the clean — show up on time — and get straight into it."
- ✅ "We organise the clean, show up on time, and get straight into it."
- ✅ "We organise the clean. We show up on time. And we get straight into it."

- ❌ "Sano means healthy — and that's how your space should feel."
- ✅ "Sano means healthy. That's how your space should feel."
- ✅ "Sano means healthy, and that's how your space should feel."

En dashes (`–`) for ranges (`2–4 hours`) are still fine — en dash ≠ em dash.

---

## Symbols & punctuation

- **No emoji.** Anywhere. Ever.
- **Curly quotes** in blockquotes (`"…"`), not straight quotes.
- Literal Unicode marks: `✓` ticks (in `sage-500`), `★` stars.
- Display H1 and H2 headings may use sentence case with a full stop where the page design calls for it. Reusable component section headings, cards, labels, navigation items, CTAs, and compact UI headings do not need full stops.
- Eyebrows are ALL CAPS with `0.22em` letter-spacing.

---

## Customer-facing risk checks

When reviewing quote, invoice, proposal, email, or SMS copy, also check:

- **Legal:** any claim Sano can't substantiate? Anything that misrepresents
  scope, timing, or pricing?
- **Pricing expectation:** does the wording promise something the quoted
  scope/price doesn't cover?
- **Compliance:** GST registered statement present where required?
- **Cancellation/lifecycle:** does the copy contradict the actual lifecycle
  (e.g. "no lock-in" + a 14-day notice clause)?

---

## When in doubt

Cut the line. Sano voice prefers fewer words over more.

---

## Source-of-truth notes

- This file is the **operational rule set** an agent enforces.
- The full brand kit (voice, palette, typography, components, document spec)
  is in `F:\Sano\30-Accounting\Templates\Examples\BRAND.md`.
- If a rule here conflicts with the external BRAND.md, **this file wins for
  agent enforcement** until the external file is updated to match.
- Known drift to resolve manually when convenient:
  - External BRAND.md §2 still allows em dashes ("`em dash — for asides`").
    Update the external file to match this doc when you're next in it.
