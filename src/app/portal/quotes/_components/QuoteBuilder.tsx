'use client'

import { useEffect, useMemo } from 'react'
import clsx from 'clsx'
import {
  SERVICE_CATEGORIES,
  SERVICE_TYPES_BY_CATEGORY,
  PROPERTY_TYPE_OPTIONS,
  FREQUENCY_OPTIONS,
  AREA_OPTIONS,
  CONDITION_OPTIONS,
  SUPPORT_LINE_OPTIONS,
  ADDON_OPTIONS,
  generateQuoteScope,
  supportsRecurring,
  type ServiceCategory,
} from '@/lib/quote-wording'

export interface QuoteBuilderState {
  service_category: ServiceCategory | ''
  service_type_code: string
  property_type: string
  bedrooms: string
  bathrooms: string
  site_type: string
  frequency: string
  x_per_week: string
  areas_included: string[]
  condition_tags: string[]
  addons_wording: string[]
  support_line: string
  generated_scope: string
  description_edited: boolean
}

export function emptyBuilderState(): QuoteBuilderState {
  return {
    service_category: '',
    service_type_code: '',
    property_type: '',
    bedrooms: '',
    bathrooms: '',
    site_type: '',
    frequency: '',
    x_per_week: '',
    areas_included: [],
    condition_tags: [],
    addons_wording: [],
    support_line: '',
    generated_scope: '',
    description_edited: false,
  }
}

export function QuoteBuilder({
  value,
  onChange,
}: {
  value: QuoteBuilderState
  onChange: (next: QuoteBuilderState) => void
}) {
  const s = value
  function patch(partial: Partial<QuoteBuilderState>) {
    onChange({ ...s, ...partial })
  }

  const category = s.service_category || null
  const isResidentialStyle = category === 'residential' || category === 'property_management' || category === 'airbnb'
  const isCommercial = category === 'commercial'

  // Available service types for current category
  const serviceTypes = useMemo(
    () => (category ? SERVICE_TYPES_BY_CATEGORY[category] : []),
    [category],
  )

  // Available condition tags for current category
  const conditionOptions = useMemo(
    () => (category ? CONDITION_OPTIONS.filter((o) => o.appliesTo === 'all' || o.appliesTo.includes(category)) : []),
    [category],
  )

  const showFrequency = supportsRecurring(category, s.service_type_code || null)

  // ── Live regeneration ──────────────────────────────────────
  useEffect(() => {
    if (s.description_edited) return
    const generated = generateQuoteScope({
      service_category: category,
      service_type_code: s.service_type_code || null,
      bedrooms: s.bedrooms ? parseInt(s.bedrooms, 10) : null,
      bathrooms: s.bathrooms ? parseInt(s.bathrooms, 10) : null,
      site_type: s.site_type || null,
      frequency: s.frequency || null,
      x_per_week: s.x_per_week ? parseInt(s.x_per_week, 10) : null,
      areas_included: s.areas_included,
      condition_tags: s.condition_tags,
      addons_wording: s.addons_wording,
      support_line: s.support_line || null,
    })
    if (generated !== s.generated_scope) {
      onChange({ ...s, generated_scope: generated })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    s.service_type_code,
    s.bedrooms,
    s.bathrooms,
    s.site_type,
    s.frequency,
    s.x_per_week,
    s.areas_included.join(','),
    s.condition_tags.join(','),
    s.addons_wording.join(','),
    s.support_line,
    s.description_edited,
  ])

  // ── Handlers ───────────────────────────────────────────────
  function pickCategory(next: ServiceCategory) {
    // Reset category-dependent fields; apply sensible defaults.
    const defaults: Partial<QuoteBuilderState> = {
      service_category: next,
      service_type_code: '',
      condition_tags: next === 'residential' || next === 'property_management' ? ['well_maintained'] : [],
      areas_included:
        next === 'residential' || next === 'property_management' || next === 'airbnb'
          ? ['kitchen', 'bathrooms', 'bedrooms', 'living']
          : [],
      frequency: '',
    }
    patch(defaults)
  }

  function pickServiceType(code: string) {
    // Apply sensible frequency default
    const key = `${s.service_category}.${code}`
    const recurring = [
      'residential.standard_clean',
      'property_management.routine',
      'airbnb.turnover',
      'commercial.maintenance',
    ].includes(key)
    patch({
      service_type_code: code,
      frequency: recurring ? (s.service_category === 'commercial' ? 'x_per_week' : 'weekly') : 'one_off',
    })
  }

  function toggleInArray(arr: string[], val: string, max?: number): string[] {
    if (arr.includes(val)) return arr.filter((x) => x !== val)
    const next = [...arr, val]
    if (max != null && next.length > max) return next.slice(next.length - max)
    return next
  }

  function editScopeManually(nextText: string) {
    patch({ generated_scope: nextText, description_edited: true })
  }

  function regenerateNow() {
    const generated = generateQuoteScope({
      service_category: category,
      service_type_code: s.service_type_code || null,
      bedrooms: s.bedrooms ? parseInt(s.bedrooms, 10) : null,
      bathrooms: s.bathrooms ? parseInt(s.bathrooms, 10) : null,
      site_type: s.site_type || null,
      frequency: s.frequency || null,
      x_per_week: s.x_per_week ? parseInt(s.x_per_week, 10) : null,
      areas_included: s.areas_included,
      condition_tags: s.condition_tags,
      addons_wording: s.addons_wording,
      support_line: s.support_line || null,
    })
    patch({ generated_scope: generated, description_edited: false })
  }

  return (
    <div className="space-y-10">

      {/* ── Service ──────────────────────────────── */}
      <fieldset>
        {/* Binary Service Type toggle (Phase 1) — primary frame over the
            existing 4-way SERVICE_CATEGORIES picker. Does not collapse
            categories; picking "Residential" shows the 3-way subtype
            chips, picking "Commercial" locks category to 'commercial'. */}
        <Label>Service Type</Label>
        <ChipRow>
          <Chip
            active={isResidentialStyle}
            onClick={() => {
              if (!isResidentialStyle) pickCategory('residential')
            }}
          >
            Residential
          </Chip>
          <Chip
            active={isCommercial}
            onClick={() => {
              if (!isCommercial) pickCategory('commercial')
            }}
          >
            Commercial
          </Chip>
        </ChipRow>

        {/* Subtype picker — only for residential-style. Commercial locks
            category and skips this row entirely. */}
        {isResidentialStyle && (
          <>
            <Label className="mt-5">Service sub-category</Label>
            <ChipRow>
              {SERVICE_CATEGORIES.filter((c) => c.value !== 'commercial').map((c) => (
                <Chip key={c.value} active={s.service_category === c.value} onClick={() => pickCategory(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </ChipRow>
          </>
        )}

        {category && (
          <>
            <Label className="mt-5">Service type</Label>
            <ChipRow>
              {serviceTypes.map((t) => (
                <Chip key={t.value} active={s.service_type_code === t.value} onClick={() => pickServiceType(t.value)}>
                  {t.label}
                </Chip>
              ))}
            </ChipRow>
          </>
        )}

        {showFrequency && (
          <>
            <Label className="mt-5">Frequency</Label>
            <ChipRow>
              {FREQUENCY_OPTIONS.filter((f) => isCommercial || f.value !== 'x_per_week').map((f) => (
                <Chip key={f.value} active={s.frequency === f.value} onClick={() => patch({ frequency: f.value })}>
                  {f.label}
                </Chip>
              ))}
            </ChipRow>
            {s.frequency === 'x_per_week' && (
              <div className="mt-3 max-w-[160px]">
                <Label>Times per week</Label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={s.x_per_week}
                  onChange={(e) => patch({ x_per_week: e.target.value })}
                  className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                />
              </div>
            )}
          </>
        )}
      </fieldset>

      {/* ── Property details ─────────────────────── */}
      {category && (
        <Block title="Property details">
          {isResidentialStyle && (
            <>
              <Label>Property type</Label>
              <ChipRow>
                {PROPERTY_TYPE_OPTIONS.filter((p) => ['house', 'apartment', 'townhouse', 'other'].includes(p.value)).map((p) => (
                  <Chip key={p.value} active={s.property_type === p.value} onClick={() => patch({ property_type: s.property_type === p.value ? '' : p.value })}>
                    {p.label}
                  </Chip>
                ))}
              </ChipRow>
              <div className="grid grid-cols-2 gap-4 mt-5 max-w-sm">
                <div>
                  <Label>Bedrooms</Label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={s.bedrooms}
                    onChange={(e) => patch({ bedrooms: e.target.value })}
                    className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                  />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={s.bathrooms}
                    onChange={(e) => patch({ bathrooms: e.target.value })}
                    className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                  />
                </div>
              </div>
            </>
          )}
          {isCommercial && (
            <>
              <Label>Property type</Label>
              <ChipRow>
                {PROPERTY_TYPE_OPTIONS.filter((p) => ['office', 'retail', 'warehouse', 'other'].includes(p.value)).map((p) => (
                  <Chip key={p.value} active={s.property_type === p.value} onClick={() => patch({ property_type: s.property_type === p.value ? '' : p.value })}>
                    {p.label}
                  </Chip>
                ))}
              </ChipRow>
              <Label className="mt-5">Site type (used in wording)</Label>
              <input
                value={s.site_type}
                onChange={(e) => patch({ site_type: e.target.value })}
                placeholder="e.g. an office site, a retail store, a medical clinic, a warehouse"
                className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
              />
            </>
          )}
        </Block>
      )}

      {/* ── Areas included (residential-only — commercial captures
             areas per scope row in the Commercial Scope block) ─────── */}
      {category && !isCommercial && (
        <Block title="Areas included">
          <ChipRow>
            {AREA_OPTIONS.map((a) => (
              <Chip key={a.value} active={s.areas_included.includes(a.value)} onClick={() => patch({ areas_included: toggleInArray(s.areas_included, a.value) })}>
                {a.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>
      )}

      {/* ── Condition & focus ────────────────────── */}
      {category && conditionOptions.length > 0 && (
        <Block title="Condition & focus" hint="Max 2 tags">
          <ChipRow>
            {conditionOptions.map((o) => (
              <Chip key={o.value} active={s.condition_tags.includes(o.value)} onClick={() => patch({ condition_tags: toggleInArray(s.condition_tags, o.value, 2) })}>
                {o.label}
              </Chip>
            ))}
          </ChipRow>
          <Label className="mt-5">Optional support line</Label>
          <ChipRow>
            <Chip active={!s.support_line} onClick={() => patch({ support_line: '' })}>None</Chip>
            {SUPPORT_LINE_OPTIONS.map((o) => (
              <Chip key={o.value} active={s.support_line === o.value} onClick={() => patch({ support_line: o.value })}>
                {o.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>
      )}

      {/* ── Additional services (residential-flavoured wording chips
             like oven/carpet/window — not relevant for commercial, which
             adds line items via the outer "Add-ons" section instead) ── */}
      {category && !isCommercial && (
        <Block title="Additional services">
          <ChipRow>
            {ADDON_OPTIONS.map((a) => (
              <Chip key={a.value} active={s.addons_wording.includes(a.value)} onClick={() => patch({ addons_wording: toggleInArray(s.addons_wording, a.value) })}>
                {a.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>
      )}

      {/* ── Generated scope (preview / editable) ─────────── */}
      {category && (
        <Block title="Generated scope">
          {s.description_edited ? (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Manually edited — auto-regeneration off</span>
              <button
                type="button"
                onClick={regenerateNow}
                className="text-xs font-medium text-sage-600 hover:text-sage-800 underline"
              >
                Regenerate from selections
              </button>
            </div>
          ) : (
            <p className="text-xs text-sage-500 mb-2">Auto-updating from your selections. Click the text to edit manually.</p>
          )}
          <textarea
            rows={14}
            value={s.generated_scope}
            onChange={(e) => editScopeManually(e.target.value)}
            placeholder="Select a category and service type above to begin."
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y whitespace-pre-wrap"
          />
        </Block>
      )}
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-sage-800 mb-3 flex items-center gap-2">
        <span>{title}</span>
        {hint && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sage-100 text-sage-500 uppercase tracking-wide">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={clsx('block text-sm font-semibold text-sage-800 mb-2', className)}>{children}</span>
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-sage-500 text-white border-sage-500'
          : 'bg-white text-sage-600 border-sage-200 hover:bg-sage-50',
      )}
    >
      {children}
    </button>
  )
}
