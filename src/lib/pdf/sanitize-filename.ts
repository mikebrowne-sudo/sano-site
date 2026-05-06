const ALLOWED = /[A-Za-z0-9 .\-_]/
const FALLBACK = 'Sano Document'

export function sanitizePdfFilename(stem: string): string {
  // Collapse all whitespace runs (incl. tabs / newlines) to a single
  // space FIRST, so that ASCII control whitespace doesn't get
  // converted to '_' by the per-character pass below. The trim()
  // here handles leading/trailing whitespace; the per-char pass then
  // replaces any remaining disallowed characters with '_'.
  const collapsed = stem.replace(/\s+/g, ' ').trim()
  let out = ''
  for (const ch of collapsed) {
    out += ALLOWED.test(ch) ? ch : '_'
  }
  if (out.length === 0 || /^_+$/.test(out)) return FALLBACK
  return out
}
