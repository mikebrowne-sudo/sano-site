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
//
// Category structure: 8 categories per the approved Phase B v2 direction
// (Bedrooms, Bathrooms, Kitchen, Dining Room, Living Areas, Office/Study,
// Laundry, Other). The "Other" category absorbs hallways/stairs/entry/
// final-touches content for visual balance with the Enhanced reference;
// may be renamed in a later Sano content pass.

import type { Checklist } from '@/types/checklist'

export const SANO_100_POINT_HOME_CLEAN: Checklist = {
  slug: 'sano-100-point-home-clean',
  name: 'Sano 100-Point Home Clean Checklist',
  shortName: 'Home Clean Standard',
  pointCountLabel: '100-Point',
  isDraft: true,
  rooms: [
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Beds made' },
        { text: 'Pillows arranged' },
        { text: 'Surfaces dusted' },
        { text: 'Bedside tables wiped' },
        { text: 'Dressers wiped' },
        { text: 'Mirrors cleaned' },
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Carpets vacuumed' },
        { text: 'Hard floors mopped' },
        { text: 'Bins emptied' },
        { text: 'Cobwebs cleared where reachable' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Basins polished' },
        { text: 'Tapware polished' },
        { text: 'Mirrors cleaned' },
        { text: 'Showers cleaned' },
        { text: 'Shower screens de-spotted' },
        { text: 'Bath cleaned' },
        { text: 'Toilet cleaned and sanitised' },
        { text: 'Toilet base wiped' },
        { text: 'Tiled walls spot-cleaned' },
        { text: 'Floors mopped' },
        { text: 'Towel rails wiped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Benchtops wiped' },
        { text: 'Sink polished' },
        { text: 'Tapware polished' },
        { text: 'Stovetop wiped' },
        { text: 'Splashback wiped' },
        { text: 'Appliance exteriors wiped' },
        { text: 'Cupboard fronts spot-cleaned' },
        { text: 'Rangehood exterior wiped' },
        { text: 'Dining bench wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied and re-lined' },
        { text: 'Mat shaken out' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Dining table wiped' },
        { text: 'Chairs wiped' },
        { text: 'Sideboards dusted' },
        { text: 'Mirrors and glass tops cleaned' },
        { text: 'Light fittings dusted' },
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Window sills wiped' },
        { text: 'Floors vacuumed' },
        { text: 'Hard floors mopped' },
        { text: 'Cobwebs cleared where reachable' },
        { text: 'Bin emptied' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Surfaces dusted' },
        { text: 'Coffee tables wiped' },
        { text: 'Side tables wiped' },
        { text: 'Cushions plumped' },
        { text: 'Throws straightened' },
        { text: 'Mirrors and glass tops cleaned' },
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Carpets vacuumed' },
        { text: 'Hard floors mopped' },
        { text: 'Bins emptied' },
        { text: 'Cobwebs cleared where reachable' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Desk surfaces wiped around items' },
        { text: 'Shelves dusted' },
        { text: 'Monitor stands dusted' },
        { text: 'Cables tidied lightly' },
        { text: 'Mirrors and glass tops wiped' },
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Window sills wiped' },
        { text: 'Floors vacuumed' },
        { text: 'Hard floors mopped' },
        { text: 'Bins emptied' },
        { text: 'Cobwebs cleared where reachable' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Bench wiped' },
        { text: 'Sink polished' },
        { text: 'Tapware polished' },
        { text: 'Washer exterior wiped' },
        { text: 'Dryer exterior wiped' },
        { text: 'Cupboard fronts wiped' },
        { text: 'Visible lint cleared' },
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Mat shaken out' },
        { text: 'Bin emptied' },
      ],
    },
    {
      slug: 'other',
      name: 'Other',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door wiped' },
        { text: 'Entry mat shaken out' },
        { text: 'Hallway floors vacuumed and mopped' },
        { text: 'Hallway skirting boards spot-cleaned' },
        { text: 'Stair treads vacuumed' },
        { text: 'Banister rails wiped' },
        { text: 'Stair landings dusted' },
        { text: 'High-touch points wiped throughout' },
        { text: 'Cobwebs cleared throughout where reachable' },
        { text: 'Mirrors and glass surfaces re-checked' },
        { text: 'Switches and door handles re-checked' },
        { text: 'Final walk-through to straighten and finish' },
      ],
    },
  ],
}
