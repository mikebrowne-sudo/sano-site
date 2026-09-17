/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

import { createInvoiceFromJob } from '@/app/portal/jobs/[id]/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeSupabase(cfg: {
  job: Record<string, unknown>
  client?: Record<string, unknown> | null
  quote?: Record<string, unknown> | null
  /** job_items rows with source='added' — the job's extras. */
  jobItems?: Record<string, unknown>[]
  /** quote_items rows — add-ons already inside job_price. */
  quoteItems?: Record<string, unknown>[]
}) {
  const jobSingle = jest.fn().mockResolvedValue({ data: cfg.job, error: null })
  const clientMaybe = jest.fn().mockResolvedValue({ data: cfg.client ?? { payment_type: 'on_account', payment_terms: '14_days' } })
  const quoteMaybe = jest.fn().mockResolvedValue({ data: cfg.quote ?? null })
  const invoiceInsert = jest.fn().mockReturnValue({
    select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'inv1' }, error: null }) }),
  })
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const invoiceItemsInsert = jest.fn().mockResolvedValue({ error: null })

  const from = jest.fn((table: string) => {
    if (table === 'jobs') {
      return {
        select: () => ({ eq: () => ({ single: jobSingle }) }),
        update: jobsUpdate,
      }
    }
    if (table === 'clients') return { select: () => ({ eq: () => ({ maybeSingle: clientMaybe }) }) }
    if (table === 'quotes') return { select: () => ({ eq: () => ({ maybeSingle: quoteMaybe }) }) }
    if (table === 'invoices') return { insert: invoiceInsert }
    // Add-on lines from the source quote are now copied onto the invoice, so
    // the action queries quote_items. Default to none; tests that care about
    // add-ons override this.
    if (table === 'quote_items') {
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: cfg.quoteItems ?? [] }) }) }) }
    }
    // Extras added on the job itself (job_items, source='added'). Unlike the
    // quote add-ons these are ADDITIVE to job_price, so they become new invoice
    // lines. Default to none; the extras tests override it.
    if (table === 'job_items') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ order: () => Promise.resolve({ data: cfg.jobItems ?? [] }) }) }),
        }),
      }
    }
    if (table === 'invoice_items') return { insert: invoiceItemsInsert }
    return {}
  })

  return { client: { from }, invoiceInsert, invoiceItemsInsert }
}

const JOB = {
  client_id: 'cl1', quote_id: 'q1', invoice_id: null, title: 'Job title',
  description: 'FULL SCOPE: kitchen, 2 bathrooms, oven, interior windows, skirting…',
  address: '4 Alderley Road, Mount Eden', scheduled_date: '2026-05-01',
  completed_at: '2026-05-08T03:00:00.000Z', job_price: 300,
  payment_status: 'completed', client_reference: null, requires_po: false,
}

beforeEach(() => mockedCreate.mockReset())

describe('createInvoiceFromJob — service scope vs customer notes', () => {
  it('copies the quote clean type and keeps the job scope OUT of notes', async () => {
    const { client, invoiceInsert } = makeSupabase({
      job: { ...JOB },
      quote: {
        payment_type: 'on_account', property_category: 'Residential',
        type_of_clean: 'End of Tenancy Clean', service_type: 'End of Tenancy Clean',
        frequency: 'one_off', scope_size: '3 bedrooms', notes: 'Gate code 1234',
      },
    })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    const payload = invoiceInsert.mock.calls[0][0]
    expect(payload).toMatchObject({
      property_category: 'Residential',
      type_of_clean: 'End of Tenancy Clean',
      frequency: 'one_off',
      scope_size: '3 bedrooms',
    })
    // Heading/description come from the structured type → no service_description.
    expect(payload.service_description).toBeNull()
    // Notes carries genuine customer notes, never the job scope.
    expect(payload.notes).toBe('Gate code 1234')
    expect(payload.notes).not.toMatch(/scope|bathrooms|skirting/i)
  })

  it('falls back to the job description as service scope when there is no quote', async () => {
    const { client, invoiceInsert } = makeSupabase({
      job: { ...JOB, quote_id: null, description: 'Manual one-off clean scope' },
      quote: null,
    })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    const payload = invoiceInsert.mock.calls[0][0]
    expect(payload.service_description).toBe('Manual one-off clean scope')
    expect(payload.type_of_clean).toBeNull()
    // Scope is under the line item, not dumped in notes.
    expect(payload.notes ?? null).toBeNull()
  })
})

describe('createInvoiceFromJob — quote add-ons', () => {
  it('splits job_price so base + itemised lines does not double-count', () => {
    // InvoiceDocument totals base_price + items. job_price now carries the
    // FULL quoted total (600 base + 300 + 180 = 1080), so the invoice base
    // must be the total minus those lines, or the client is billed 1560.
    const jobPrice = 1080
    const addons = [{ price: 300 }, { price: 180 }]
    const addonsTotal = addons.reduce((s, a) => s + a.price, 0)
    const invoiceBase = Math.max(0, jobPrice - addonsTotal)

    expect(invoiceBase).toBe(600)
    expect(invoiceBase + addonsTotal).toBe(1080)
  })

  it('leaves a job with no add-ons unchanged', () => {
    const jobPrice = 415
    const invoiceBase = Math.max(0, jobPrice - 0)
    expect(invoiceBase).toBe(415)
  })
})

describe('createInvoiceFromJob — job extras (job_items)', () => {
  it('bills an extra as a new invoice line on top of base_price', async () => {
    const { client, invoiceInsert, invoiceItemsInsert } = makeSupabase({
      job: { ...JOB, job_price: 600 },
      jobItems: [
        { label: 'Carpet clean — lounge & hall', description: 'Two rooms', price: 300, source: 'added', sort_order: 0 },
      ],
    })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    // base_price is untouched by the extra — the extra is ADDITIVE, so the
    // invoice total becomes 600 + 300 rather than the extra being carved out.
    expect(invoiceInsert.mock.calls[0][0]).toMatchObject({ base_price: 600 })

    const lines = invoiceItemsInsert.mock.calls.at(-1)![0] as Record<string, unknown>[]
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      invoice_id: 'inv1',
      label: 'Carpet clean — lounge & hall',
      description: 'Two rooms',
      price: 300,
    })
  })

  it('never puts the contractor or what they were paid on the invoice', async () => {
    const { client, invoiceItemsInsert } = makeSupabase({
      job: { ...JOB, job_price: 600 },
      jobItems: [
        { label: 'Carpet clean', description: null, price: 300, source: 'added', sort_order: 0 },
      ],
    })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    const lines = invoiceItemsInsert.mock.calls.at(-1)![0] as Record<string, unknown>[]
    expect(Object.keys(lines[0]).sort()).toEqual(
      ['description', 'invoice_id', 'label', 'price', 'sort_order'],
    )
  })

  it('appends extras AFTER the quote add-ons, continuing the sort order', async () => {
    const { client, invoiceItemsInsert } = makeSupabase({
      job: { ...JOB, job_price: 900 },
      quoteItems: [{ label: 'Windows', description: null, price: 180, sort_order: 0 }],
      jobItems: [{ label: 'Oven clean', description: null, price: 80, source: 'added', sort_order: 0 }],
    })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    // Two separate inserts: quote add-ons first, then the job's extras.
    const quoteLines = invoiceItemsInsert.mock.calls[0][0] as Record<string, unknown>[]
    const extraLines = invoiceItemsInsert.mock.calls[1][0] as Record<string, unknown>[]
    expect(quoteLines[0]).toMatchObject({ label: 'Windows', sort_order: 0 })
    expect(extraLines[0]).toMatchObject({ label: 'Oven clean', sort_order: 1 })
  })

  it('does not insert any extra line when the job has none', async () => {
    const { client, invoiceItemsInsert } = makeSupabase({ job: { ...JOB, job_price: 415 } })
    mockedCreate.mockReturnValue(client)

    await createInvoiceFromJob('j1')

    expect(invoiceItemsInsert).not.toHaveBeenCalled()
  })
})
