// Phase A — quote workflow bar.
//
// Five-stage visual progression: Draft → Ready → Sent → Accepted →
// Next Step. Intentionally simple markers:
//   ✔  completed   (sage green)
//   ●  current     (sage green filled dot)
//   ○  upcoming    (muted grey ring)
//
// Stage derivation from quote.status:
//   draft                             → Draft (●)   if quote has no items yet
//                                        Ready (●)  if the quote is editable and has items
//   sent | viewed                     → Sent  (●)
//   accepted                          → Accepted (●)
//   converted                         → Next Step (●)  (all prior ✔)
//   declined                          → Sent (●), rest ○ (status message explains)
//
// This is UI-only; no DB schema change. "Ready" is a derived visual
// state (Draft + at least one line item) so the workflow still reads
// as five stages even though the DB has four.

type Stage = 'Draft' | 'Ready' | 'Sent' | 'Accepted' | 'Next Step'
type Marker = 'done' | 'current' | 'upcoming'

const STAGES: readonly Stage[] = ['Draft', 'Ready', 'Sent', 'Accepted', 'Next Step']

export interface QuoteWorkflowBarProps {
  status: string | null
  itemCount: number
}

export function QuoteWorkflowBar({ status, itemCount }: QuoteWorkflowBarProps) {
  const markers = buildMarkers(status, itemCount)

  return (
    <nav
      aria-label="Quote workflow"
      className="w-full bg-white border border-sage-100 rounded-lg px-4 py-3 mb-2"
    >
      <ol className="flex items-center gap-2 md:gap-4 overflow-x-auto">
        {STAGES.map((stage, i) => {
          const marker = markers[i]
          return (
            <li
              key={stage}
              className="flex items-center gap-2 md:gap-4 flex-shrink-0"
              aria-current={marker === 'current' ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <StageMarker marker={marker} />
                <span
                  className={
                    marker === 'current'
                      ? 'text-sm font-semibold text-sage-800'
                      : marker === 'done'
                      ? 'text-sm text-sage-700'
                      : 'text-sm text-gray-400'
                  }
                >
                  {stage}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={
                    markers[i].valueOf() === 'done' || markers[i + 1] === 'current' || markers[i + 1] === 'done'
                      ? 'hidden md:block w-8 lg:w-12 h-px bg-sage-300'
                      : 'hidden md:block w-8 lg:w-12 h-px bg-gray-200'
                  }
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function StageMarker({ marker }: { marker: Marker }) {
  if (marker === 'done') {
    return (
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-500 text-white text-[11px] font-bold"
      >
        ✓
      </span>
    )
  }
  if (marker === 'current') {
    return (
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-500 ring-4 ring-sage-100"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
    </span>
  )
}

function buildMarkers(status: string | null, itemCount: number): Marker[] {
  const s = (status ?? 'draft').toLowerCase()

  if (s === 'converted') {
    return ['done', 'done', 'done', 'done', 'current']
  }
  if (s === 'accepted') {
    return ['done', 'done', 'done', 'current', 'upcoming']
  }
  if (s === 'sent' || s === 'viewed' || s === 'declined') {
    return ['done', 'done', 'current', 'upcoming', 'upcoming']
  }
  // draft — split into Draft vs Ready based on whether the quote has
  // at least one item (items, scope, or priced base). itemCount is the
  // simplest signal and the caller passes it from quote_items +
  // commercial_scope_items.
  if (itemCount > 0) {
    return ['done', 'current', 'upcoming', 'upcoming', 'upcoming']
  }
  return ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']
}
