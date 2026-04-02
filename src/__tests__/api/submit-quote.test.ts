/**
 * @jest-environment node
 */
import { POST } from '@/app/api/submit-quote/route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
const mockSupabaseClient = { from: mockFrom }

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
}))

// Mock Resend helpers
jest.mock('@/lib/resend', () => ({
  sendQuoteConfirmation: jest.fn().mockResolvedValue(undefined),
  sendQuoteNotification: jest.fn().mockResolvedValue(undefined),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/submit-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '021 000 0000',
  service: 'deep-cleaning',
  postcode: '1010',
  preferredDate: '',
  message: '',
}

describe('POST /api/submit-quote', () => {
  it('returns 200 for valid input', async () => {
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({ ...validBody, name: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const req = makeRequest({ ...validBody, email: 'not-an-email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when service is missing', async () => {
    const req = makeRequest({ ...validBody, service: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when postcode is missing', async () => {
    const req = makeRequest({ ...validBody, postcode: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
