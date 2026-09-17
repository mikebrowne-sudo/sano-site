# Stripe go-live — taking real card payments

**Status as at 2026-09-18:** code is ready; `STRIPE_SECRET_KEY` in Netlify is
still an `sk_test_` key, so **no real card can be charged yet**.

---

## Why no one has ever paid by card

Zero checkout sessions across 171 invoices. Not customer preference — the key is
a **test** key. A test-mode checkout accepts only Stripe's test cards and
declines every real one, and nothing in the portal said so. The Pay button
looked fine and quietly failed.

`src/lib/stripe.ts` now exposes the mode, the portal warns staff on any unpaid
invoice, and the share page hides the Pay button entirely unless a real card can
be charged — so the customer never meets a button that will decline.

---

## The switch (Mike)

Everything below is in the Stripe Dashboard and Netlify. No code change.

### 1. Get the live secret key
Stripe Dashboard → toggle **Test mode OFF** (top right) → **Developers → API keys**
→ reveal **Secret key** → copy (`sk_live_…`).

### 2. Create the live webhook endpoint
Still in live mode: **Developers → Webhooks → Add endpoint**

- Endpoint URL: `https://sano.nz/api/stripe/webhook`
- Event: `checkout.session.completed` (that one only)
- Create, then reveal **Signing secret** → copy (`whsec_…`)

The test-mode webhook is a different endpoint with a different secret. The live
one must be created separately or the webhook signature check rejects every
event and invoices never flip to paid.

### 3. Set both in Netlify
```
netlify env:set STRIPE_SECRET_KEY sk_live_…
netlify env:set STRIPE_WEBHOOK_SECRET whsec_…
```
Both must change together. A live key with a test webhook secret takes the money
and never marks the invoice paid.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **not needed** — this is redirect-based
Checkout and the key is never used client-side.

### 4. Redeploy
Env changes do not apply to the running build.

---

## Verify with one real payment

Do this yourself before telling a customer card payment works.

1. Pick a small real unpaid invoice (or raise a $1 one).
2. Confirm the amber "Stripe is in TEST mode" banner is **gone** from
   `/portal/invoices/<id>`.
3. Open the share link. The **Pay this invoice** panel should now appear.
4. Check the amount shown matches the invoice total **to the cent**, GST included.
5. Pay with a real card.
6. Confirm, within a minute or so:
   - the share page shows **Payment received**
   - `/portal/invoices/<id>` shows **paid** with today's date
   - the linked job is stamped complete
   - Stripe Dashboard → Payments shows the charge
7. Refund it in Stripe if it was a test of a real invoice.

If the payment succeeds but the invoice stays unpaid, the webhook is wrong —
check **Developers → Webhooks → your endpoint → Recent deliveries** for a 400
(signature mismatch = wrong `STRIPE_WEBHOOK_SECRET`).

---

## What the code already handles

- **The charge equals the invoice total, GST included.** It previously charged
  the line total, which undercharged a GST-exclusive invoice by 15%. Both the
  route and the document now use `computeDocumentTotals`.
- **Only genuinely paid sessions mark an invoice paid.** A session can complete
  unpaid (async methods, expiry).
- **Webhook replays are safe.** Stripe retries until it gets a 2xx; the update is
  guarded with `.neq('status', 'paid')` so a second delivery changes nothing.
- **Already-paid invoices refuse checkout** before a session is created.

---

## Fees

~2.9% + 30c per transaction. On a $920 job that is roughly $27. Bank transfer
stays on every invoice and remains free — card is an added option, not a
replacement.
