// "Your Google reviews" panel at the top of the Reviews tab: overall rating,
// total count and recent review cards, pulled from the Places API (cached 6h).
// Degrades to a setup hint until the env vars are in — and, once the key is set
// but the Place ID isn't, lists candidate Place IDs for staff to copy in.

import { Star, StarHalf } from 'lucide-react'
import {
  getPlaceReviews,
  findPlaceCandidates,
  formatReviewCount,
  starBuckets,
  type GoogleReview,
} from '@/lib/google-places'

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {starBuckets(rating).map((b, i) =>
        b === 1 ? (
          <Star key={i} size={size} className="fill-amber-400 text-amber-400" />
        ) : b === 0.5 ? (
          <StarHalf key={i} size={size} className="fill-amber-400 text-amber-400" />
        ) : (
          <Star key={i} size={size} className="text-sage-200" />
        )
      )}
    </span>
  )
}

function ReviewCard({ r }: { r: GoogleReview }) {
  return (
    <div className="rounded-xl border border-sage-100 bg-white p-4 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-sage-800 truncate">{r.author}</span>
        <Stars rating={r.rating} size={12} />
      </div>
      <p className="text-[13px] leading-relaxed text-sage-600 line-clamp-5">{r.text}</p>
      {r.relativeTime && <span className="text-[11px] text-sage-400 mt-auto">{r.relativeTime}</span>}
    </div>
  )
}

export async function GoogleReviewsPanel() {
  const data = await getPlaceReviews()

  // Not configured at all — a quiet setup hint (admin-only page, so this is fine).
  if (!data.configured && !data.needsPlaceId) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-5 text-sm text-sage-500">
        <p className="font-medium text-sage-700 mb-1">Show your Google reviews here</p>
        <p>
          Add a Google Maps Platform API key as <code className="text-sage-700">GOOGLE_PLACES_API_KEY</code> and your
          listing&rsquo;s <code className="text-sage-700">SANO_GOOGLE_PLACE_ID</code> in Netlify, then redeploy. Your
          rating, review count and recent reviews will appear here.
        </p>
      </div>
    )
  }

  // Key set, Place ID missing — resolve candidates so staff can copy the right ID.
  if (data.needsPlaceId) {
    const candidates = await findPlaceCandidates('Sano cleaning Auckland')
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm">
        <p className="font-medium text-amber-800 mb-1">One more step — set your Place ID</p>
        <p className="text-amber-700 mb-3">
          The API key is in. Copy the Place ID for the Sano listing below into{' '}
          <code>SANO_GOOGLE_PLACE_ID</code> in Netlify, then redeploy.
        </p>
        {candidates.length === 0 ? (
          <p className="text-amber-700">
            No matches found for &ldquo;Sano cleaning Auckland&rdquo;. Use Google&rsquo;s Place ID Finder and paste the ID
            into <code>SANO_GOOGLE_PLACE_ID</code>.
          </p>
        ) : (
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.placeId} className="rounded-lg bg-white border border-amber-100 p-3">
                <div className="font-medium text-sage-800">{c.name}</div>
                <div className="text-[12px] text-sage-500">{c.address}</div>
                <code className="text-[12px] text-sage-700 break-all">{c.placeId}</code>
                {c.rating != null && (
                  <span className="text-[12px] text-sage-500"> · {c.rating}★ ({c.total ?? 0})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // Configured but the API returned an error — muted, non-blocking.
  if (data.error) {
    return (
      <div className="mb-6 rounded-2xl border border-sage-200 bg-sage-50/50 p-4 text-[13px] text-sage-500">
        Couldn&rsquo;t load Google reviews right now ({data.error}). The rest of the tab still works.
      </div>
    )
  }

  // Configured, connected, but no reviews on the listing yet — ties into Phase 1.
  if ((data.total ?? 0) === 0 && data.reviews.length === 0) {
    return (
      <div className="mb-6 rounded-2xl border border-sage-100 bg-white p-5 flex items-start gap-3">
        <Star size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-sage-600">
          <p className="font-medium text-sage-800">No Google reviews yet</p>
          <p>Your listing is connected. The review requests you send below will start bringing them in — they&rsquo;ll appear here automatically.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl border border-sage-100 bg-white p-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-sage-800">{data.rating?.toFixed(1) ?? '—'}</span>
          <div className="flex flex-col">
            {data.rating != null && <Stars rating={data.rating} />}
            <span className="text-[12px] text-sage-500">{formatReviewCount(data.total)} on Google</span>
          </div>
        </div>
      </div>

      {data.reviews.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((r) => (
            <ReviewCard key={`${r.author}-${r.time}`} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}
