'use client'

// Phase A — copy proposal share link.
//
// Small client button that copies the public share URL to the
// clipboard and briefly flashes a "Link copied" confirmation. Uses
// navigator.clipboard where available and falls back to a hidden
// textarea + document.execCommand for older browsers (keeps older
// user agents working).

import { useState } from 'react'
import { Link as LinkIcon, Check } from 'lucide-react'

export interface QuoteCopyLinkButtonProps {
  shareUrl: string
  label?: string
}

export function QuoteCopyLinkButton({ shareUrl, label = 'Copy Proposal Link' }: QuoteCopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      aria-live="polite"
    >
      {copied ? <Check size={16} /> : <LinkIcon size={16} />}
      <span>{copied ? 'Link copied' : label}</span>
    </button>
  )
}
