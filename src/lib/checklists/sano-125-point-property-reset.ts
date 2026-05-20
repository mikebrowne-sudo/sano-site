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
        { text: 'Inside oven cleaned, including racks, trays and door glass' },
        { text: 'Inside microwave cleaned' },
        { text: 'Inside and behind fridge cleaned where access allows', note: 'Customer to empty and disconnect prior to clean.' },
        { text: 'Rangehood interior and filters degreased' },
        { text: 'Inside accessible cabinets and drawers cleaned' },
        { text: 'Splashback and tile grout treated for build-up' },
        { text: 'Benchtops, sink and tapware de-scaled and polished' },
        { text: 'Floor edges, kick-boards and corners detailed by hand' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Shower screens, frames and seals de-scaled and polished' },
        { text: 'Tile grout treated for build-up where condition allows' },
        { text: 'Toilet cleaned and sanitised, including base, behind and pan area' },
        { text: 'Vanity, basin, tapware and mirror polished' },
        { text: 'Inside cabinets and drawers cleaned' },
        { text: 'Extractor fan vent cover dusted and cleaned' },
        { text: 'Floors, edges and behind toilet detailed by hand' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Inside wardrobes cleaned, including shelves and rails' },
        { text: 'Skirting boards, door frames and architraves wiped by hand' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
        { text: 'Light switches, power-point faces and door handles wiped' },
        { text: 'Floors vacuumed thoroughly, including edges and corners' },
        { text: 'Light fittings dusted where reachable' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Skirting boards, door frames and architraves wiped by hand' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
        { text: 'Light switches, power-point faces and door handles wiped' },
        { text: 'Floors vacuumed and mopped, including edges and corners' },
        { text: 'Light fittings, pendants and ceiling fans dusted where reachable' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Skirting boards and door frames wiped by hand' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
        { text: 'Light fittings and pendants dusted where reachable' },
        { text: 'Floors vacuumed and mopped, including edges and corners' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Skirting boards, door frames and architraves wiped by hand' },
        { text: 'Window sills, tracks and reachable frames cleaned' },
        { text: 'Light switches, power-point faces and door handles wiped' },
        { text: 'Floors vacuumed and mopped, including edges and corners' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Tub, surrounds and tapware de-scaled and polished' },
        { text: 'Inside accessible cabinets and shelves cleaned' },
        { text: 'Behind appliances cleaned where access allows', note: 'Subject to safe pull-out access.' },
        { text: 'Floors, edges and corners detailed by hand' },
      ],
    },
    {
      slug: 'hallways-stairs',
      name: 'Hallways & Stairs',
      icon: 'DoorOpen',
      items: [
        { text: 'Skirting boards, door frames and banister rails wiped by hand' },
        { text: 'Stair edges, treads and risers cleaned' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Wall switches, door handles and high-touch points wiped' },
      ],
    },
    {
      slug: 'walls-marks',
      name: 'Walls & Marks',
      icon: 'PaintRoller',
      items: [
        { text: 'Spot-cleaning of marks where paint type allows', note: 'Cannot guarantee removal of scuffs, stains or marks beyond what paint allows.' },
        { text: 'Light scuff treatment around switches, handles and doorways' },
        { text: 'Cobwebs cleared from reachable wall and ceiling corners' },
      ],
    },
    {
      slug: 'windows-glass',
      name: 'Windows & Glass',
      icon: 'PanelTop',
      items: [
        { text: 'Interior windows, sills and reachable tracks cleaned' },
        { text: 'Glass doors and interior glass surfaces polished' },
        { text: 'Exterior windows where ground-floor and accessible', note: 'Upper-level exteriors quoted separately.' },
      ],
    },
    {
      slug: 'outdoor-garage',
      name: 'Outdoor & Garage',
      icon: 'Warehouse',
      items: [
        { text: 'Garage floor swept and visible debris removed' },
        { text: 'Cobwebs cleared from reachable eaves and garage interior' },
        { text: 'Entry path and patio swept where included in agreed scope' },
        { text: 'Outdoor bins rinsed if requested', note: 'Quoted separately based on condition.' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door, frame, handle and threshold detailed' },
        { text: 'Letterbox and door number wiped where present' },
        { text: 'High-touch points checked throughout the property' },
        { text: 'Final walk-through to address any missed areas before handover' },
      ],
    },
  ],
}
