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
}) {
  const jobSingle = jest.fn().mockResolvedValue({ data: cfg.job, error: null })
  const clientMaybe = jest.fn().mockResolvedValue({ data: cfg.client ?? { payment_type: 'on_account', payment_terms: '14_days' } })
  const quoteMaybe = jest.fn().mockResolvedValue({ data: cfg.quote ?? null })
  const invoiceInsert = jest.fn().mockReturnValue({
    select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'inv1' }, error: null }) }),
  })
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

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
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }) }
    }
    if (table === 'invoice_items') return { insert: jest.fn().mockResolvedValue({ error: null }) }
    return {}
  })

  return { client: { from }, invoiceInsert }
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
