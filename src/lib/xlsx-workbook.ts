// Small Excel (.xlsx) writer for the finance exports, on top of exceljs.
//
// Callers describe sheets as plain data (columns + rows); this turns them into
// a real workbook: typed cells (dates are dates, money is numeric with 2dp),
// bold frozen header, auto-filter, and an optional SUM totals row so the
// accountant can re-total after filtering.

import ExcelJS from 'exceljs'

export type CellKind = 'text' | 'date' | 'money' | 'number'
export type CellValue = string | number | boolean | null | undefined

export interface SheetColumn {
  header: string
  key: string
  kind?: CellKind
  width?: number
  /** Add a SUM in the totals row for this column. */
  total?: boolean
}

export interface TableSheet {
  name: string
  /** Optional lines printed above the table (title, notes). */
  intro?: string[]
  columns: SheetColumn[]
  rows: Array<Record<string, CellValue>>
}

export interface KeyValueSheet {
  name: string
  /** Rows of [label, value, note?]. A row with only a label is a heading. */
  lines: Array<[string, CellValue?, string?]>
}

const MONEY_FMT = '#,##0.00;[Red]-#,##0.00'
const DATE_FMT = 'yyyy-mm-dd'

/** 'YYYY-MM-DD' → a UTC Date (Excel shows the same calendar day). */
function toDate(v: CellValue): Date | string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return v == null || v === '' ? null : String(v)
  return new Date(`${v.slice(0, 10)}T00:00:00Z`)
}

/** Excel sheet names: ≤31 chars, none of : \ / ? * [ ]. */
export function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31)
}

function colLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function addTableSheet(wb: ExcelJS.Workbook, sheet: TableSheet): void {
  const ws = wb.addWorksheet(safeSheetName(sheet.name))
  const intro = sheet.intro ?? []
  intro.forEach((line, i) => {
    const cell = ws.getCell(i + 1, 1)
    cell.value = line
    if (i === 0) cell.font = { bold: true, size: 13 }
    else cell.font = { italic: true, color: { argb: 'FF666666' } }
  })
  const headerRow = intro.length > 0 ? intro.length + 2 : 1

  sheet.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1)
    col.width = c.width ?? (c.kind === 'money' ? 14 : c.kind === 'date' ? 12 : Math.max(12, Math.min(40, c.header.length + 4)))
    if (c.kind === 'money') col.numFmt = MONEY_FMT
    if (c.kind === 'date') col.numFmt = DATE_FMT
  })

  const hr = ws.getRow(headerRow)
  sheet.columns.forEach((c, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = c.header
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFE8' } }
    cell.border = { bottom: { style: 'thin' } }
  })

  sheet.rows.forEach((r, ri) => {
    const row = ws.getRow(headerRow + 1 + ri)
    sheet.columns.forEach((c, ci) => {
      const raw = r[c.key]
      const cell = row.getCell(ci + 1)
      if (c.kind === 'date') cell.value = toDate(raw)
      else if (c.kind === 'money' || c.kind === 'number') cell.value = raw == null || raw === '' ? null : Number(raw)
      else cell.value = raw == null ? '' : String(raw)
    })
  })

  const firstData = headerRow + 1
  const lastData = headerRow + sheet.rows.length
  if (sheet.columns.some((c) => c.total) && sheet.rows.length > 0) {
    const tr = ws.getRow(lastData + 1)
    tr.getCell(1).value = 'Total'
    tr.font = { bold: true }
    sheet.columns.forEach((c, ci) => {
      if (!c.total) return
      const L = colLetter(ci + 1)
      const result = sheet.rows.reduce((s, r) => s + Number(r[c.key] ?? 0), 0)
      tr.getCell(ci + 1).value = { formula: `SUBTOTAL(9,${L}${firstData}:${L}${lastData})`, result: Math.round(result * 100) / 100 }
      tr.getCell(ci + 1).border = { top: { style: 'thin' } }
    })
  }

  ws.views = [{ state: 'frozen', ySplit: headerRow }]
  if (sheet.rows.length > 0) {
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastData, column: sheet.columns.length } }
  }
}

export function addKeyValueSheet(wb: ExcelJS.Workbook, sheet: KeyValueSheet): void {
  const ws = wb.addWorksheet(safeSheetName(sheet.name))
  ws.getColumn(1).width = 52
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 70
  sheet.lines.forEach(([label, value, note], i) => {
    const row = ws.getRow(i + 1)
    row.getCell(1).value = label
    if (value === undefined && !note) {
      row.getCell(1).font = { bold: true, size: i === 0 ? 14 : 11 }
      return
    }
    const v = row.getCell(2)
    if (typeof value === 'number') {
      v.value = value
      v.numFmt = MONEY_FMT
    } else {
      v.value = value == null ? '' : value
    }
    if (note) {
      row.getCell(3).value = note
      row.getCell(3).font = { color: { argb: 'FF666666' } }
    }
  })
}

export async function workbookBuffer(build: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sano portal'
  wb.created = new Date()
  // Recalculate the SUBTOTAL rows on open (cached results aren't always kept).
  wb.calcProperties.fullCalcOnLoad = true
  build(wb)
  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out as ArrayBuffer)
}

export function xlsxResponse(buf: Buffer, filename: string): Response {
  const safe = filename.replace(/[^\w.\-]+/g, '_')
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
