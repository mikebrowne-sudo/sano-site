'use client'

// Contractor proof-of-completion photos — uploader + gallery.
// Picks one or more images (rear camera on mobile via capture), uploads
// through the server action, and refreshes to show fresh signed URLs.
// Each photo can be deleted by the contractor who owns it.

import { useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { uploadJobPhotos, deleteJobPhoto } from '../_actions-photos'
import { JobPhotoGallery, type GalleryPhoto } from '@/components/JobPhotoGallery'

export function ContractorPhotos({ jobId, photos }: { jobId: string; photos: GalleryPhoto[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    setError(null)
    startTransition(async () => {
      const res = await uploadJobPhotos(jobId, fd)
      if (res && 'error' in res && res.error) setError(res.error)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    })
  }

  function onDelete(id: string) {
    setDeletingId(id)
    setError(null)
    startTransition(async () => {
      const res = await deleteJobPhoto(id, jobId)
      if (res && 'error' in res && res.error) setError(res.error)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <JobPhotoGallery photos={photos} onDelete={onDelete} deletingId={deletingId} />
      ) : (
        <p className="text-sm text-sage-400">No photos yet — add a few of the finished job.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onPick}
        disabled={isPending}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-3 rounded-xl text-sm hover:bg-sage-50 active:bg-sage-100 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {isPending ? 'Uploading…' : 'Add photos'}
      </button>

      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}
