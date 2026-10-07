import { resolveSupplierIdentity, buildIssuedSnapshot, type SnapshotLineInput } from '@/lib/contractor-statement-snapshot'

describe('resolveSupplierIdentity — legal_name → company_name (entity) → full_name', () => {
  it('uses verified legal_name first', () => {
    expect(resolveSupplierIdentity({ full_name: 'Jane Doe', legal_name: 'Jane Doe Holdings Ltd', company_name: null, business_structure: 'company', tax_review_status: 'complete' }))
      .toEqual({ supplier_name: 'Jane Doe Holdings Ltd', contractor_contact_name: 'Jane Doe', supplier_name_source: 'legal_name', supplier_identity_verified: true })
  })

  it('uses legal_name even when unverified, but records unverified', () => {
    const r = resolveSupplierIdentity({ full_name: 'Jane Doe', legal_name: 'Jane Doe Holdings Ltd', company_name: null, business_structure: 'company', tax_review_status: null })
    expect(r.supplier_name).toBe('Jane Doe Holdings Ltd')
    expect(r.supplier_identity_verified).toBe(false)
  })

  it('falls to company_name where the contractor trades through an entity (Kritika → VMK LTD)', () => {
    expect(resolveSupplierIdentity({ full_name: 'Kritika Kumar', legal_name: null, company_name: 'VMK LTD', business_structure: 'company', tax_review_status: null }))
      .toEqual({ supplier_name: 'VMK LTD', contractor_contact_name: 'Kritika Kumar', supplier_name_source: 'company_name', supplier_identity_verified: false })
  })

  it('does NOT use company_name for a sole trader — falls to full_name', () => {
    const r = resolveSupplierIdentity({ full_name: 'Sam Smith', legal_name: null, company_name: 'Sams Cleaning', business_structure: 'sole_trader', tax_review_status: null })
    expect(r.supplier_name).toBe('Sam Smith')
    expect(r.supplier_name_source).toBe('full_name')
  })

  it('falls back to full_name when nothing else is present', () => {
    expect(resolveSupplierIdentity({ full_name: 'Sam Smith', legal_name: null, company_name: null, business_structure: null, tax_review_status: null }).supplier_name).toBe('Sam Smith')
  })
})

describe('buildIssuedSnapshot', () => {
  const supplier = resolveSupplierIdentity({ full_name: 'Kritika Kumar', legal_name: null, company_name: 'VMK LTD', business_structure: 'company', tax_review_status: null })
  const line = (o: Partial<SnapshotLineInput> & { contractor_invoice_id: string; amount: number; service_date: string }): SnapshotLineInput => ({
    invoice_number: 'CI-0000', job_number: 'JOB-1', description: 'Clean', site: 'Site', hours: 2, rate: 40, pay_basis: 'hourly', gst_status: 'not_assessed', gst_amount: null, ...o,
  })

  it('captures supplier identity + totals; GST only from applied lines', () => {
    const snap = buildIssuedSnapshot({
      statement_number: 'STMT-0001', contractor_id: 'k', supplier,
      period_start: '2026-07-01', period_end: '2026-07-15',
      issued_at: '2026-07-21T00:00:00Z', review_due_at: '2026-07-26T00:00:00Z',
      lines: [
        line({ contractor_invoice_id: '1', amount: 230, gst_status: 'applied', gst_amount: 30, service_date: '2026-07-02' }),
        line({ contractor_invoice_id: '2', amount: 140, gst_status: 'pending_review', gst_amount: 18, service_date: '2026-07-03' }),
        line({ contractor_invoice_id: '3', amount: 100, gst_status: 'not_assessed', gst_amount: null, service_date: '2026-06-30' }), // carried
      ],
    })
    expect(snap.supplier_name).toBe('VMK LTD')
    expect(snap.contractor_contact_name).toBe('Kritika Kumar')
    expect(snap.subtotal).toBe(470)
    expect(snap.total_payable).toBe(470)
    expect(snap.gst_total).toBe(30)          // only the applied line
    expect(snap.gst_review_count).toBe(2)    // pending_review + not_assessed
    // flagged line's gst_amount is nulled in the snapshot (never a claimed split)
    expect(snap.lines.find((l) => l.contractor_invoice_id === '2')!.gst_amount).toBeNull()
    // carried-forward derived from service_date < period_start
    expect(snap.lines.find((l) => l.contractor_invoice_id === '3')!.carried_forward).toBe(true)
    expect(snap.lines.find((l) => l.contractor_invoice_id === '1')!.carried_forward).toBe(false)
  })

  it('sums frozen withholding into wht_total; 0 when no line is schedular (PR 9)', () => {
    const noWht = buildIssuedSnapshot({
      statement_number: 'STMT-0003', contractor_id: 'k', supplier,
      period_start: '2026-07-01', period_end: '2026-07-15',
      issued_at: '2026-07-21T00:00:00Z', review_due_at: '2026-07-26T00:00:00Z',
      lines: [line({ contractor_invoice_id: '1', amount: 200, service_date: '2026-07-02' })],
    })
    expect(noWht.wht_total).toBe(0)

    const withWht = buildIssuedSnapshot({
      statement_number: 'STMT-0004', contractor_id: 'k', supplier,
      period_start: '2026-07-01', period_end: '2026-07-15',
      issued_at: '2026-07-21T00:00:00Z', review_due_at: '2026-07-26T00:00:00Z',
      lines: [
        line({ contractor_invoice_id: '1', amount: 1500, service_date: '2026-07-02', wht_amount: 375, wht_rate: 0.2, gross_ex_gst: 1875, net_paid: 1500, contractor_payment_snapshot_id: 's1' }),
        line({ contractor_invoice_id: '2', amount: 100, service_date: '2026-07-03' }), // ordinary, no wht
      ],
    })
    expect(withWht.wht_total).toBe(375)
    // the frozen fields survive onto the snapshot line
    expect(withWht.lines.find((l) => l.contractor_invoice_id === '1')!.wht_amount).toBe(375)
    expect(withWht.lines.find((l) => l.contractor_invoice_id === '1')!.contractor_payment_snapshot_id).toBe('s1')
  })

  it('orders lines by service date', () => {
    const snap = buildIssuedSnapshot({
      statement_number: 'STMT-0002', contractor_id: 'k', supplier,
      period_start: '2026-07-01', period_end: '2026-07-15',
      issued_at: '2026-07-21T00:00:00Z', review_due_at: '2026-07-26T00:00:00Z',
      lines: [line({ contractor_invoice_id: 'b', amount: 100, service_date: '2026-07-10' }), line({ contractor_invoice_id: 'a', amount: 100, service_date: '2026-07-02' })],
    })
    expect(snap.lines.map((l) => l.contractor_invoice_id)).toEqual(['a', 'b'])
  })
})
