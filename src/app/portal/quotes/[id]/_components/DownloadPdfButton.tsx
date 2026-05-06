import { Download } from 'lucide-react'

export function DownloadPdfButton({ href, label = 'Download PDF' }: { href: string; label?: string }) {
  // Server component — renders an <a> with `download` so the browser saves
  // the response from the PDF route directly. The route already sets
  // Content-Disposition: attachment, so this attribute is belt-and-braces.
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
    >
      <Download size={16} />
      {label}
    </a>
  )
}
