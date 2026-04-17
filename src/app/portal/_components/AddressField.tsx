'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface MapboxFeature {
  id: string
  place_name: string
  properties?: { full_address?: string; name?: string }
}

interface AddressFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  required?: boolean
  className?: string
  placeholder?: string
  error?: string
}

const MAPBOX_ENDPOINT = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

export function AddressField({ label, value, onChange, required, className, placeholder, error }: AddressFieldProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>('')

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function runQuery(q: string) {
    if (!token || q.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    if (q === lastQueryRef.current) return
    lastQueryRef.current = q
    const url = `${MAPBOX_ENDPOINT}/${encodeURIComponent(q)}.json?country=nz&language=en&autocomplete=true&limit=5&types=address,place,postcode,locality,neighborhood&access_token=${token}`
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('mapbox'))))
      .then((data: { features: MapboxFeature[] }) => {
        setSuggestions(data.features ?? [])
        setOpen((data.features?.length ?? 0) > 0)
        setHighlight(0)
      })
      .catch(() => {
        setSuggestions([])
        setOpen(false)
      })
  }

  function handleInput(next: string) {
    onChange(next)
    if (!token) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runQuery(next), 200)
  }

  function handleSelect(feature: MapboxFeature) {
    const chosen = feature.place_name || feature.properties?.full_address || feature.properties?.name || ''
    onChange(chosen)
    setSuggestions([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className={clsx(
            'w-full rounded-lg border px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm',
            error ? 'border-red-300' : 'border-sage-200',
          )}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-lg border border-sage-200 bg-white shadow-md overflow-hidden">
            {suggestions.map((f, i) => (
              <li
                key={f.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(f) }}
                onMouseEnter={() => setHighlight(i)}
                className={clsx(
                  'px-4 py-2 text-sm cursor-pointer border-b border-sage-100 last:border-b-0',
                  i === highlight ? 'bg-sage-50 text-sage-800' : 'text-sage-800',
                )}
              >
                {f.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
    </label>
  )
}
