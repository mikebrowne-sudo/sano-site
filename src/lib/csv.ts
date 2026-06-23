// Small CSV helpers for the accountant-friendly finance exports.
// RFC 4180: every cell quoted, internal quotes doubled, newlines flattened
// so a stray line break can't break the row count.

export function csvCell(input: string | number | boolean | null | undefined): string {
  if (input == null || input === '') return ''
  const s = String(input).replace(/[\r\n]+/g, ' ')
  return `"${s.replace(/"/g, '""')}"`
}

export function buildCsv(
  header: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const h = header.map(csvCell).join(',')
  const lines = rows.map((r) => r.map(csvCell).join(','))
  return [h, ...lines].join('\r\n') + '\r\n'
}

export function fmtCsvDate(iso: string | null | undefined): string {
  return iso ? String(iso).slice(0, 10) : ''
}

export function csvResponse(csv: string, filename: string): Response {
  const safe = filename.replace(/[^\w.\-]+/g, '_')
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
