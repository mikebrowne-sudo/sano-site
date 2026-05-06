import { parseCookieHeader } from '@/lib/pdf/render-pdf'

describe('parseCookieHeader', () => {
  it('returns an empty array for an empty header', () => {
    expect(parseCookieHeader('', 'sano.nz')).toEqual([])
  })

  it('parses a single cookie', () => {
    expect(parseCookieHeader('sb-access-token=abc123', 'sano.nz')).toEqual([
      { name: 'sb-access-token', value: 'abc123', domain: 'sano.nz', path: '/' },
    ])
  })

  it('parses multiple semicolon-separated cookies', () => {
    expect(parseCookieHeader('a=1; b=2; c=3', 'sano.nz')).toEqual([
      { name: 'a', value: '1', domain: 'sano.nz', path: '/' },
      { name: 'b', value: '2', domain: 'sano.nz', path: '/' },
      { name: 'c', value: '3', domain: 'sano.nz', path: '/' },
    ])
  })

  it('skips malformed pairs without an equals sign', () => {
    expect(parseCookieHeader('a=1; broken; b=2', 'sano.nz')).toEqual([
      { name: 'a', value: '1', domain: 'sano.nz', path: '/' },
      { name: 'b', value: '2', domain: 'sano.nz', path: '/' },
    ])
  })

  it('preserves values containing equals signs (e.g. base64)', () => {
    expect(parseCookieHeader('sb=abc=def==', 'sano.nz')).toEqual([
      { name: 'sb', value: 'abc=def==', domain: 'sano.nz', path: '/' },
    ])
  })
})
