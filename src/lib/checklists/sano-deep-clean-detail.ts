// Sano Deep Clean Checklist
//
// DRAFT CONTENT — Phase B preview.
// Item wording supplied verbatim by the user on 2026-05-20 for the
// Deep Clean wording pass. This file MUST NOT be integrated into
// /services/deep-cleaning until the wording is operationally and
// legally reviewed (see report attached to the commit that landed
// this content). `isDraft: true` is the gating signal.
//
// Naming:
// - Data-file `name` (canonical brand string): "Sano Deep Clean Detail
//   Checklist" — kept for stable internal identifier alongside the
//   `sano-deep-clean-detail` slug.
// - Customer-facing display heading (set via the `displayHeading` prop
//   on ServiceChecklist when the component is integrated into the
//   deep-cleaning service page): "Sano Deep Clean Checklist".
// - Highlight phrase when rendered: "Deep Clean".
//
// Structure (Phase B Deep Clean wording pass, 2026-05-20):
//   Bedrooms 15 · Bathrooms 17 · Kitchen 21 · Dining Room 12 ·
//   Living Areas 16 · Office / Study 12 · Laundry 12 · Other 8
//   = 113 items total. NOT rendered as "113-Point" — Deep Clean is
//   condition-based; the caveat (rendered as the final note after
//   the CTA) carries the scope qualification.
//
// Originality boundary: this file MUST NOT derive items, room names,
// ordering, or wording from the Enhanced Cleaning reference documents
// at F:\Sano\20-Content\Sano Cleaning Checklist\. Sano-original
// content only.

import type { Checklist } from '@/types/checklist'

export const SANO_DEEP_CLEAN_DETAIL: Checklist = {
  slug: 'sano-deep-clean-detail',
  name: 'Sano Deep Clean Detail Checklist',
  shortName: 'Deep Clean Detail',
  caveatTitle: 'A quick note on deep cleans',
  caveat:
    'Deep cleaning is condition-based. Inclusions depend on property size, condition, access, selected scope and agreed time allowance. Your quote confirms what will be covered in your booked clean.',
  isDraft: true,
  rooms: [
    {
      slug: 'bedrooms',
      name: 'Bedrooms',
      icon: 'BedDouble',
      items: [
        { text: 'Furniture detailed' },
        { text: 'Bedside tables cleaned' },
        { text: 'Lamps dusted' },
        { text: 'Window sills cleaned' },
        { text: 'Skirting boards detailed' },
        { text: 'Door frames wiped' },
        { text: 'Doors spot cleaned' },
        { text: 'Touch points wiped' },
        { text: 'Mirrors cleaned' },
        { text: 'Wall hangings dusted' },
        { text: 'Cobwebs removed' },
        { text: 'Ceiling fans dusted' },
        { text: 'Under beds vacuumed' },
        { text: 'Wardrobe fronts wiped' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      icon: 'Bath',
      items: [
        { text: 'Mirrors cleaned' },
        { text: 'Vanity cleaned' },
        { text: 'Basin polished' },
        { text: 'Tapware polished' },
        { text: 'Toilet detailed' },
        { text: 'Shower glass cleaned' },
        { text: 'Shower tiles cleaned' },
        { text: 'Shower tracks cleaned' },
        { text: 'Soap scum reduced' },
        { text: 'Grout lines cleaned' },
        { text: 'Bath cleaned' },
        { text: 'Cupboard faces wiped' },
        { text: 'Towel rails wiped' },
        { text: 'Exhaust cover wiped' },
        { text: 'Touch points wiped' },
        { text: 'Skirting boards detailed' },
        { text: 'Floors mopped' },
      ],
    },
    {
      slug: 'kitchen',
      name: 'Kitchen',
      icon: 'ChefHat',
      items: [
        { text: 'Benchtops cleaned' },
        { text: 'Cupboard faces wiped' },
        { text: 'Drawer faces wiped' },
        { text: 'Splashback cleaned' },
        { text: 'Cooktop polished' },
        { text: 'Rangehood exterior cleaned' },
        { text: 'Rangehood filters cleaned' },
        { text: 'Oven exterior cleaned' },
        { text: 'Microwave cleaned' },
        { text: 'Fridge exterior cleaned' },
        { text: 'Dishwasher exterior wiped' },
        { text: 'Sink polished' },
        { text: 'Tapware polished' },
        { text: 'Appliances wiped' },
        { text: 'Light fittings dusted' },
        { text: 'Skirting boards cleaned' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Cobwebs removed' },
        { text: 'Grease build-up reduced' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'dining-room',
      name: 'Dining Room',
      icon: 'UtensilsCrossed',
      items: [
        { text: 'Dining table cleaned' },
        { text: 'Furniture detailed' },
        { text: 'Chair frames wiped' },
        { text: 'Wall hangings dusted' },
        { text: 'Light fittings dusted' },
        { text: 'Window sills cleaned' },
        { text: 'Skirting boards detailed' },
        { text: 'Touch points wiped' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Cobwebs removed' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'living-areas',
      name: 'Living Areas',
      icon: 'Sofa',
      items: [
        { text: 'General tidy' },
        { text: 'Furniture detailed' },
        { text: 'Coffee tables cleaned' },
        { text: 'Entertainment units dusted' },
        { text: 'Wall hangings dusted' },
        { text: 'Mirrors cleaned' },
        { text: 'Window sills cleaned' },
        { text: 'Skirting boards detailed' },
        { text: 'Touch points wiped' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Ceiling fans dusted' },
        { text: 'Couches vacuumed' },
        { text: 'Under furniture vacuumed' },
        { text: 'Cobwebs removed' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'office-study',
      name: 'Office / Study',
      icon: 'Briefcase',
      items: [
        { text: 'Desks cleaned' },
        { text: 'Furniture detailed' },
        { text: 'Shelves dusted' },
        { text: 'Wall hangings dusted' },
        { text: 'Window sills cleaned' },
        { text: 'Skirting boards detailed' },
        { text: 'Touch points wiped' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Cobwebs removed' },
        { text: 'Ceiling fans dusted' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      icon: 'WashingMachine',
      items: [
        { text: 'Bench cleaned' },
        { text: 'Sink polished' },
        { text: 'Cupboard faces wiped' },
        { text: 'Appliances wiped' },
        { text: 'Splashback cleaned' },
        { text: 'Tapware polished' },
        { text: 'Skirting boards detailed' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Touch points wiped' },
        { text: 'Cobwebs removed' },
        { text: 'Floors vacuumed/mopped' },
      ],
    },
    {
      slug: 'other',
      name: 'Other',
      icon: 'Sparkles',
      items: [
        { text: 'Light dusting completed' },
        { text: 'Cobwebs removed' },
        { text: 'Touch points wiped' },
        { text: 'Skirting boards detailed' },
        { text: 'Doors spot cleaned' },
        { text: 'Door frames wiped' },
        { text: 'Floors vacuumed/mopped' },
        { text: 'Final check completed' },
      ],
    },
  ],
}
