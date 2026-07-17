import { mapGoogleReview, formatReviewCount, starBuckets } from '@/lib/google-places'

describe('google-places helpers', () => {
  it('maps a raw Places review into our shape', () => {
    const r = mapGoogleReview({
      author_name: '  Marina R  ',
      rating: 5,
      text: '  Fantastic clean, spotless.  ',
      relative_time_description: '2 weeks ago',
      time: 1710000000,
      profile_photo_url: 'https://example.com/p.jpg',
    })
    expect(r).toEqual({
      author: 'Marina R',
      rating: 5,
      text: 'Fantastic clean, spotless.',
      relativeTime: '2 weeks ago',
      time: 1710000000,
      profilePhoto: 'https://example.com/p.jpg',
    })
  })

  it('falls back gracefully on missing fields', () => {
    const r = mapGoogleReview({})
    expect(r.author).toBe('Google user')
    expect(r.rating).toBe(0)
    expect(r.text).toBe('')
    expect(r.profilePhoto).toBeNull()
  })

  it('formats the review count with pluralisation', () => {
    expect(formatReviewCount(null)).toBe('')
    expect(formatReviewCount(1)).toBe('1 review')
    expect(formatReviewCount(23)).toBe('23 reviews')
    expect(formatReviewCount(1234)).toBe('1,234 reviews')
  })

  it('buckets stars as filled / half / empty', () => {
    expect(starBuckets(5)).toEqual([1, 1, 1, 1, 1])
    expect(starBuckets(4.5)).toEqual([1, 1, 1, 1, 0.5])
    expect(starBuckets(4.2)).toEqual([1, 1, 1, 1, 0])
    expect(starBuckets(0)).toEqual([0, 0, 0, 0, 0])
    expect(starBuckets(3.7)).toEqual([1, 1, 1, 0.5, 0])
  })
})
