'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { importTransactions, type ImportResponse } from '../_actions'

export function Uploader() {
  const router = useRouter()
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      startTransition(async () => {
        const r = await importTransactions(text)
        if (!r.ok) { setError(r.error ?? 'Could not import the file.'); return }
        setResult(r)
        router.refresh()
      })
    }
    reader.onerror = () => setError('Could not read the file.')
    reader.readAsText(file)
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-sage-200 rounded-xl py-8 px-4 cursor-pointer hover:border-sage-300 hover:bg-sage-50/50 transition-colors text-center">
        <Upload size={22} className="text-sage-400" />
        <span className="text-sm font-medium text-sage-700">{isPending ? 'Importing…' : (fileName ?? 'Upload an ASB CSV export')}</span>
        <span className="text-xs text-sage-400">Account → Export → CSV. Re-uploading is safe — duplicates are skipped.</span>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={isPending} className="hidden" />
      </label>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 mt-3">{error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 mt-3">
          Imported {result.newCount} new transaction{result.newCount !== 1 ? 's' : ''}
          {result.dupCount ? `, skipped ${result.dupCount} already-imported` : ''}
          {result.account ? ` · ${result.account}` : ''}.
        </p>
      )}
    </div>
  )
}
