// Sano Deep Clean Detail Checklist
//
// DRAFT CONTENT — Phase B scaffold only.
// Authored from scratch for Phase B visual review. Final item text MUST be
// authored fresh per the Phase A planning doc §5.3 — items must be
// DISTINCT from the Home Clean Standard, focused on build-up, edges,
// fittings, surfaces, corners, high-touch points, reachable dust, and
// areas commonly missed during routine cleaning. Final content must come
// from a Sano-authored Deep Clean source before this file is integrated
// into /services/deep-cleaning.
//
// This checklist intentionally has NO `pointCountLabel` — deep clean
// inclusions are condition-based, not fixed-count. See §5.2 of the
// Phase A planning doc.
//
// Originality boundary: this file MUST NOT derive items, room names,
// ordering, or wording from the Enhanced Cleaning reference documents
// at F:\Sano\20-Content\Sano Cleaning Checklist\. The deep clean
// standard is authored fresh from Sano source material.

import type { Checklist } from '@/types/checklist'

export const SANO_DEEP_CLEAN_DETAIL: Checklist = {
  slug: 'sano-deep-clean-detail',
  name: 'Sano Deep Clean Detail Checklist',
  shortName: 'Deep Clean Detail',
  caveat:
    'Deep cleaning inclusions depend on property size, condition, access, selected scope and agreed time allowance. The checklist below describes what can be addressed in a deep clean; your quote confirms what will be covered in your booked time.',
  isDraft: true,
  rooms: [
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Inside oven cleaned, including racks and trays where accessible' },
        { text: 'Rangehood filters degreased and exterior detailed' },
        { text: 'Inside microwave cleaned, including turntable' },
        { text: 'Cupboard fronts and handles detailed, including grease around the cooktop area' },
        { text: 'Splashback grout spot-treated where reachable' },
        { text: 'Behind and beside freestanding appliances cleaned where access allows', note: 'Subject to safe pull-out access.' },
        { text: 'Sink, drain edges and tapware de-scaled' },
        { text: 'Floor edges, kick-boards and corners detailed by hand' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Shower glass de-scaled and polished, including frames and seals' },
        { text: 'Grout lines treated for build-up where condition allows' },
        { text: 'Tile walls scrubbed beyond routine spot-clean' },
        { text: 'Toilet base, behind, and pan area detailed' },
        { text: 'Extractor fan vent cover dusted and wiped where reachable' },
        { text: 'Floor edges and behind toilet cleaned by hand' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Skirting boards and door frames wiped by hand' },
        { text: 'Inside accessible wardrobe shelves dusted where empty' },
        { text: 'Behind and under bed vacuumed where access allows' },
        { text: 'Light fittings and ceiling fan blades dusted where reachable' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Skirting boards, door frames and architraves wiped by hand' },
        { text: 'Behind and under furniture vacuumed where access allows' },
        { text: 'Soft furnishings vacuumed (sofas, armchairs) where suitable' },
        { text: 'Light fittings and ceiling fan blades dusted where reachable' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Skirting boards and door frames wiped by hand' },
        { text: 'Behind and under dining furniture vacuumed where access allows' },
        { text: 'Chair legs, rungs and underside of table cleaned where reachable' },
        { text: 'Light fittings and pendants dusted where reachable' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Skirting boards and door frames wiped by hand' },
        { text: 'Shelves dusted, around items left in place' },
        { text: 'Cables, monitor stands and desk edges dusted carefully' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Behind and beside washer/dryer cleaned where access allows', note: 'Subject to safe pull-out access.' },
        { text: 'Dryer lint trap area cleaned' },
        { text: 'Tub, surrounds and tapware de-scaled' },
        { text: 'Floor edges, kick-boards and corners detailed by hand' },
      ],
    },
    {
      slug: 'edges-touch-points',
      name: 'Edges & Touch Points',
      icon: 'Hand',
      items: [
        { text: 'Door handles, light switches and power-point faces wiped throughout' },
        { text: 'Skirting boards spot-detailed throughout reachable areas' },
        { text: 'Banister rails, newel posts and stair edges detailed' },
        { text: 'Picture rails and high ledges dusted where reachable' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door, frame, handle and threshold detailed' },
        { text: 'Reachable cobwebs cleared from eaves at the front entry' },
        { text: 'Final detail walk-through to address any missed touch-points' },
      ],
    },
    {
      slug: 'optional-extras',
      name: 'Optional Extras',
      icon: 'PlusCircle',
      items: [
        { text: 'Inside fridge clean', note: 'Quoted separately based on size and condition.' },
        { text: 'Inside cabinet detail', note: 'Cabinets must be emptied by the customer.' },
        { text: 'Wall spot-treatment beyond routine marks', note: 'Subject to paint type and condition.' },
        { text: 'Carpet steam clean', note: 'Quoted separately as a paired service.' },
      ],
    },
  ],
}
