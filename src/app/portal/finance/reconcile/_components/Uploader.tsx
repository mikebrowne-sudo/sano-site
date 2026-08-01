'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { importTransactions, type ImportResponse } from '../_actions'
import clsx from 'clsx'

export function Uploader() {
  const router = useRouter()
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [isPending, startTransition] = useTransition()

  function processFile(file: File) {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setError('Please choose a .csv file exported from ASB.')
      return
    }
    setFileName(file.name)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      startTransition(async () => {
        try {
          const r = await importTransactions(text)
          if (!r.ok) { setError(r.error ?? 'Could not import the file.'); return }
          setResult(r)
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not import the file.')
        }
      })
    }
    reader.onerror = () => setError('Could not read the file.')
    reader.readAsText(file)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDrop={handleDrop}
        className={clsx(
          'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors text-center',
          dragging ? 'border-sage-500 bg-sage-50' : 'border-sage-200 hover:border-sage-300 hover:bg-sage-50/50',
        )}
      >
        <Upload size={22} className={clsx('transition-colors', dragging ? 'text-sage-500' : 'text-sage-400')} />
        <span className="text-sm font-medium text-sage-700">
          {isPending ? 'Importing…' : dragging ? 'Drop to import' : (fileName ?? 'Drag a file here, or click to choose')}
        </span>
        <span className="text-xs text-sage-400">ASB CSV export (Account → Export → CSV). Re-uploading is safe — duplicates are skipped.</span>
        <input type="file" accept=".csv,text/csv" onChange={handleInput} disabled={isPending} className="hidden" />
      </label>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 mt-3">{error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 mt-3">
          Imported {result.newCount} new transaction{result.newCount !== 1 ? 's' : ''}
          {result.dupCount ? `, skipped ${result.dupCount} already-imported` : ''}
          {result.account ? ` · ${result.account}` : ''}.
          {result.bankBalance != null && result.bankBalanceDate && (
            <>
              {' '}
              {result.bankBalanceUpdated
                ? `Dashboard bank balance updated to $${result.bankBalance.toLocaleString('en-NZ', { minimumFractionDigits: 2 })} (as at ${result.bankBalanceDate}).`
                : `Statement balance ($${result.bankBalance.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}) is older than the current dashboard figure — kept the newer one.`}
            </>
          )}
        </p>
      )}
    </div>
  )
}
