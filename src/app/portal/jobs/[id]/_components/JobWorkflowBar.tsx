// Phase C — job workflow bar.
//
// Seven-stage visual progression: Draft → Scheduled → Assigned →
// In Progress → Completed → Reviewed → Invoiced.
//
// The DB jobs.status enum currently has five values (draft,
// assigned, in_progress, completed, invoiced). The workflow bar
// shows seven stages so operators and contractors see every step
// in the real-world process. Derivations:
//
//   Draft      draft + no scheduled_date              → current (●)
//   Scheduled  draft + scheduled_date present        → current
//   Assigned   assigned                              → current
//   In Progress in_progress                          → current
//   Completed  completed (no review yet)             → current
//   Reviewed   reserved — no DB column yet; stays ○ until a
//              reviewed_at / reviewed_by column lands. Marked as
//              done once the job is invoiced, so the bar still
//              reads as a full journey.
//   Invoiced   invoiced                              → current
//
// Keeping this aligned with QuoteWorkflowBar's styling so the two
// flows look like one continuous journey across the portal.

type Stage =
  | 'Draft'
  | 'Scheduled'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Reviewed'
  | 'Invoiced'

type Marker = 'done' | 'current' | 'upcoming'

const STAGES: readonly Stage[] = [
  'Draft',
  'Scheduled',
  'Assigned',
  'In Progress',
  'Completed',
  'Reviewed',
  'Invoiced',
]

export interface JobWorkflowBarProps {
  status: string | null
  scheduledDate: string | null
}

export function JobWorkflowBar({ status, scheduledDate }: JobWorkflowBarProps) {
  const markers = buildMarkers(status, scheduledDate)

  return (
    <nav
      aria-label="Job workflow"
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
                    markers[i] === 'done' || markers[i + 1] === 'current' || markers[i + 1] === 'done'
                      ? 'hidden md:block w-6 lg:w-8 h-px bg-sage-300'
                      : 'hidden md:block w-6 lg:w-8 h-px bg-gray-200'
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

function buildMarkers(status: string | null, scheduledDate: string | null): Marker[] {
  const s = (status ?? 'draft').toLowerCase()
  const scheduled = scheduledDate != null && scheduledDate !== ''

  if (s === 'invoiced') {
    // Every prior stage done — including Reviewed even though we
    // don't capture it explicitly yet. Reviewed sits between
    // Completed and Invoiced as a journey marker.
    return ['done', 'done', 'done', 'done', 'done', 'done', 'current']
  }
  if (s === 'completed') {
    return ['done', 'done', 'done', 'done', 'current', 'upcoming', 'upcoming']
  }
  if (s === 'in_progress') {
    return ['done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']
  }
  if (s === 'assigned') {
    return ['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']
  }
  // draft — split into Draft vs Scheduled on scheduled_date.
  if (scheduled) {
    return ['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']
  }
  return ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']
}
