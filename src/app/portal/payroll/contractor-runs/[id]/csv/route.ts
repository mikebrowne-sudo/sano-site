// RETIRED (Phase 1, 2026-08-17) — legacy contractor pay-run CSV export.
//
// Exported one row per pay_run_item. That table is empty in production and can
// no longer be written to, so this export has no data to return. It is a
// read-only GET, so retiring it is about removing a dead entry point rather
// than closing a write path.
//
// Returns 410 Gone rather than redirecting: this endpoint served a file
// download, and bouncing a CSV request to an HTML page would hand callers a
// surprising content type. A status code states plainly that the resource is
// retired.
//
// The finance contractor-payment CSVs (/api/finance/contractor-payments-csv and
// /api/finance/cash-out-csv) read canonical contractor_invoices and are the
// supported exports.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      error: 'Legacy contractor pay-run CSV export is retired.',
      use: '/api/finance/contractor-payments-csv',
    },
    { status: 410 },
  )
}
