// Sano 100-Point Home Clean Checklist
//
// DRAFT CONTENT — Phase B scaffold only.
// Authored from scratch for Phase B visual review. Final item text, item
// ordering, and item counts MUST come from Sano's own source DOCX
// ("Sano Home Clean Checklist") before this file is integrated into
// /services/regular-cleaning.
//
// Originality boundary: this file MUST NOT derive items, room names,
// ordering, or wording from the Enhanced Cleaning reference documents
// at F:\Sano\20-Content\Sano Cleaning Checklist\. Source content only
// from Sano's own DOCX.
//
// Category structure: 8 categories with the approved item-count
// distribution to total exactly 100 items:
//   Bedrooms 15 · Bathrooms 17 · Kitchen 20 · Dining Room 10 ·
//   Living Areas 16 · Office / Study 8 · Laundry 11 · Other 3
// The "Other" category absorbs entry/final-touches content; may be
// renamed in a later Sano content pass.

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
        { text: 'Drawer fronts wiped' },
        { text: 'Wardrobe doors spot-wiped' },
        { text: 'Mirrors cleaned' },
        { text: 'Switches wiped' },
        { text: 'Door handles wiped' },
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
        { text: 'Shower rails wiped' },
        { text: 'Bath cleaned' },
        { text: 'Bath surrounds wiped' },
        { text: 'Toilet cleaned and sanitised' },
        { text: 'Toilet base wiped' },
        { text: 'Tiled walls spot-cleaned' },
        { text: 'Vanity tops wiped' },
        { text: 'Cabinet fronts spot-wiped' },
        { text: 'Towel rails wiped' },
        { text: 'Soap and product holders wiped' },
        { text: 'Floors mopped' },
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
        { text: 'Stovetop knobs wiped' },
        { text: 'Splashback wiped' },
        { text: 'Oven exterior wiped' },
        { text: 'Microwave exterior wiped' },
        { text: 'Fridge exterior wiped' },
        { text: 'Dishwasher exterior wiped' },
        { text: 'Rangehood exterior wiped' },
        { text: 'Cupboard fronts spot-cleaned' },
        { text: 'Drawer fronts spot-cleaned' },
        { text: 'Handles wiped' },
        { text: 'Small appliances wiped' },
        { text: 'Dining bench wiped' },
        { text: 'Floors vacuumed' },
        { text: 'Floors mopped' },
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
        { text: 'Shelves dusted' },
        { text: 'TV unit dusted' },
        { text: 'Cushions plumped' },
        { text: 'Throws straightened' },
        { text: 'Mirrors cleaned' },
        { text: 'Glass tops wiped' },
        { text: 'Lamp bases dusted' },
        { text: 'Switches wiped' },
        { text: 'Door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Carpets vacuumed' },
        { text: 'Hard floors mopped' },
        { text: 'Bins emptied' },
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
        { text: 'Switches and door handles wiped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Window sills wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied' },
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
        { text: 'Bin emptied' },
      ],
    },
    {
      slug: 'other',
      name: 'Other',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door wiped' },
        { text: 'High-touch points re-checked throughout' },
        { text: 'Final walk-through to straighten and finish' },
      ],
    },
  ],
}
