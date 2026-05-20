// Sano 100-Point Home Clean Checklist
//
// DRAFT CONTENT — Phase B scaffold only.
// Authored from scratch for Phase B visual review. Final item text, item
// ordering, and item counts MUST come from Sano's own source DOCX
// ("Sano Home Clean Checklist") before this file is integrated into
// /services/regular-cleaning. The `pointCountLabel` is editorial and
// stays "100-Point" even while drafted items are below 100.
//
// Originality boundary: this file MUST NOT derive items, room names,
// ordering, or wording from the Enhanced Cleaning reference documents
// at F:\Sano\20-Content\Sano Cleaning Checklist\. Source content only
// from Sano's own DOCX.

import type { Checklist } from '@/types/checklist'

export const SANO_100_POINT_HOME_CLEAN: Checklist = {
  slug: 'sano-100-point-home-clean',
  name: 'Sano 100-Point Home Clean Checklist',
  shortName: 'Home Clean Standard',
  pointCountLabel: '100-Point',
  isDraft: true,
  rooms: [
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Benchtops cleaned and wiped down' },
        { text: 'Sink and tapware cleaned and polished' },
        { text: 'Stovetop and splashback wiped' },
        { text: 'Appliance exteriors wiped (oven, fridge, dishwasher, microwave)' },
        { text: 'Cupboard fronts spot-cleaned where marked' },
        { text: 'Rangehood exterior wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied and liners replaced' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Basins, tapware and mirrors cleaned and polished' },
        { text: 'Showers and screens cleaned and de-scaled where required' },
        { text: 'Bath cleaned inside and out' },
        { text: 'Toilet cleaned and sanitised including base and behind' },
        { text: 'Tiled walls spot-cleaned' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Towels straightened and bins emptied' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Beds made and linen straightened' },
        { text: 'Surfaces dusted, including bedside tables and dressers' },
        { text: 'Mirrors and glass surfaces wiped' },
        { text: 'Floors vacuumed (carpet) or vacuumed and mopped (hard floors)' },
        { text: 'Visible cobwebs removed where reachable' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Surfaces dusted, including coffee tables, shelves and side tables' },
        { text: 'Cushions plumped and throws straightened' },
        { text: 'Skirting boards spot-cleaned where reachable' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Mirrors and glass tops wiped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Dining table and chairs wiped down' },
        { text: 'Surfaces dusted, including sideboards and cabinets' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Light fittings dusted where reachable' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Desk surfaces dusted and wiped, around items left in place' },
        { text: 'Shelves dusted where reachable' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Bench, sink and tapware cleaned' },
        { text: 'Washer and dryer exteriors wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Visible lint and dust removed from surfaces' },
      ],
    },
    {
      slug: 'hallways-stairs',
      name: 'Hallways & Stairs',
      icon: 'DoorOpen',
      items: [
        { text: 'Floors vacuumed and mopped' },
        { text: 'Skirting boards and banisters spot-cleaned' },
        { text: 'Wall switches and door handles wiped' },
        { text: 'Visible cobwebs removed where reachable' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door, frame and handles wiped' },
        { text: 'Mat shaken out and area cleaned underneath' },
        { text: 'High-touch points wiped (light switches, door handles, banister tops)' },
        { text: 'Final walk-through to straighten and finish' },
      ],
    },
  ],
}
