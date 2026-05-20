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
    'Deep cleaning is condition-based. Inclusions depend on property size, condition, access, selected scope and agreed time allowance. Your quote confirms what will be covered in your booked clean.',
  isDraft: true,
  rooms: [
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Inside oven cleaned' },
        { text: 'Oven racks and trays cleaned' },
        { text: 'Rangehood filters degreased' },
        { text: 'Inside microwave cleaned' },
        { text: 'Cupboard fronts detailed' },
        { text: 'Splashback grout spot-treated' },
        { text: 'Behind appliances cleaned', note: 'Where pull-out access allows.' },
        { text: 'Sink and tapware de-scaled' },
        { text: 'Floor edges and kick-boards detailed' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Shower glass de-scaled' },
        { text: 'Frames and seals detailed' },
        { text: 'Grout lines treated' },
        { text: 'Tile walls scrubbed' },
        { text: 'Toilet base and behind detailed' },
        { text: 'Extractor fan vent wiped' },
        { text: 'Floor edges detailed by hand' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames wiped' },
        { text: 'Inside accessible wardrobes dusted' },
        { text: 'Under bed vacuumed where access allows' },
        { text: 'Ceiling fan blades dusted' },
        { text: 'Window sills and tracks cleaned' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames and architraves wiped' },
        { text: 'Under furniture vacuumed where access allows' },
        { text: 'Soft furnishings vacuumed' },
        { text: 'Ceiling fan blades dusted' },
        { text: 'Window sills and tracks cleaned' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames wiped' },
        { text: 'Under furniture vacuumed' },
        { text: 'Chair legs and table underside cleaned' },
        { text: 'Pendant lights dusted' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Shelves dusted around items' },
        { text: 'Cables and monitor stands dusted' },
        { text: 'Window sills and tracks cleaned' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Behind appliances cleaned', note: 'Where pull-out access allows.' },
        { text: 'Dryer lint trap area cleaned' },
        { text: 'Tub and tapware de-scaled' },
        { text: 'Floor edges detailed by hand' },
      ],
    },
    {
      slug: 'edges-touch-points',
      name: 'Edges & Touch Points',
      icon: 'Hand',
      items: [
        { text: 'Door handles wiped throughout' },
        { text: 'Light switches wiped throughout' },
        { text: 'Power-point faces wiped' },
        { text: 'Skirting boards spot-detailed' },
        { text: 'Banister rails detailed' },
        { text: 'Picture rails dusted' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door and frame detailed' },
        { text: 'Threshold cleaned' },
        { text: 'Cobwebs cleared at entry' },
        { text: 'Final detail walk-through' },
      ],
    },
    {
      slug: 'optional-extras',
      name: 'Optional Extras',
      icon: 'PlusCircle',
      items: [
        { text: 'Inside fridge clean', note: 'Quoted separately.' },
        { text: 'Inside cabinet detail', note: 'Cabinets to be emptied first.' },
        { text: 'Wall spot-treatment', note: 'Subject to paint condition.' },
        { text: 'Carpet steam clean', note: 'Quoted separately.' },
      ],
    },
  ],
}
