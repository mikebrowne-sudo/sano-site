'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Link2, Check, Printer } from 'lucide-react'
import type { ProposalStatus } from '@/lib/proposals/types'
import { ProposalStatusBadge } from './ProposalStatusBadge'

type InternalPreviewBarProps = {
  status: ProposalStatus
  label?: string
  sublabel?: string
  shareUrl?: string | null
  backHref?: string
  backLabel?: string
}

export function InternalPreviewBar({
  status,
  label = 'Internal Proposal Preview',
  sublabel,
  shareUrl,
  backHref,
  backLabel,
}: InternalPreviewBarProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable (older browsers / insecure context).
      // Fall back to a prompt so the operator can still grab the URL.
      window.prompt('Copy share link:', shareUrl)
    }
  }

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-sage-100 print:hidden">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors"
          >
            <ArrowLeft size={14} />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <ProposalStatusBadge status={status} />
        <div className="text-sage-700 text-sm font-medium">{label}</div>
        {sublabel && (
          <div className="text-sage-500 text-xs hidden sm:inline">{sublabel}</div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!shareUrl}
            title={shareUrl ?? 'No share link yet'}
            className={
              shareUrl
                ? 'inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-sage-50 transition-colors'
                : 'inline-flex items-center gap-1.5 border border-sage-200 text-sage-500 font-medium px-3 py-1.5 rounded-lg text-xs cursor-not-allowed opacity-70'
            }
          >
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? 'Copied' : 'Copy share link'}
          </button>
          <button
            type="button"
            disabled
            title="Print / PDF will be wired in a later milestone"
            className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-500 font-medium px-3 py-1.5 rounded-lg text-xs cursor-not-allowed opacity-70"
          >
            <Printer size={14} />
            Print / PDF
          </button>
          <button
            type="button"
            disabled
            title="Send flow comes in the next milestone"
            className="inline-flex items-center gap-1.5 bg-sage-500/70 text-white font-semibold px-3 py-1.5 rounded-lg text-xs cursor-not-allowed opacity-80"
          >
            <Send size={14} />
            Send proposal
          </button>
        </div>
      </div>
    </div>
  )
}
