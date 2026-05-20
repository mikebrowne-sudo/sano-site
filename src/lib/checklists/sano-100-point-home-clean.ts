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
        { text: 'Benchtops wiped' },
        { text: 'Sink and tapware polished' },
        { text: 'Stovetop wiped' },
        { text: 'Splashback wiped' },
        { text: 'Appliance exteriors wiped' },
        { text: 'Cupboard fronts spot-cleaned' },
        { text: 'Rangehood exterior wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied and re-lined' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Basins and tapware polished' },
        { text: 'Mirrors cleaned' },
        { text: 'Showers and screens cleaned' },
        { text: 'Bath cleaned' },
        { text: 'Toilet cleaned and sanitised' },
        { text: 'Tiled walls spot-cleaned' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Beds made' },
        { text: 'Surfaces dusted' },
        { text: 'Mirrors cleaned' },
        { text: 'Floors vacuumed' },
        { text: 'Cobwebs cleared where reachable' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'Surfaces dusted' },
        { text: 'Cushions plumped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Mirrors and glass tops wiped' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Dining table wiped' },
        { text: 'Chairs wiped' },
        { text: 'Surfaces dusted' },
        { text: 'Light fittings dusted' },
        { text: 'Floors vacuumed and mopped' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Desk surfaces wiped' },
        { text: 'Shelves dusted' },
        { text: 'Floors vacuumed and mopped' },
        { text: 'Bins emptied' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Bench and sink cleaned' },
        { text: 'Tapware polished' },
        { text: 'Washer and dryer exteriors wiped' },
        { text: 'Floors vacuumed and mopped' },
      ],
    },
    {
      slug: 'hallways-stairs',
      name: 'Hallways & Stairs',
      icon: 'DoorOpen',
      items: [
        { text: 'Floors vacuumed and mopped' },
        { text: 'Skirting boards spot-cleaned' },
        { text: 'Banisters wiped' },
        { text: 'Switches and door handles wiped' },
        { text: 'Cobwebs cleared where reachable' },
      ],
    },
    {
      slug: 'entry-final-touches',
      name: 'Entry & Final Touches',
      icon: 'Sparkles',
      items: [
        { text: 'Entry door wiped' },
        { text: 'Mat shaken out' },
        { text: 'High-touch points wiped' },
        { text: 'Final walk-through' },
      ],
    },
  ],
}
