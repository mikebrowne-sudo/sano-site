/**
 * Inbound SMS keyword classification.
 *
 * A "YES" reply writes a confirmation onto a pay record, so matching has to be
 * exact-token only. "yes but the oven took ages" is a contractor DISPUTING the
 * hours — treating that as "it went to plan" would record the opposite of what
 * they said.
 */

import {
  classifyInbound,
  confirmHoursReplyBody,
  nothingToConfirmReplyBody,
} from '@/lib/notifications/inbound-handler'

describe('classifyInbound — confirmation keywords', () => {
  it.each(['YES', 'yes', ' Yes ', 'Y', 'YEP', 'yup', 'CONFIRM', 'confirmed', 'OK', 'done'])(
    'treats %s as a confirmation', (body) => {
      expect(classifyInbound(body)).toEqual({
        kind: 'confirm_hours', keyword: body.trim().toUpperCase(),
      })
    },
  )

  // The important negatives: anything conversational is NOT a confirmation.
  it.each([
    'yes but the oven took ages',
    'yes, took 2 hours longer',
    'no',
    'not yet',
    'I finished early',
    'yesterday',
    'okay so about the job',
  ])('does not treat %s as a confirmation', (body) => {
    expect(classifyInbound(body).kind).toBe('other')
  })

  it('STOP still wins over everything', () => {
    expect(classifyInbound('STOP').kind).toBe('stop')
  })

  it('HELP still routes to support', () => {
    expect(classifyInbound('HELP').kind).toBe('help')
  })

  it.each([null, undefined, '', '   '])('treats %s as other', (body) => {
    expect(classifyInbound(body).kind).toBe('other')
  })
})

describe('reply bodies', () => {
  it('confirms back with the job and hours, so they know it landed', () => {
    const body = confirmHoursReplyBody('JOB-0042', '4')
    expect(body).toContain('JOB-0042')
    expect(body).toContain('4h')
    expect(body).toMatch(/Nothing else needed/i)
  })

  it('degrades gracefully with no hours', () => {
    expect(confirmHoursReplyBody('JOB-0042', null)).toContain('your hours')
  })

  it('says so when nothing was waiting, rather than going quiet', () => {
    expect(nothingToConfirmReplyBody()).toMatch(/no jobs waiting/i)
    expect(nothingToConfirmReplyBody()).toContain('hello@sano.nz')
  })

  // SMS segment hygiene — these go to real phones.
  it('keeps replies inside two SMS segments', () => {
    expect(confirmHoursReplyBody('JOB-0042', '4').length).toBeLessThanOrEqual(320)
    expect(nothingToConfirmReplyBody().length).toBeLessThanOrEqual(320)
  })
})
