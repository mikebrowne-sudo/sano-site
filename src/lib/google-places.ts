import 'server-only'
import { unstable_cache } from 'next/cache'

// Google reviews display (2026-07, Phase 2). Reads the Sano listing's overall
// rating, total review count and a handful of recent reviews from the Google
// Places API (New) — https://places.googleapis.com/v1. No OAuth / owner approval
// needed — just a Google Maps Platform key with "Places API (New)" enabled.
//
//   GOOGLE_PLACES_API_KEY  — Maps Platform key (Places API New enabled)
//   SANO_GOOGLE_PLACE_ID   — the Sano listing's Place ID
//
// Place Details returns at most ~5 reviews (Google picks them) and can't reply
// to reviews — that's what the heavier Business Profile API is for, deferred.
// Results are cached 6h so we don't pay per page load or hit rate limits.

const PLACES_V1 = 'https://places.googleapis.com/v1/places'
const CACHE_SECONDS = 6 * 60 * 60

export interface GoogleReview {
  author: string
  rating: number
  text: string
  relativeTime: string
  /** RFC3339 publish time — used for stable React keys. */
  time: string
  profilePhoto: string | null
}

export interface PlaceReviews {
  /** Overall listing rating, e.g. 4.9. Null when the listing has no reviews. */
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

/** Normalise a Places API (New) review object into our shape. Exported for tests. */
export function mapGoogleReview(raw: unknown): GoogleReview {
  const r = (raw ?? {}) as Record<string, unknown>
  const author = (r.authorAttribution ?? {}) as Record<string, unknown>
  const textObj = (r.text ?? r.originalText ?? {}) as Record<string, unknown>
  const displayName = typeof author.displayName === 'string' ? author.displayName.trim() : ''
  const text = typeof textObj.text === 'string' ? textObj.text.trim() : ''
  return {
    author: displayName || 'Google user',
    rating: typeof r.rating === 'number' ? r.rating : 0,
    text,
    relativeTime: typeof r.relativePublishTimeDescription === 'string' ? r.relativePublishTimeDescription : '',
    time: typeof r.publishTime === 'string' ? r.publishTime : '',
    profilePhoto: typeof author.photoUri === 'string' && author.photoUri ? author.photoUri : null,
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

  try {
    const res = await fetch(`${PLACES_V1}/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
    })
    const data = (await res.json()) as {
      error?: { message?: string; status?: string }
      rating?: number
      userRatingCount?: number
      reviews?: unknown[]
    }
    if (!res.ok || data.error) {
      return {
        rating: null, total: null, reviews: [], configured: true, needsPlaceId: false,
        error: data.error?.message || `Places API ${res.status}`,
      }
    }
    return {
      rating: typeof data.rating === 'number' ? data.rating : null,
      total: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
      reviews: (data.reviews ?? []).map(mapGoogleReview).filter((rv) => rv.text.length > 0),
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
 * key is set but SANO_GOOGLE_PLACE_ID isn't yet, so staff can copy the right ID.
 */
export async function findPlaceCandidates(query: string): Promise<PlaceCandidate[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!key || !query.trim()) return []
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery: query.trim(), regionCode: 'NZ' }),
    })
    const data = (await res.json()) as {
      places?: Array<{
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        rating?: number
        userRatingCount?: number
      }>
    }
    if (!Array.isArray(data.places)) return []
    return data.places.slice(0, 5).map((p) => ({
      placeId: p.id ?? '',
      name: p.displayName?.text ?? '(unnamed)',
      address: p.formattedAddress ?? '',
      rating: typeof p.rating === 'number' ? p.rating : null,
      total: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    })).filter((c) => c.placeId)
  } catch {
    return []
  }
}
