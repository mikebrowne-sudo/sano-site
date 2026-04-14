'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { searchAreas } from '@/lib/service-areas'
import type { ServiceArea } from '@/lib/service-areas'
import { QuoteButton } from './QuoteButton'

type ResultState = 'idle' | 'found' | 'not-found'

export function SuburbChecker() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ServiceArea[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [result, setResult] = useState<ResultState>('idle')
  const [foundArea, setFoundArea] = useState<ServiceArea | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const updateSuggestions = useCallback((value: string) => {
    if (value.trim().length >= 2) {
      const matches = searchAreas(value)
      setSuggestions(matches.slice(0, 6))
      setShowSuggestions(matches.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  useEffect(() => {
    updateSuggestions(query)
  }, [query, updateSuggestions])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function runSearch(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const matches = searchAreas(trimmed)
    setShowSuggestions(false)
    if (matches.length > 0) {
      setResult('found')
      setFoundArea(matches[0])
    } else {
      setResult('not-found')
      setFoundArea(null)
    }
  }

  function handleSelect(area: ServiceArea) {
    setQuery(area.suburb)
    setResult('found')
    setFoundArea(area)
    setShowSuggestions(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    // Reset result as soon as user edits
    if (result !== 'idle') {
      setResult('idle')
      setFoundArea(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch(query)
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Search row */}
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2.5">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
            placeholder="Enter suburb or postcode…"
            className="flex-1 px-4 py-3.5 rounded-xl border border-sage-200 bg-white text-sage-800 text-sm placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-400 transition-all"
            aria-label="Search suburb or postcode"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => runSearch(query)}
            className="px-5 py-3.5 bg-sage-700 text-white text-sm font-semibold rounded-xl hover:bg-sage-800 active:scale-95 transition-all shadow-sm shrink-0"
          >
            Check
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-sage-200 rounded-xl shadow-lg z-30 overflow-hidden"
          >
            {suggestions.map((area) => (
              <button
                key={area.slug}
                role="option"
                type="button"
                onClick={() => handleSelect(area)}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 text-sm hover:bg-sage-50 border-b border-sage-50 last:border-0 transition-colors"
                aria-selected={false}
              >
                <span className="font-medium text-sage-800">{area.suburb}</span>
                <span className="text-gray-400 text-xs shrink-0">
                  {area.postcodes[0]} · {area.region}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result: found */}
      {result === 'found' && foundArea && (
        <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50 p-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-sage-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sage-800 text-sm leading-snug">
                We service {foundArea.suburb}.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Get in touch for a free quote tailored to your home or business.
              </p>
              <div className="mt-3">
                <QuoteButton label="Get a Free Quote" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result: not found */}
      {result === 'not-found' && (
        <div className="mt-4 rounded-xl border border-sage-100 bg-[#f8f9f8] p-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-sage-200 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-2.5 h-2.5 text-sage-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sage-800 text-sm leading-snug">
                We don&apos;t currently service this area.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                <Link href="/contact" className="text-sage-700 underline underline-offset-2 hover:text-sage-500 transition-colors">
                  Get in touch
                </Link>{' '}
                and we&apos;ll let you know if we can help.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
