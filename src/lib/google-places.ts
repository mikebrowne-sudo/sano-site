import 'server-only'
import { unstable_cache } from 'next/cache'

// Google reviews display (2026-07, Phase 2). Reads the Sano listing's overall
// rating, total review count and a handful of recent reviews from the Google
// Places API (Place Details). No OAuth / owner approval needed — just a Google
// Maps Platform API key with the Places API enabled.
//
//   GOOGLE_PLACES_API_KEY  — Maps Platform key (Places API enabled)
//   SANO_GOOGLE_PLACE_ID   — the Sano Business Profile's Place ID
//
// Place Details returns at most ~5 reviews (Google picks them) and can't reply
// to reviews — that's what the heavier Business Profile API is for, deferred.
// Results are cached 6h so we don't pay per page load or hit rate limits.

const PLACES_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json'
const TEXTSEARCH_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
const CACHE_SECONDS = 6 * 60 * 60

export interface GoogleReview {
  author: string
  rating: number
  text: string
  relativeTime: string
  /** Unix seconds — for stable sort/keys. */
  time: number
  profilePhoto: string | null
}

export interface PlaceReviews {
  /** Overall listing rating, e.g. 4.9. */
  rating: number | null
  /** Total number of reviews on the listing. */
  total: number | null
  reviews: GoogleReview[]
  /** True once both env vars are set (key + place id). */
  configured: boolean
  /** True when the key is set but the place id isn't (setup half-done). */
  needsPlaceId: boolean
  /** Populated on an API/transport failure. */
  error?: string
}

export interface PlaceCandidate {
  placeId: string
  name: string
  address: string
  rating: number | null
  total: number | null
}

/** Normalise a raw Places review object into our shape. Exported for tests. */
export function mapGoogleReview(raw: unknown): GoogleReview {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    author: typeof r.author_name === 'string' && r.author_name.trim() ? r.author_name.trim() : 'Google user',
    rating: typeof r.rating === 'number' ? r.rating : 0,
    text: typeof r.text === 'string' ? r.text.trim() : '',
    relativeTime: typeof r.relative_time_description === 'string' ? r.relative_time_description : '',
    time: typeof r.time === 'number' ? r.time : 0,
    profilePhoto: typeof r.profile_photo_url === 'string' && r.profile_photo_url ? r.profile_photo_url : null,
  }
}

/** "127 reviews" / "1 review" / "" — exported for tests. */
export function formatReviewCount(total: number | null): string {
  if (total == null) return ''
  return `${total.toLocaleString('en-NZ')} ${total === 1 ? 'review' : 'reviews'}`
}

/** Filled (1) / half (0.5) / empty (0) star buckets for a rating out of 5. */
export function starBuckets(rating: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) out.push(1)
    else if (rating >= i - 0.5) out.push(0.5)
    else out.push(0)
  }
  return out
}

async function fetchPlaceDetails(): Promise<PlaceReviews> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  const placeId = process.env.SANO_GOOGLE_PLACE_ID?.trim()
  if (!key) return { rating: null, total: null, reviews: [], configured: false, needsPlaceId: false }
  if (!placeId) return { rating: null, total: null, reviews: [], configured: false, needsPlaceId: true }

  const url = new URL(PLACES_ENDPOINT)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'rating,user_ratings_total,reviews')
  url.searchParams.set('reviews_sort', 'newest')
  url.searchParams.set('reviews_no_translations', 'true')
  url.searchParams.set('language', 'en')
  url.searchParams.set('key', key)

  try {
    const res = await fetch(url.toString())
    const data = (await res.json()) as {
      status?: string
      error_message?: string
      result?: { rating?: number; user_ratings_total?: number; reviews?: unknown[] }
    }
    if (data.status !== 'OK') {
      return {
        rating: null, total: null, reviews: [], configured: true, needsPlaceId: false,
        error: data.error_message || data.status || 'Places API error',
      }
    }
    const r = data.result ?? {}
    return {
      rating: typeof r.rating === 'number' ? r.rating : null,
      total: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
      reviews: (r.reviews ?? []).map(mapGoogleReview).filter((rv) => rv.text.length > 0),
      configured: true,
      needsPlaceId: false,
    }
  } catch (e) {
    return {
      rating: null, total: null, reviews: [], configured: true, needsPlaceId: false,
      error: e instanceof Error ? e.message : 'Places API request failed',
    }
  }
}

/** Cached 6h so the portal doesn't pay per load or hit Places rate limits. */
export const getPlaceReviews = unstable_cache(fetchPlaceDetails, ['sano-google-place-reviews'], {
  revalidate: CACHE_SECONDS,
})

/**
 * Resolve Place ID candidates from a text query — used only for setup, when the
 * key is set but SANO_GOOGLE_PLACE_ID isn't yet, so Mike can copy the right ID.
 */
export async function findPlaceCandidates(query: string): Promise<PlaceCandidate[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!key || !query.trim()) return []
  const url = new URL(TEXTSEARCH_ENDPOINT)
  url.searchParams.set('query', query.trim())
  url.searchParams.set('region', 'nz')
  url.searchParams.set('key', key)
  try {
    const res = await fetch(url.toString())
    const data = (await res.json()) as {
      status?: string
      results?: Array<{ place_id?: string; name?: string; formatted_address?: string; rating?: number; user_ratings_total?: number }>
    }
    if (data.status !== 'OK' || !Array.isArray(data.results)) return []
    return data.results.slice(0, 5).map((r) => ({
      placeId: r.place_id ?? '',
      name: r.name ?? '(unnamed)',
      address: r.formatted_address ?? '',
      rating: typeof r.rating === 'number' ? r.rating : null,
      total: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
    })).filter((c) => c.placeId)
  } catch {
    return []
  }
}
