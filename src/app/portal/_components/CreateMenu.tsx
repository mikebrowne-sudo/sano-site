'use client'

// Phase 1.7 — primary "Create" dropdown for the dashboard header.
// Replaces the previous "+ New Quote" + "+ New Job" pair so the header
// has a single, dominant primary action. Self-contained dropdown with
// click-outside + Escape handling — no external menu primitive needed.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Briefcase, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export function CreateMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold pl-3 pr-2.5 py-2 rounded-lg text-sm shadow-sm hover:bg-sage-700 transition-colors duration-150"
      >
        <Plus size={15} />
        <span>Create</span>
        <ChevronDown
          size={13}
          className={clsx('transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20"
        >
          <Link
            href="/portal/quotes/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-sage-800 hover:bg-gray-50 transition-colors duration-150"
          >
            <FileText size={14} className="text-sage-500" />
            <span>New quote</span>
          </Link>
          <Link
            href="/portal/jobs/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-sage-800 hover:bg-gray-50 transition-colors duration-150"
          >
            <Briefcase size={14} className="text-sage-500" />
            <span>New job</span>
          </Link>
        </div>
      )}
    </div>
  )
}
