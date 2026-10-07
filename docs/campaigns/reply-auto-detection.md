# Campaign reply auto-detection (Google Apps Script → webhook)

Auto-marks a campaign lead as **responded** when they reply to Carol, so Carol
doesn't have to mark replies by hand and the auto follow-up stops for anyone who
has already replied.

## How it works

sano.nz runs on **Google Workspace** (Gmail). We do **not** change MX records or
reroute mail. Instead, a small **Google Apps Script** runs inside Carol's
Workspace on a timer:

1. It searches Carol's mailbox for **new replies** to campaign emails.
2. For each, it POSTs a small JSON payload to the campaign webhook.
3. The webhook (`/api/campaigns/resend-webhook`, forwarder path) matches the
   reply to the lead — by the `In-Reply-To` / `References` message-id first, then
   by the sender's email — and sets `responded_at` + flips the lead to
   `responded` + logs an activity row.
4. The script labels the thread `campaign-reply-processed` so it is never sent
   twice.

The webhook side is already built. This doc is the piece that lives in Google.

## One-time setup

### 1. Set the shared secret in Netlify

The forwarder path authenticates with a shared bearer token.

- Netlify → **sanonz1** → Environment variables → add:
  - **Key:** `RESEND_FORWARDER_SECRET`
  - **Value:** a long random string (generate one, e.g. 32+ chars). Keep it secret.
- Trigger a redeploy.

Use the **same** value in the Apps Script below (`FORWARDER_SECRET`).

### 2. Create the Apps Script

1. Go to **script.google.com** (signed in as **carol@sano.nz**) → **New project**.
2. Paste the script from `reply-detector.gs` (next to this file).
3. Set the two constants at the top:
   - `WEBHOOK_URL` = `https://sano.nz/api/campaigns/resend-webhook`
   - `FORWARDER_SECRET` = the same value you put in Netlify.
4. **Run** `processReplies` once manually → Google will prompt for Gmail
   permission → approve. Confirm it runs with no error.
5. **Triggers** (clock icon) → **Add trigger**:
   - Function: `processReplies`
   - Event source: **Time-driven** → **Minutes timer** → **Every 5 minutes**.

That's it. Replies now auto-mark within ~5 minutes.

## What the script sends

```json
{
  "from": "jane@acme.co.nz",
  "in_reply_to": "<the-original-message-id@resend>",
  "references": "<...> <...>",
  "subject": "Re: Cleaning at Acme Property Group"
}
```

The webhook matches on `in_reply_to`/`references` (most reliable), falling back
to `from`. No email body is sent — only what's needed to identify the lead.

## Safety / notes

- **Scope:** the Gmail search is narrow (replies in threads Sano started), and the
  `campaign-reply-processed` label guarantees each reply is sent once.
- **No message content leaves Google** beyond sender + subject + threading ids.
- **Manual marking still works** — this is additive. If the script is off, Carol
  can still mark replies in the portal.
- **Auto follow-up** stays OFF until you're confident this is running; a lead
  marked `responded` is excluded from the follow-up either way.
