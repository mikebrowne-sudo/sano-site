// Commercial Office template — Phase 4A
//
// A typed, code-only starter kit of scope rows for a standard
// commercial-office cleaning quote. Operators stamp it into the
// CommercialScopeBuilder to skip the blank-page problem; then tick /
// edit individual rows against the real site.
//
// Design rules:
// - No database. No pricing settings. No wording engine. Just data.
// - Every task has sensible defaults (input_mode, frequency, quantity,
//   unit_minutes) so the stamped form immediately produces a usable
//   pricing preview before any operator edits.
// - Rows emit in a shape compatible with CommercialScopeFormRow minus
//   the UI-only `_key` field — the scope builder generates fresh keys
//   at stamp time so rows don't collide with any existing form state.
//
// Adding a new area / task: add to OFFICE_TEMPLATE below. Preserve
// included_by_default = true for core tasks that apply at every office;
// set false for opt-ins (dishwasher loading, server rooms, etc.) so
// the operator ticks them only when relevant.

import type {
  QuantityType,
  ScopeFrequency,
  ScopeInputMode,
} from './commercialQuote'
import type { CommercialScopeFormRow } from '@/app/portal/quotes/_components/commercial/CommercialScopeBuilder'

// ── Shape ──────────────────────────────────────────────────────────

export interface OfficeTemplateTask {
  task_name: string
  input_mode: ScopeInputMode
  frequency: ScopeFrequency
  /** For measured rows only. Omitted for time_based. */
  quantity_type?: QuantityType
  /** Typical starting value. Operators always re-check against the real site. */
  quantity_value?: number
  /** Per-unit for measured rows; total-per-visit for time_based rows. */
  unit_minutes?: number
  /** Optional per-task note. Surfaces to the operator inside the row. */
  notes?: string
  /** Whether the task starts with the "Included" checkbox ticked. */
  included_by_default: boolean
}

export interface OfficeTemplateGroup {
  task_group: string
  tasks: OfficeTemplateTask[]
}

export interface OfficeTemplateArea {
  area_type: string
  task_groups: OfficeTemplateGroup[]
}

export interface OfficeTemplate {
  areas: OfficeTemplateArea[]
}

// ── Template data ──────────────────────────────────────────────────

export const OFFICE_TEMPLATE: OfficeTemplate = {
  areas: [
    // ── Reception / Lobby ────────────────────────────────────────
    {
      area_type: 'Reception',
      task_groups: [
        {
          task_group: 'Surfaces',
          tasks: [
            {
              task_name: 'Wipe reception desk and counters',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 4,
              included_by_default: true,
            },
            {
              task_name: 'Dust lobby seating and side tables',
              input_mode: 'time_based',
              frequency: 'weekly',
              unit_minutes: 3,
              included_by_default: true,
            },
            {
              task_name: 'Spot clean entry glass and door handles',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 4,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Floors',
          tasks: [
            {
              task_name: 'Vacuum lobby carpets',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 30,
              unit_minutes: 0.15,
              included_by_default: true,
            },
            {
              task_name: 'Mop hard-floor zones',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 20,
              unit_minutes: 0.2,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Waste',
          tasks: [
            {
              task_name: 'Empty visitor bins and replace liners',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 2,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Offices / Workstations ───────────────────────────────────
    {
      area_type: 'Offices',
      task_groups: [
        {
          task_group: 'Desks',
          tasks: [
            {
              task_name: 'Wipe clear desk surfaces',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 15,
              notes: 'Clear surfaces only — no personal items handled.',
              included_by_default: true,
            },
            {
              task_name: 'Sanitise high-touch points (keyboard area, mouse, phone, armrests)',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 10,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Floors',
          tasks: [
            {
              task_name: 'Vacuum carpeted zones',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 200,
              unit_minutes: 0.15,
              included_by_default: true,
            },
            {
              task_name: 'Mop hard-floor zones',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 50,
              unit_minutes: 0.2,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Dusting',
          tasks: [
            {
              task_name: 'Dust monitors, accessories, and side furniture',
              input_mode: 'time_based',
              frequency: 'fortnightly',
              unit_minutes: 15,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Waste',
          tasks: [
            {
              task_name: 'Empty office bins and replace liners',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 8,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Meeting & Boardrooms ─────────────────────────────────────
    {
      area_type: 'Meeting rooms',
      task_groups: [
        {
          task_group: 'Reset',
          tasks: [
            {
              task_name: 'Clear cups and glassware, wipe tables, reset chairs, prepare whiteboards',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'fixture_count',
              quantity_value: 4,
              unit_minutes: 6,
              notes: 'Quantity = number of meeting rooms.',
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Floors',
          tasks: [
            {
              task_name: 'Vacuum meeting-room carpets',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 40,
              unit_minutes: 0.15,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Kitchens / Breakout ──────────────────────────────────────
    {
      area_type: 'Kitchens',
      task_groups: [
        {
          task_group: 'Surfaces',
          tasks: [
            {
              task_name: 'Wipe benches, splashbacks, and appliance fronts',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 6,
              included_by_default: true,
            },
            {
              task_name: 'Clean sinks, taps, and drains',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 3,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Touchpoints',
          tasks: [
            {
              task_name: 'Sanitise handles, switches, and fridge / dishwasher handles',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 3,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Dishwasher',
          tasks: [
            {
              task_name: 'Load, run, and unload dishwasher cycle',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 5,
              notes: 'Opt-in — only if staffed on-site by Sano.',
              included_by_default: false,
            },
          ],
        },
        {
          task_group: 'Floors',
          tasks: [
            {
              task_name: 'Mop kitchen floors',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 15,
              unit_minutes: 0.25,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Consumables and waste',
          tasks: [
            {
              task_name: 'Empty bins, replace liners, restock dishwasher tablets and hand soap',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 4,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Bathrooms / Washrooms ────────────────────────────────────
    {
      area_type: 'Bathrooms',
      task_groups: [
        {
          task_group: 'Fixtures',
          tasks: [
            {
              task_name: 'Clean and disinfect toilets',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'fixture_count',
              quantity_value: 4,
              unit_minutes: 6,
              notes: 'Quantity = total toilets across all bathrooms.',
              included_by_default: true,
            },
            {
              task_name: 'Clean urinals',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'fixture_count',
              quantity_value: 2,
              unit_minutes: 2,
              included_by_default: true,
            },
            {
              task_name: 'Clean basins, polish mirrors and tapware',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'fixture_count',
              quantity_value: 4,
              unit_minutes: 1.5,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Floors',
          tasks: [
            {
              task_name: 'Mop floors with bathroom disinfectant',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 15,
              unit_minutes: 0.25,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Touchpoints',
          tasks: [
            {
              task_name: 'Sanitise door handles, flush buttons, light switches, and taps',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 3,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Consumables and waste',
          tasks: [
            {
              task_name: 'Restock soap, paper towels, and toilet paper; empty sanitary bins',
              input_mode: 'time_based',
              frequency: 'per_visit',
              unit_minutes: 4,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Common Areas ─────────────────────────────────────────────
    {
      area_type: 'Common areas',
      task_groups: [
        {
          task_group: 'Corridors and stairs',
          tasks: [
            {
              task_name: 'Vacuum corridor carpets and stair runners',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'area_m2',
              quantity_value: 60,
              unit_minutes: 0.15,
              included_by_default: true,
            },
            {
              task_name: 'Dust handrails and skirting',
              input_mode: 'time_based',
              frequency: 'weekly',
              unit_minutes: 5,
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Lifts',
          tasks: [
            {
              task_name: 'Wipe lift interior — panels, buttons, mirrors, handrails, and floor',
              input_mode: 'measured',
              frequency: 'per_visit',
              quantity_type: 'fixture_count',
              quantity_value: 1,
              unit_minutes: 3,
              notes: 'Quantity = number of lifts on site.',
              included_by_default: true,
            },
          ],
        },
        {
          task_group: 'Glass',
          tasks: [
            {
              task_name: 'Spot clean internal glass partitions and lobby doors',
              input_mode: 'time_based',
              frequency: 'weekly',
              unit_minutes: 8,
              included_by_default: true,
            },
          ],
        },
      ],
    },

    // ── Specialist areas (opt-in) ────────────────────────────────
    {
      area_type: 'Specialist',
      task_groups: [
        {
          task_group: 'Server and IT rooms',
          tasks: [
            {
              task_name: 'Dry dust server and IT rooms (no liquids near equipment)',
              input_mode: 'time_based',
              frequency: 'quarterly',
              unit_minutes: 20,
              notes: 'Opt-in — only if the site has a dedicated server or IT room.',
              included_by_default: false,
            },
          ],
        },
        {
          task_group: 'Archive and storage',
          tasks: [
            {
              task_name: 'Maintain archive and storage rooms — floor mop and waste removal',
              input_mode: 'time_based',
              frequency: 'monthly',
              unit_minutes: 15,
              notes: 'Opt-in — only if the site has dedicated archive or storage rooms.',
              included_by_default: false,
            },
          ],
        },
      ],
    },
  ],
}

// ── Stamper ────────────────────────────────────────────────────────

/**
 * Flatten OFFICE_TEMPLATE into a list of form-row objects ready to
 * splice into CommercialScopeBuilder's state. Returns rows without the
 * UI-only `_key` field — the caller generates fresh keys at stamp time.
 *
 * Numeric values are stringified (matching CommercialScopeFormRow's
 * string-typed numeric fields) so they flow straight into the existing
 * inputs without extra conversion.
 */
export function stampOfficeTemplate(): Omit<CommercialScopeFormRow, '_key'>[] {
  const out: Omit<CommercialScopeFormRow, '_key'>[] = []
  const toStr = (n: number | undefined) => (n != null ? String(n) : '')

  for (const area of OFFICE_TEMPLATE.areas) {
    for (const group of area.task_groups) {
      for (const task of group.tasks) {
        out.push({
          input_mode: task.input_mode,
          area_type: area.area_type,
          task_group: group.task_group,
          task_name: task.task_name,
          frequency: task.frequency,
          quantity_type: task.quantity_type ?? '',
          quantity_value: toStr(task.quantity_value),
          unit_minutes: toStr(task.unit_minutes),
          production_rate: '',
          included: task.included_by_default,
          notes: task.notes ?? '',
        })
      }
    }
  }

  return out
}
