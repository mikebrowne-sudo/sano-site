// Commercial proposal wording engine — Phase 4B
//
// Turns the scope-group + commercial-details data the proposal
// template already receives into client-safe prose paragraphs. Two
// outputs:
//
//   1. buildAreaParagraph(group, details)   → paragraph string
//      One paragraph per ProposalScopeGroup, used inside Scope of Works.
//      Shape:  [opening]  [triggered sentences]  [closing]
//
//   2. buildOptionalParagraphs(details)     → OptionalParagraph[]
//      A short list of standalone paragraphs driven by quote-level
//      details (consumables, access/security). Rendered between Scope
//      and Assumptions in the proposal template.
//
// No database, no pricing, no React. Pure TypeScript. Wording is
// generated at render time from whatever the operator has captured —
// never stored per row. Voice rules from CLAUDE.md apply (no "premium"
// / "eco-friendly" / "industry-leading", no testimonials, reliable
// and detail-focused tone).

import type { CommercialQuoteDetails } from './commercialQuote'
import type { ProposalGroupKey, ProposalScopeGroup, ProposalScopeTask } from './commercialProposalMapping'

// ── Area wording specs ─────────────────────────────────────────────
// One entry per ProposalGroupKey. `opening` is always rendered when
// the group has at least one included task. Each `trigger` fires if
// any task's (task_name + task_group) haystack matches the pattern;
// matched triggers are emitted once, in `rank` order. `closing`, when
// present, is appended at the end.

export interface WordingTrigger {
  pattern: RegExp
  sentence: string
  rank: number
}

export interface AreaWordingSpec {
  opening: string
  triggers: readonly WordingTrigger[]
  closing: string | null
}

export const AREA_WORDING_SPECS: Record<ProposalGroupKey, AreaWordingSpec> = {
  general_areas: {
    opening:
      'General areas covered by the programme are maintained to a consistent baseline on each service. The tasks listed below are carried out on the cadence shown alongside each line.',
    triggers: [
      { rank: 10, pattern: /vacuum|carpet/i,             sentence: 'Carpeted floors are vacuumed with attention to edges and under-furniture zones.' },
      { rank: 20, pattern: /mop|hard.?floor/i,           sentence: 'Hard-floor zones are mopped using a neutral cleaner.' },
      { rank: 30, pattern: /dust/i,                       sentence: 'Surfaces and fittings are dusted as part of the scheduled rotation.' },
      { rank: 40, pattern: /glass|window/i,               sentence: 'Internal glass is spot-cleaned to remove visible marks.' },
    ],
    closing: 'Waste is removed and bins are relined as part of each service.',
  },

  offices_workstations: {
    opening:
      'Workstations and office areas are cleaned to a consistent, low-disruption standard. The team follows a repeatable rhythm so surfaces, floors, and high-touch points stay at a reliable baseline every visit.',
    triggers: [
      {
        rank: 10,
        pattern: /desk.*(wipe|clear)|clear.*surface|workstation/i,
        sentence: 'Clear desk surfaces are wiped and sanitised on each service, with high-touch zones (keyboard area, mouse, phone, chair armrests) prioritised.',
      },
      {
        rank: 20,
        pattern: /dust.*(monitor|accessor|shelv|furniture)/i,
        sentence: 'Monitors, accessories, and side furniture are dusted as part of the scheduled rotation.',
      },
      {
        rank: 30,
        pattern: /vacuum|carpet/i,
        sentence: 'Carpeted zones are vacuumed with attention to edges and under-desk areas.',
      },
      {
        rank: 40,
        pattern: /mop|hard.?floor/i,
        sentence: 'Hard-floor zones are mopped using a neutral cleaner.',
      },
      {
        rank: 50,
        pattern: /meeting|boardroom/i,
        sentence: 'Meeting and boardrooms are reset between visits — tables wiped, chairs restored, whiteboards prepared.',
      },
    ],
    closing: 'Office bins are emptied and relined every visit.',
  },

  kitchens_breakout: {
    opening:
      'Kitchen and breakout areas are kept presentable and hygienic for staff use. The programme covers surface cleaning, appliance exteriors, touchpoint sanitation, and waste management on every visit.',
    triggers: [
      {
        rank: 10,
        pattern: /bench|splashback/i,
        sentence: 'Benches and splashbacks are wiped down and sanitised.',
      },
      {
        rank: 20,
        pattern: /sink|tap|drain/i,
        sentence: 'Sinks, taps, and drains are cleaned and polished.',
      },
      {
        rank: 30,
        pattern: /fridge|microwave|dishwasher.*front|coffee|appliance/i,
        sentence: 'Appliance fronts — including fridge, microwave, dishwasher, and coffee machine — are wiped clean.',
      },
      {
        rank: 40,
        pattern: /dishwasher.*(load|run|cycle|unload)/i,
        sentence: 'The dishwasher is loaded, run, and unloaded as part of each service where the site is staffed.',
      },
      {
        rank: 50,
        pattern: /touchpoint|sanitise.*(handle|switch)|handle.*switch/i,
        sentence: 'High-touch points (handles, switches, appliance handles) are sanitised.',
      },
      {
        rank: 60,
        pattern: /mop|kitchen.?floor/i,
        sentence: 'Kitchen floors are mopped with a suitable cleaner.',
      },
    ],
    closing: 'Bins are emptied and kitchen consumables (dishwasher tablets, detergent, hand soap) are restocked where supplied by Sano.',
  },

  bathrooms_washrooms: {
    opening:
      'Bathrooms and washrooms are maintained to a hygienic standard. All fixtures, surfaces, and high-touch points are cleaned and disinfected on every service.',
    triggers: [
      {
        rank: 10,
        pattern: /toilet|urinal/i,
        sentence: 'Toilets and urinals are cleaned and disinfected inside and out, with attention to seat fixings, pan rims, and flush mechanisms.',
      },
      {
        rank: 20,
        pattern: /basin|mirror|tapware/i,
        sentence: 'Basins, mirrors, and tapware are cleaned to a streak-free finish.',
      },
      {
        rank: 30,
        pattern: /(mop|floor).*disinfect|disinfect.*floor|bathroom.?floor/i,
        sentence: 'Floors are mopped with a bathroom-appropriate disinfectant.',
      },
      {
        rank: 40,
        pattern: /restock|consumable|soap|hand.?towel|toilet.?paper/i,
        sentence: 'Consumables — hand soap, paper towels, and toilet paper — are checked and restocked from Sano-supplied stock.',
      },
      {
        rank: 50,
        pattern: /sanitary/i,
        sentence: 'Sanitary bins are emptied and relined as required.',
      },
      {
        rank: 60,
        pattern: /touchpoint|handle|flush|switch/i,
        sentence: 'Touchpoints — door handles, flush buttons, light switches, and taps — are sanitised on each visit.',
      },
    ],
    closing: null,
  },

  common_areas: {
    opening:
      'Shared areas — reception, corridors, stairwells, and lifts — are kept presentable on the same rhythm as the main programme so the path between workspaces stays tidy.',
    triggers: [
      {
        rank: 10,
        pattern: /reception|lobby|front.?of.?house|entry/i,
        sentence: 'Reception and lobby surfaces (desk, seating, entry doors) are kept presentable as the first impression of the site.',
      },
      {
        rank: 20,
        pattern: /stair|corridor|hallway/i,
        sentence: 'Corridors and stairwells are vacuumed or mopped to suit the floor type, with handrails dusted on a weekly rotation.',
      },
      {
        rank: 30,
        pattern: /lift|elevator/i,
        sentence: 'Lift interiors — panels, buttons, mirrors, handrails, and floor — are wiped on each visit.',
      },
      {
        rank: 40,
        pattern: /glass|partition/i,
        sentence: 'Internal glass partitions and lobby doors are spot-cleaned to remove visible marks.',
      },
      {
        rank: 50,
        pattern: /mat|entrance.?mat|entry.?mat/i,
        sentence: 'Entry mats are cleaned and repositioned as part of the floor-care routine.',
      },
    ],
    closing: null,
  },

  specialist_areas: {
    opening:
      'Specialist areas are maintained under restricted protocols appropriate to the space.',
    triggers: [
      {
        rank: 10,
        pattern: /server|it.?room|data.?room/i,
        sentence: 'Server and IT rooms are cleaned dry — dust only, no liquids used near equipment.',
      },
      {
        rank: 20,
        pattern: /archive|storage/i,
        sentence: 'Archive and storage rooms are kept orderly with scheduled floor maintenance and waste removal.',
      },
      {
        rank: 30,
        pattern: /lab|clinical|sterile|clean.?room|workshop|machinery|plant.?room/i,
        sentence: 'Other specialist areas are cleaned to the site-specific protocols agreed with the client.',
      },
    ],
    closing: null,
  },
}

// ── buildAreaParagraph ─────────────────────────────────────────────

function taskHaystack(t: ProposalScopeTask): string {
  return [t.task_name, t.area_type ?? '', t.notes ?? ''].join(' ')
}

/**
 * Generate the paragraph for a single ProposalScopeGroup. Returns an
 * empty string when the group has no tasks (caller can skip rendering).
 *
 * Triggered sentences are de-duplicated and emitted in rank order —
 * so the paragraph reads the same whether the operator added three
 * toilet tasks or one; "Toilets and urinals…" appears at most once.
 *
 * `details` is currently unused; accepted for forward-compatibility
 * (lets a future rank modifier look at sector / traffic / frequency).
 */
export function buildAreaParagraph(
  group: ProposalScopeGroup,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _details: CommercialQuoteDetails,
): string {
  if (!group.tasks || group.tasks.length === 0) return ''
  const spec = AREA_WORDING_SPECS[group.key]
  if (!spec) return ''

  const haystacks = group.tasks.map(taskHaystack)

  const firedTriggers: WordingTrigger[] = []
  for (const trigger of spec.triggers) {
    if (firedTriggers.includes(trigger)) continue
    for (const h of haystacks) {
      if (trigger.pattern.test(h)) {
        firedTriggers.push(trigger)
        break
      }
    }
  }
  firedTriggers.sort((a, b) => a.rank - b.rank)

  const sentences: string[] = [spec.opening, ...firedTriggers.map((t) => t.sentence)]
  if (spec.closing) sentences.push(spec.closing)

  return sentences.join(' ')
}

// ── Optional paragraphs ────────────────────────────────────────────
// Standalone paragraphs inserted between Scope and Assumptions when
// quote-level details trigger them. Each carries a stable `key` so the
// renderer can use it as a React key and so future modifications can
// target a specific paragraph by identity.

export interface OptionalParagraph {
  key: string
  heading: string
  text: string
}

const ACCESS_ALARM_PATTERN = /alarm|access.?code|swipe|after.?hours|security.?code/i

/**
 * Build the list of optional paragraphs for the current quote. Order
 * mirrors the proposal's logical reading order: consumables first
 * (the operator commitment), then access (the operational detail).
 * Returns an empty list when nothing triggers — caller can use the
 * length to decide whether to render the wrapping section at all.
 */
export function buildOptionalParagraphs(
  details: CommercialQuoteDetails,
): OptionalParagraph[] {
  const out: OptionalParagraph[] = []

  // Consumables — exactly one variant fires, based on details.consumables_by.
  if (details.consumables_by === 'sano') {
    out.push({
      key: 'consumables_by_sano',
      heading: 'Consumables',
      text:
        'Consumables — chemicals, cloths, hand soap, paper towels, and toilet paper — are supplied by Sano as part of the agreed service fee. Stock is monitored on each visit and replenished ahead of running low.',
    })
  } else if (details.consumables_by === 'client') {
    out.push({
      key: 'consumables_by_client',
      heading: 'Consumables',
      text:
        'Consumables are supplied by the client. Sano uses what is on site and will flag low stock in the service report so the site stays supplied without surprises.',
    })
  } else if (details.consumables_by === 'shared') {
    out.push({
      key: 'consumables_shared',
      heading: 'Consumables',
      text:
        'Consumables are supplied on a shared basis: cleaning chemicals and cloths by Sano; paper goods and hand soap by the client. The split is confirmed in writing before service starts, and stock is monitored on both sides.',
    })
  }

  // Security / after-hours access — fires when access_requirements
  // mentions alarm / access code / swipe / after-hours.
  const access = details.access_requirements?.trim() ?? ''
  if (access && ACCESS_ALARM_PATTERN.test(access)) {
    out.push({
      key: 'security_alarm',
      heading: 'Site access and security',
      text:
        'Site access is handled through the nominated Sano supervisor, who holds the current alarm code and any building swipe access. Access details are rotated whenever a team member leaves Sano so the client retains confidence in who holds the codes.',
    })
  }

  return out
}
