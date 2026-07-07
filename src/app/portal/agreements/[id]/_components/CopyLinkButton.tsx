'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="flex-1 rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-xs text-sage-700 font-mono" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
        className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-sm hover:bg-sage-50 shrink-0"
      >
        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
