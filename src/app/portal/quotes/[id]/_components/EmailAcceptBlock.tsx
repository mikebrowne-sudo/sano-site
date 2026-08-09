'use client'

import { useState } from 'react'
import { Copy, Check, Mail } from 'lucide-react'

/**
 * Generates a copy-paste, email-ready acceptance block for a quote: a short
 * terms summary + a styled "Review & accept" button linking to the quote's
 * share page (where the click-to-accept lives + full terms are shown). Paste
 * into Gmail / Outlook. Both a rich-HTML copy (for the button) and a plain-text
 * fallback are offered.
 */
export function EmailAcceptBlock({
  shareUrl,
  quoteNumber,
  clientName,
}: {
  shareUrl: string
  quoteNumber: string
  clientName?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'html' | 'text' | null>(null)

  const greeting = clientName ? `Hi ${clientName},` : 'Hi,'

  const html = `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;">
  <p>${greeting}</p>
  <p>Please find your quote (${quoteNumber}) ready to review. You can view the full details, terms, and accept it online here:</p>
  <p style="margin:20px 0;">
    <a href="${shareUrl}" style="display:inline-block;background:#076653;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;">Review &amp; accept your quote</a>
  </p>
  <p style="font-size:13px;color:#5c6b64;">By accepting online you agree to the terms shown on the quote. This quote is valid for 30 days. No lock-in contracts — you can pause or cancel any time. Sano Property Services Limited is GST registered (GST No. 148-387-648).</p>
  <p style="font-size:13px;color:#5c6b64;">If the button doesn't work, copy this link into your browser: ${shareUrl}</p>
</div>`

  const text = `${greeting}

Please find your quote (${quoteNumber}) ready to review. View the full details, terms, and accept it online here:

${shareUrl}

By accepting online you agree to the terms shown on the quote. This quote is valid for 30 days. No lock-in contracts — you can pause or cancel any time. Sano Property Services Limited is GST registered (GST No. 148-387-648).`

  async function copy(which: 'html' | 'text') {
    try {
      if (which === 'html' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(which === 'html' ? html : text)
      }
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback: plain text.
      await navigator.clipboard.writeText(which === 'html' ? html : text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 hover:text-sage-900">
        <Mail size={15} /> Email accept-block (copy for your own email)
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-sage-800">Email accept-block</p>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-sage-500 hover:text-sage-700">Close</button>
      </div>
      <p className="text-[12px] text-sage-500">Paste this into your own email (Gmail/Outlook). It includes a “Review &amp; accept” button linking to this quote’s page, where the client accepts and sees the full terms.</p>

      {/* Live preview */}
      <div className="rounded-lg border border-sage-100 bg-sage-50/40 p-3" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => copy('html')} className="inline-flex items-center gap-1.5 bg-sage-700 hover:bg-sage-600 text-white font-medium px-3 py-2 rounded-lg text-sm">
          {copied === 'html' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy (with button)</>}
        </button>
        <button type="button" onClick={() => copy('text')} className="inline-flex items-center gap-1.5 border border-sage-300 text-sage-700 hover:bg-sage-50 font-medium px-3 py-2 rounded-lg text-sm">
          {copied === 'text' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy plain text</>}
        </button>
      </div>
      <p className="text-[11px] text-sage-400">“Copy (with button)” pastes the styled button in Gmail/Outlook. If a client’s email strips styling, the plain-text version keeps the link.</p>
    </div>
  )
}
