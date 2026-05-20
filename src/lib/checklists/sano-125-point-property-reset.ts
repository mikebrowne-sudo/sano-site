// Sano 125-Point Property Reset Checklist
//
// DRAFT CONTENT — Phase B scaffold only.
// Authored from scratch for Phase B visual review. Final item text, item
// ordering and item counts MUST come from Sano's own source DOCX
// ("Sano Property Reset Checklist") before this file is integrated into
// /services/end-of-tenancy. The `pointCountLabel` is editorial and stays
// "125-Point" even while drafted items are below 125.
//
// Originality boundary: this file MUST NOT derive items, room names,
// ordering, or wording from the Enhanced Cleaning reference documents
// at F:\Sano\20-Content\Sano Cleaning Checklist\. Source content only
// from Sano's own DOCX.

import type { Checklist } from '@/types/checklist'

export const SANO_125_POINT_PROPERTY_RESET: Checklist = {
  slug: 'sano-125-point-property-reset',
  name: 'Sano 125-Point Property Reset Checklist',
  shortName: 'Property Reset',
  pointCountLabel: '125-Point',
  isDraft: true,
  rooms: [
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Inside oven cleaned' },
        { text: 'Oven racks and door glass cleaned' },
        { text: 'Inside microwave cleaned' },
        { text: 'Inside fridge cleaned', note: 'To be emptied and disconnected first.' },
        { text: 'Rangehood interior and filters degreased' },
        { text: 'Inside cabinets and drawers cleaned' },
        { text: 'Splashback and grout treated' },
        { text: 'Benchtops and sink polished' },
        { text: 'Floor edges and kick-boards detailed' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Shower screens de-scaled' },
        { text: 'Frames and seals detailed' },
        { text: 'Tile grout treated' },
        { text: 'Toilet detailed inside and out' },
        { text: 'Vanity and basin polished' },
        { text: 'Mirrors cleaned' },
        { text: 'Inside cabinets cleaned' },
        { text: 'Extractor fan vent cleaned' },
        { text: 'Floors detailed by hand' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Inside wardrobes cleaned' },
        { text: 'Shelves and rails wiped' },
        { text: 'Skirting boards wiped' },
        { text: 'Door frames wiped' },
        { text: 'Window sills and tracks cleaned' },
        { text: 'Switches and door handles wiped' },
        { text: 'Floors vacuumed including edges' },
        { text: 'Light fittings dusted' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames and architraves wiped' },
        { text: 'Window sills and tracks cleaned' },
        { text: 'Switches and door handles wiped' },
        { text: 'Floors vacuumed and mopped including edges' },
        { text: 'Ceiling fans and light fittings dusted' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames wiped' },
        { text: 'Window sills and tracks cleaned' },
        { text: 'Light fittings dusted' },
        { text: 'Floors vacuumed and mopped' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Skirting boards wiped' },
        { text: 'Door frames wiped' },
        { text: 'Window sills and tracks cleaned' },
        { text: 'Switches and door handles wiped' },
        { text: 'Floors vacuumed and mopped' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Tub and tapware polished' },
        { text: 'Inside cabinets cleaned' },
        { text: 'Behind appliances cleaned', note: 'Where pull-out access allows.' },
        { text: 'Floor edges detailed' },
      ],
    },
    {
      slug: 'hallways-stairs',
      name: 'Hallways & Stairs',
      icon: 'DoorOpen',
      items: [
        { text: 'Skirting boards and door frames wiped' },
        { text: 'Banister rails detailed' },
        { text: 'Stair treads and risers cleaned' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Switches and high-touch points wiped' },
      ],
    },
    {
      slug: 'walls-marks',
      name: 'Walls & Marks',
      icon: 'PaintRoller',
      items: [
        { text: 'Spot-cleaning of marks', note: 'Subject to paint condition.' },
        { text: 'Light scuff treatment around switches and doorways' },
        { text: 'Cobwebs cleared from reachable corners' },
      ],
    },
    {
      slug: 'windows-glass',
      name: 'Windows & Glass',
      icon: 'PanelTop',
      items: [
        { text: 'Interior windows cleaned' },
        { text: 'Sills and reachable tracks cleaned' },
        { text: 'Interior glass doors polished' },
        { text: 'Ground-floor exterior windows cleaned', note: 'Upper levels quoted separately.' },
      ],
    },
    {
      slug: 'outdoor-garage',
      name: 'Outdoor & Garage',
      icon: 'Warehouse',
      items: [
        { text: 'Garage floor swept' },
        { text: 'Cobwebs cleared from reachable eaves' },
        { text: 'Entry path swept' },
        { text: 'Outdoor bins rinsed on request', note: 'Quoted separately.' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door and frame detailed' },
        { text: 'Letterbox and door number wiped' },
        { text: 'High-touch points re-checked' },
        { text: 'Final walk-through before handover' },
      ],
    },
  ],
}
