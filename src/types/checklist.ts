/**
 * Sano Cleaning Standards — shared checklist types.
 *
 * One Checklist per Sano Cleaning Standard. The three standards live in
 * src/lib/checklists/. The reusable rendering component is
 * src/components/ServiceChecklist.tsx.
 *
 * Total item counts are derived at render time from `rooms[].items.length`
 * — no `totalItems` field on the type. The marketing-facing "100-Point" /
 * "125-Point" claim is editorial and lives in `pointCountLabel`.
 */

export interface ChecklistItem {
  /** Human-readable cleaning task. */
  text: string
  /** Optional clarifying detail, rendered subtly under the task text. */
  note?: string
}

export interface ChecklistRoom {
  /** Stable slug used for anchors / aria-controls (e.g. "kitchen"). */
  slug: string
  /** Display label in the pill / heading. */
  name: string
  /** Optional lucide-react icon name. The component is free to ignore it. */
  icon?: string
  /** Ordered list of items in this room/category. */
  items: ChecklistItem[]
}

export type ChecklistSlug =
  | 'sano-100-point-home-clean'
  | 'sano-deep-clean-detail'
  | 'sano-125-point-property-reset'

export interface Checklist {
  /** Stable slug — one per Sano Cleaning Standard. */
  slug: ChecklistSlug
  /** Full display name (e.g. "Sano 100-Point Home Clean Checklist"). */
  name: string
  /** Short label for chips / homepage cards (e.g. "Home Clean Standard"). */
  shortName: string
  /**
   * Editorial point-count chip shown next to the heading.
   * "100-Point" / "125-Point" / undefined for Deep Clean (condition-based).
   */
  pointCountLabel?: string
  /** Optional caveat to render above the checklist (used by Deep Clean). */
  caveat?: string
  /** Ordered rooms/categories. */
  rooms: ChecklistRoom[]
  /** While true, the preview route shows a DRAFT badge and live integration is gated. */
  isDraft?: boolean
}

/** Returns the total number of items across all rooms. */
export function totalChecklistItems(checklist: Checklist): number {
  return checklist.rooms.reduce((acc, room) => acc + room.items.length, 0)
}
