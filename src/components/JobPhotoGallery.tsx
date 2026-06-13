'use client'

// Responsive thumbnail grid for job photos. Presentational only —
// pass `onDelete` to render per-photo delete buttons (contractor side);
// omit it for the read-only staff view. Tapping a thumbnail opens the
// full image (signed URL) in a new tab.

import { X } from 'lucide-react'

export interface GalleryPhoto {
  id: string
  url: string | null
  createdAt: string
}

export function JobPhotoGallery({
  photos,
  onDelete,
  deletingId,
}: {
  photos: GalleryPhoto[]
  onDelete?: (id: string) => void
  deletingId?: string | null
}) {
  if (photos.length === 0) return null

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((p) => (
        <div
          key={p.id}
          className="relative aspect-square rounded-xl overflow-hidden bg-sage-50 border border-sage-100"
        >
          {p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Job photo" loading="lazy" className="w-full h-full object-cover" />
            </a>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-sage-400">
              unavailable
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              disabled={deletingId === p.id}
              aria-label="Delete photo"
              className="absolute top-1 right-1 bg-white/90 backdrop-blur rounded-full p-1 text-sage-600 hover:text-red-600 shadow-sm disabled:opacity-50"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
