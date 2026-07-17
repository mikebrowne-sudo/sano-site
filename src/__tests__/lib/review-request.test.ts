import {
  reviewDefaultMessage,
  reviewSmsText,
  reviewEmailHtml,
  reviewEmailSubject,
  reviewFirstName,
  REVIEW_REASK_MONTHS,
} from '@/lib/review-request'

describe('review-request templates', () => {
  it('greets by first name', () => {
    expect(reviewFirstName('Marina Rabangaki')).toBe('Marina')
    expect(reviewFirstName(null)).toBe('there')
    expect(reviewDefaultMessage('recent', 'Marina Rabangaki')).toContain('Hi Marina,')
  })

  it('uses one consistent, time-neutral message for recent + previous', () => {
    const recent = reviewDefaultMessage('recent', 'Marina')
    const previous = reviewDefaultMessage('previous', 'Marina')
    expect(recent).not.toContain('today') // time-neutral — clean may not be same-day
    expect(recent).toContain('thanks again for choosing Sano')
    expect(recent).toEqual(previous) // unified body; only the email subject varies
  })

  it('SMS appends the review link to the (editable) message', () => {
    const sms = reviewSmsText('Hi Marina, please review us.', 'https://g.page/r/x/review')
    expect(sms).toBe('Hi Marina, please review us. https://g.page/r/x/review')
  })

  it('email wraps the message + the branded button + sign-off', () => {
    const html = reviewEmailHtml('Hi Marina,\n\nGreat working with you.', 'https://g.page/r/x/review')
    expect(html).toContain('Hi Marina,')
    expect(html).toContain('Great working with you.')
    expect(html).toContain('href="https://g.page/r/x/review"')
    expect(html).toContain('Leave a Google review')
    expect(html).toContain('The Sano team')
  })

  it('email subjects differ by variant', () => {
    expect(reviewEmailSubject('recent')).not.toEqual(reviewEmailSubject('previous'))
  })

  it('escapes HTML in an edited message', () => {
    const html = reviewEmailHtml('Hi <script>alert(1)</script>', 'https://x/review')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('re-ask window is 12 months', () => {
    expect(REVIEW_REASK_MONTHS).toBe(12)
  })
})
