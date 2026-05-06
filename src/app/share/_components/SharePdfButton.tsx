import { Download } from 'lucide-react'

export function SharePdfButton({ href, label = 'Download PDF' }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sage-700 text-white font-semibold text-sm shadow-sm hover:bg-sage-800 transition-colors"
    >
      <Download size={16} />
      {label}
    </a>
  )
}
