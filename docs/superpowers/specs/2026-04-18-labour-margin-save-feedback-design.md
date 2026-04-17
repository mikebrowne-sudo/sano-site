# Labour & Margin — Save Feedback Fix

**Date:** 2026-04-18
**Scope:** UX fix in `src/app/portal/jobs/[id]/_components/ActualHoursEditor.tsx`
**Type:** Cosmetic / UX, no DB or logic change

## Problem

Actual labour hours already persist to `job_workers.actual_hours` via `updateWorkerActualHours` (autosave on blur + Enter). The existing success indicator is a single `✓` rendered at `text-[10px]` next to the input, which is easy to miss. This reads to users as "my input isn't being saved."

## Non-goals

- No database schema change.
- No changes to `src/lib/labour-calc.ts`, estimated/quoted labour, margin calculations, or the server action `updateWorkerActualHours`.
- No new labour-notes or cost-override fields (out of scope per user).

## Design

### Component state machine

`ActualHoursEditor` transitions through these states for a single worker's input:

| State     | Trigger                                            | UI                                                         |
|-----------|----------------------------------------------------|------------------------------------------------------------|
| `idle`    | Initial, or 2s after `saved`                       | No chip                                                    |
| `dirty`   | User edits input                                   | Muted chip: "Unsaved" (sage-500)                           |
| `saving`  | Blur or Enter pressed with dirty value             | Spinner + "Saving…" (sage-500); input disabled             |
| `saved`   | Server action returns success                      | Green ✓ + "Saved" (emerald-600) for 2 s, then → `idle`     |
| `error`   | Server action returns `{ error }` or throws        | Red ! + clickable "Retry" button (red-600); input enabled  |

### Triggers

- **Blur** of input: if value changed from last saved, enter `saving`.
- **Enter** key: same behaviour as blur.
- **Escape** key: revert input to last saved value, return to `idle`.
- **Retry** button: re-submit last attempted value, enter `saving`.

If parsed value equals the last saved value, skip the server call and return to `idle`.

### Layout

Chip sits to the right of the input inside the existing `flex items-center gap-1` container. Fixed ~72 px chip width prevents column jitter.

### Authorisation

Unchanged. Portal is behind `middleware.ts` auth and Supabase RLS on `job_workers`. No new server action, no new policy.

## Files changed

- `src/app/portal/jobs/[id]/_components/ActualHoursEditor.tsx` — rewritten with the state machine above.

## Testing

1. Open `/portal/jobs/[id]` for a job with assigned workers.
2. Edit actual hours → "Unsaved" appears.
3. Tab / click away → "Saving…" → "Saved" for 2 s → fades.
4. Press Enter → same save flow.
5. Press Escape on a dirty input → value reverts, chip clears.
6. Simulate a failed save (e.g. kill network) → "Retry" chip appears → clicking retries the save.
7. Refresh the page → saved value persists.
8. Confirm estimated/actual table totals and margin update correctly.
