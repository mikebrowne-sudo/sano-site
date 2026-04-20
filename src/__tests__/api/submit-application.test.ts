/**
 * @jest-environment node
 */
import { POST } from '@/app/api/submit-application/route'
import { NextRequest } from 'next/server'
import type { JobApplicationPayload } from '@/types/application'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/submit-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(): JobApplicationPayload {
  return {
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '021 000 0000',
    email: 'jane@example.com',
    suburb: 'Mount Eden',
    application_type: 'contractor',
    has_license: true,
    has_vehicle: true,
    can_travel: true,
    has_experience: true,
    experience_types: ['residential'],
    experience_notes: '',
    has_equipment: true,
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    independent_work: true,
    work_rights_nz: true,
    has_insurance: null,
    willing_to_get_insurance: null,
    why_join_sano: '',
    confirm_truth: true,
  }
}

describe('POST /api/submit-application', () => {
  const originalLog = console.log
  beforeEach(() => {
    console.log = jest.fn()
  })
  afterEach(() => {
    console.log = originalLog
  })

  it('returns 200 and { ok: true } for a valid payload', async () => {
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('logs only the five redacted fields on success', async () => {
    await POST(makeRequest(validBody()))
    expect(console.log).toHaveBeenCalledWith(
      '[job-application] received',
      expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        suburb: 'Mount Eden',
        application_type: 'contractor',
      }),
    )
    const call = (console.log as jest.Mock).mock.calls[0][1]
    expect(Object.keys(call).sort()).toEqual(
      ['application_type', 'email', 'first_name', 'last_name', 'suburb'].sort(),
    )
  })

  it('returns 400 when first_name is missing', async () => {
    const res = await POST(makeRequest({ ...validBody(), first_name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await POST(makeRequest({ ...validBody(), email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when confirm_truth is false', async () => {
    const res = await POST(makeRequest({ ...validBody(), confirm_truth: false }))
    expect(res.status).toBe(400)
  })

  it('returns 200 when insurance booleans are null (insurance is optional)', async () => {
    const res = await POST(makeRequest({ ...validBody(), has_insurance: null, willing_to_get_insurance: null }))
    expect(res.status).toBe(200)
  })
})
