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
      'General areas are kept to a consistent baseline. Each task below follows its own cadence.',
    triggers: [
      { rank: 10, pattern: /vacuum|carpet/i,             sentence: 'Carpets are vacuumed, including edges and under-furniture zones.' },
      { rank: 20, pattern: /mop|hard.?floor/i,           sentence: 'Hard floors are mopped with a neutral cleaner.' },
      { rank: 30, pattern: /dust/i,                       sentence: 'Surfaces and fittings are dusted on rotation.' },
      { rank: 40, pattern: /glass|window/i,               sentence: 'Internal glass is spot-cleaned to keep it mark-free.' },
    ],
    closing: 'Bins are emptied and relined every visit.',
  },

  offices_workstations: {
    opening:
      'Offices and workstations are cleaned quietly, without disrupting the day. Surfaces, floors, and high-touch points are maintained consistently.',
    triggers: [
      {
        rank: 10,
        pattern: /desk.*(wipe|clear)|clear.*surface|workstation/i,
        sentence: 'Clear desk surfaces are wiped and sanitised every visit, with high-touch zones — keyboard area, mouse, phone, chair armrests — addressed first.',
      },
      {
        rank: 20,
        pattern: /dust.*(monitor|accessor|shelv|furniture)/i,
        sentence: 'Monitors, accessories, and side furniture are dusted on rotation.',
      },
      {
        rank: 30,
        pattern: /vacuum|carpet/i,
        sentence: 'Carpets are vacuumed, including edges and under-desk areas.',
      },
      {
        rank: 40,
        pattern: /mop|hard.?floor/i,
        sentence: 'Hard floors are mopped with a neutral cleaner.',
      },
      {
        rank: 50,
        pattern: /meeting|boardroom/i,
        sentence: 'Meeting and boardrooms are reset between bookings — tables wiped, chairs returned, whiteboards prepared.',
      },
    ],
    closing: 'Office bins are emptied and relined every visit.',
  },

  kitchens_breakout: {
    opening:
      'Kitchens and breakout areas are kept clean and ready for daily staff use. Surfaces, appliances, touchpoints, and waste are addressed every visit.',
    triggers: [
      {
        rank: 10,
        pattern: /bench|splashback/i,
        sentence: 'Benches and splashbacks are cleaned and reset for use.',
      },
      {
        rank: 20,
        pattern: /sink|tap|drain/i,
        sentence: 'Sinks, taps, and drains are cleaned and polished.',
      },
      {
        rank: 30,
        pattern: /fridge|microwave|dishwasher.*front|coffee|appliance/i,
        sentence: 'Appliance fronts — fridge, microwave, dishwasher, coffee machine — are wiped down.',
      },
      {
        rank: 40,
        pattern: /dishwasher.*(load|run|cycle|unload)/i,
        sentence: 'Where Sano is staffed on site, the dishwasher is loaded, run, and unloaded each shift.',
      },
      {
        rank: 50,
        pattern: /touchpoint|sanitise.*(handle|switch)|handle.*switch/i,
        sentence: 'Door handles, light switches, and appliance handles are sanitised.',
      },
      {
        rank: 60,
        pattern: /mop|kitchen.?floor/i,
        sentence: 'Kitchen floors are mopped with a food-safe cleaner.',
      },
    ],
    closing: 'Bins are emptied, and kitchen consumables — dishwasher tablets, detergent, hand soap — are restocked when supplied by Sano.',
  },

  bathrooms_washrooms: {
    opening:
      'Bathrooms and washrooms are disinfected on every visit. All fixtures, surfaces, and high-touch points are addressed.',
    triggers: [
      {
        rank: 10,
        pattern: /toilet|urinal/i,
        sentence: 'Toilets and urinals are cleaned inside and out, with seat fixings, pan rims, and flush mechanisms all checked.',
      },
      {
        rank: 20,
        pattern: /basin|mirror|tapware/i,
        sentence: 'Basins, mirrors, and tapware are cleaned to a streak-free finish.',
      },
      {
        rank: 30,
        pattern: /(mop|floor).*disinfect|disinfect.*floor|bathroom.?floor/i,
        sentence: 'Floors are mopped with a bathroom-grade disinfectant.',
      },
      {
        rank: 40,
        pattern: /restock|consumable|soap|hand.?towel|toilet.?paper/i,
        sentence: 'Hand soap, paper towels, and toilet paper are checked and refilled from Sano stock.',
      },
      {
        rank: 50,
        pattern: /sanitary/i,
        sentence: 'Sanitary bins are emptied and relined.',
      },
      {
        rank: 60,
        pattern: /touchpoint|handle|flush|switch/i,
        sentence: 'Door handles, flush buttons, light switches, and taps are sanitised every visit.',
      },
    ],
    closing: null,
  },

  common_areas: {
    opening:
      'Shared areas — reception, corridors, stairwells, and lifts — are kept tidy alongside the main programme.',
    triggers: [
      {
        rank: 10,
        pattern: /reception|lobby|front.?of.?house|entry/i,
        sentence: 'Reception and lobby surfaces — desk, seating, entry doors — are kept presentable for first impressions.',
      },
      {
        rank: 20,
        pattern: /stair|corridor|hallway/i,
        sentence: 'Corridors and stairwells are vacuumed or mopped to suit the floor, with handrails dusted weekly.',
      },
      {
        rank: 30,
        pattern: /lift|elevator/i,
        sentence: 'Lift interiors — panels, buttons, mirrors, handrails, and floor — are wiped every visit.',
      },
      {
        rank: 40,
        pattern: /glass|partition/i,
        sentence: 'Internal glass partitions and lobby doors are spot-cleaned as needed.',
      },
      {
        rank: 50,
        pattern: /mat|entrance.?mat|entry.?mat/i,
        sentence: 'Entry mats are cleaned and repositioned during floor care.',
      },
    ],
    closing: null,
  },

  specialist_areas: {
    opening:
      'Specialist areas follow protocols appropriate to the space.',
    triggers: [
      {
        rank: 10,
        pattern: /server|it.?room|data.?room/i,
        sentence: 'Server and IT rooms are cleaned dry — dust only, no liquids near equipment.',
      },
      {
        rank: 20,
        pattern: /archive|storage/i,
        sentence: 'Archive and storage rooms are kept orderly, with scheduled floor care and waste removal.',
      },
      {
        rank: 30,
        pattern: /lab|clinical|sterile|clean.?room|workshop|machinery|plant.?room/i,
        sentence: 'Other specialist areas follow site-specific protocols agreed with the client.',
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
        'Sano supplies all consumables — chemicals, cloths, hand soap, paper towels, and toilet paper — as part of the service fee. Stock is checked every visit and replenished as needed.',
    })
  } else if (details.consumables_by === 'client') {
    out.push({
      key: 'consumables_by_client',
      heading: 'Consumables',
      text:
        "The client supplies all consumables. Sano uses what's on site and flags low stock in the service report so nothing runs out.",
    })
  } else if (details.consumables_by === 'shared') {
    out.push({
      key: 'consumables_shared',
      heading: 'Consumables',
      text:
        'Consumables are split: Sano supplies cleaning chemicals and cloths; the client supplies paper goods and hand soap. The split is confirmed in writing before service starts, and stock is monitored on both sides.',
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
        'Site access — alarm code and any building swipe access — is held by the nominated Sano supervisor. Codes are rotated whenever a team member leaves, so you always know who holds current access.',
    })
  }

  return out
}
