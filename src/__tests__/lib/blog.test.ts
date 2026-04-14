// src/__tests__/lib/blog.test.ts
import { POSTS, getPostBySlug } from '@/lib/blog'

describe('POSTS', () => {
  it('has 5 posts', () => {
    expect(POSTS).toHaveLength(5)
  })

  it('each post has required fields', () => {
    for (const post of POSTS) {
      expect(post.slug).toBeTruthy()
      expect(post.title).toBeTruthy()
      expect(post.date).toBeTruthy()
      expect(post.excerpt).toBeTruthy()
      expect(post.image).toBeTruthy()
      expect(post.intro).toBeTruthy()
      expect(Array.isArray(post.sections)).toBe(true)
      expect(post.sections.length).toBeGreaterThan(0)
      expect(post.conclusion.heading).toBeTruthy()
      expect(post.conclusion.body).toBeTruthy()
    }
  })

  it('slugs are unique', () => {
    const slugs = POSTS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(POSTS.length)
  })
})

describe('getPostBySlug', () => {
  it('returns the matching post', () => {
    const post = getPostBySlug('5-practical-tips')
    expect(post?.slug).toBe('5-practical-tips')
  })

  it('returns undefined for unknown slug', () => {
    expect(getPostBySlug('nonexistent')).toBeUndefined()
  })
})
