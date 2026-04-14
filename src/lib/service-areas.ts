export type ServiceArea = {
  region: string
  suburb: string
  postcodes: string[]
  slug: string
  active: boolean
}

export const REGIONS = [
  'Central Auckland',
  'North Shore',
  'East Auckland',
  'South Auckland',
  'West Auckland',
] as const

export type Region = (typeof REGIONS)[number]

// ─── Coverage boundaries ──────────────────────────────────────────────────────
export const COVERAGE_BOUNDS = {
  north: 'Redvale',
  south: 'Papakura',
  east: 'Whitford',
  west: 'Kumeu',
}

// ─── Service area data ────────────────────────────────────────────────────────
// To add a suburb: add an entry below, set active: true.
// To remove: set active: false (keeps slug intact for any existing links).
// To enable suburb landing pages later:
//   1. Create src/app/service-area/[slug]/page.tsx
//   2. In page.tsx, swap <SuburbTag> from <span> to <Link href={`/service-area/${slug}`}>
// ─────────────────────────────────────────────────────────────────────────────
export const SERVICE_AREAS: ServiceArea[] = [
  // Central Auckland
  { region: 'Central Auckland', suburb: 'Auckland CBD',    postcodes: ['1010', '1011'], slug: 'auckland-cbd',    active: true },
  { region: 'Central Auckland', suburb: 'Balmoral',        postcodes: ['1024'],         slug: 'balmoral',        active: true },
  { region: 'Central Auckland', suburb: 'Eden Terrace',    postcodes: ['1010'],         slug: 'eden-terrace',    active: true },
  { region: 'Central Auckland', suburb: 'Epsom',           postcodes: ['1023'],         slug: 'epsom',           active: true },
  { region: 'Central Auckland', suburb: 'Freemans Bay',    postcodes: ['1011'],         slug: 'freemans-bay',    active: true },
  { region: 'Central Auckland', suburb: 'Grafton',         postcodes: ['1023'],         slug: 'grafton',         active: true },
  { region: 'Central Auckland', suburb: 'Grey Lynn',       postcodes: ['1021'],         slug: 'grey-lynn',       active: true },
  { region: 'Central Auckland', suburb: 'Kingsland',       postcodes: ['1021'],         slug: 'kingsland',       active: true },
  { region: 'Central Auckland', suburb: 'Mount Eden',      postcodes: ['1024'],         slug: 'mount-eden',      active: true },
  { region: 'Central Auckland', suburb: 'Newmarket',       postcodes: ['1023'],         slug: 'newmarket',       active: true },
  { region: 'Central Auckland', suburb: 'Parnell',         postcodes: ['1052'],         slug: 'parnell',         active: true },
  { region: 'Central Auckland', suburb: 'Ponsonby',        postcodes: ['1011'],         slug: 'ponsonby',        active: true },
  { region: 'Central Auckland', suburb: 'Sandringham',     postcodes: ['1025'],         slug: 'sandringham',     active: true },

  // North Shore
  { region: 'North Shore',      suburb: 'Albany',          postcodes: ['0632'],         slug: 'albany',          active: true },
  { region: 'North Shore',      suburb: 'Beach Haven',     postcodes: ['0626'],         slug: 'beach-haven',     active: true },
  { region: 'North Shore',      suburb: 'Belmont',         postcodes: ['0622'],         slug: 'belmont',         active: true },
  { region: 'North Shore',      suburb: 'Birkenhead',      postcodes: ['0626'],         slug: 'birkenhead',      active: true },
  { region: 'North Shore',      suburb: 'Birkdale',        postcodes: ['0626'],         slug: 'birkdale',        active: true },
  { region: 'North Shore',      suburb: 'Browns Bay',      postcodes: ['0630'],         slug: 'browns-bay',      active: true },
  { region: 'North Shore',      suburb: 'Devonport',       postcodes: ['0624'],         slug: 'devonport',       active: true },
  { region: 'North Shore',      suburb: 'Glenfield',       postcodes: ['0629'],         slug: 'glenfield',       active: true },
  { region: 'North Shore',      suburb: 'Hillcrest',       postcodes: ['0627'],         slug: 'hillcrest',       active: true },
  { region: 'North Shore',      suburb: 'Long Bay',        postcodes: ['0630'],         slug: 'long-bay',        active: true },
  { region: 'North Shore',      suburb: 'Mairangi Bay',    postcodes: ['0630'],         slug: 'mairangi-bay',    active: true },
  { region: 'North Shore',      suburb: 'Milford',         postcodes: ['0620'],         slug: 'milford',         active: true },
  { region: 'North Shore',      suburb: 'Northcote',       postcodes: ['0627'],         slug: 'northcote',       active: true },
  { region: 'North Shore',      suburb: 'Okura',           postcodes: ['0792'],         slug: 'okura',           active: true },
  { region: 'North Shore',      suburb: 'Redvale',         postcodes: ['0794'],         slug: 'redvale',         active: true },
  { region: 'North Shore',      suburb: 'Rosedale',        postcodes: ['0632'],         slug: 'rosedale',        active: true },
  { region: 'North Shore',      suburb: 'Takapuna',        postcodes: ['0622'],         slug: 'takapuna',        active: true },
  { region: 'North Shore',      suburb: 'Torbay',          postcodes: ['0630'],         slug: 'torbay',          active: true },

  // East Auckland
  { region: 'East Auckland',    suburb: 'Botany Downs',    postcodes: ['2010'],         slug: 'botany-downs',    active: true },
  { region: 'East Auckland',    suburb: 'Bucklands Beach', postcodes: ['2012'],         slug: 'bucklands-beach', active: true },
  { region: 'East Auckland',    suburb: 'East Tamaki',     postcodes: ['2013'],         slug: 'east-tamaki',     active: true },
  { region: 'East Auckland',    suburb: 'Farm Cove',       postcodes: ['2012'],         slug: 'farm-cove',       active: true },
  { region: 'East Auckland',    suburb: 'Flat Bush',       postcodes: ['2019'],         slug: 'flat-bush',       active: true },
  { region: 'East Auckland',    suburb: 'Glendowie',       postcodes: ['1071'],         slug: 'glendowie',       active: true },
  { region: 'East Auckland',    suburb: 'Half Moon Bay',   postcodes: ['2012'],         slug: 'half-moon-bay',   active: true },
  { region: 'East Auckland',    suburb: 'Howick',          postcodes: ['2014'],         slug: 'howick',          active: true },
  { region: 'East Auckland',    suburb: 'Kohimarama',      postcodes: ['1071'],         slug: 'kohimarama',      active: true },
  { region: 'East Auckland',    suburb: 'Meadowbank',      postcodes: ['1072'],         slug: 'meadowbank',      active: true },
  { region: 'East Auckland',    suburb: 'Mission Bay',     postcodes: ['1071'],         slug: 'mission-bay',     active: true },
  { region: 'East Auckland',    suburb: 'Orakei',          postcodes: ['1071'],         slug: 'orakei',          active: true },
  { region: 'East Auckland',    suburb: 'Pakuranga',       postcodes: ['2010'],         slug: 'pakuranga',       active: true },
  { region: 'East Auckland',    suburb: 'Panmure',         postcodes: ['1072'],         slug: 'panmure',         active: true },
  { region: 'East Auckland',    suburb: 'Remuera',         postcodes: ['1050'],         slug: 'remuera',         active: true },
  { region: 'East Auckland',    suburb: 'Saint Johns',     postcodes: ['1072'],         slug: 'saint-johns',     active: true },
  { region: 'East Auckland',    suburb: 'Whitford',        postcodes: ['2571'],         slug: 'whitford',        active: true },

  // South Auckland
  { region: 'South Auckland',   suburb: 'Ellerslie',       postcodes: ['1051'],         slug: 'ellerslie',       active: true },
  { region: 'South Auckland',   suburb: 'Greenlane',       postcodes: ['1051'],         slug: 'greenlane',       active: true },
  { region: 'South Auckland',   suburb: 'Mangere',         postcodes: ['2022'],         slug: 'mangere',         active: true },
  { region: 'South Auckland',   suburb: 'Mangere Bridge',  postcodes: ['2022'],         slug: 'mangere-bridge',  active: true },
  { region: 'South Auckland',   suburb: 'Manukau',         postcodes: ['2104'],         slug: 'manukau',         active: true },
  { region: 'South Auckland',   suburb: 'Mount Wellington',postcodes: ['1060'],         slug: 'mount-wellington',active: true },
  { region: 'South Auckland',   suburb: 'One Tree Hill',   postcodes: ['1061'],         slug: 'one-tree-hill',   active: true },
  { region: 'South Auckland',   suburb: 'Onehunga',        postcodes: ['1061'],         slug: 'onehunga',        active: true },
  { region: 'South Auckland',   suburb: 'Otahuhu',         postcodes: ['1062'],         slug: 'otahuhu',         active: true },
  { region: 'South Auckland',   suburb: 'Papakura',        postcodes: ['2110', '2113'], slug: 'papakura',        active: true },
  { region: 'South Auckland',   suburb: 'Papatoetoe',      postcodes: ['2025'],         slug: 'papatoetoe',      active: true },
  { region: 'South Auckland',   suburb: 'Penrose',         postcodes: ['1061'],         slug: 'penrose',         active: true },
  { region: 'South Auckland',   suburb: 'Royal Oak',       postcodes: ['1023'],         slug: 'royal-oak',       active: true },
  { region: 'South Auckland',   suburb: 'Takanini',        postcodes: ['2112'],         slug: 'takanini',        active: true },
  { region: 'South Auckland',   suburb: 'The Gardens',     postcodes: ['2105'],         slug: 'the-gardens',     active: true },
  { region: 'South Auckland',   suburb: 'Wiri',            postcodes: ['2104'],         slug: 'wiri',            active: true },

  // West Auckland
  { region: 'West Auckland',    suburb: 'Avondale',        postcodes: ['1026'],         slug: 'avondale',        active: true },
  { region: 'West Auckland',    suburb: 'Blockhouse Bay',  postcodes: ['0600'],         slug: 'blockhouse-bay',  active: true },
  { region: 'West Auckland',    suburb: 'Glen Eden',       postcodes: ['0602'],         slug: 'glen-eden',       active: true },
  { region: 'West Auckland',    suburb: 'Green Bay',       postcodes: ['0604'],         slug: 'green-bay',       active: true },
  { region: 'West Auckland',    suburb: 'Henderson',       postcodes: ['0610'],         slug: 'henderson',       active: true },
  { region: 'West Auckland',    suburb: 'Hobsonville',     postcodes: ['0618'],         slug: 'hobsonville',     active: true },
  { region: 'West Auckland',    suburb: 'Kumeu',           postcodes: ['0810'],         slug: 'kumeu',           active: true },
  { region: 'West Auckland',    suburb: 'Massey',          postcodes: ['0614'],         slug: 'massey',          active: true },
  { region: 'West Auckland',    suburb: 'Mount Albert',    postcodes: ['1025'],         slug: 'mount-albert',    active: true },
  { region: 'West Auckland',    suburb: 'New Lynn',        postcodes: ['0600'],         slug: 'new-lynn',        active: true },
  { region: 'West Auckland',    suburb: 'Point Chevalier', postcodes: ['1022'],         slug: 'point-chevalier', active: true },
  { region: 'West Auckland',    suburb: 'Te Atatu Peninsula', postcodes: ['0610'],      slug: 'te-atatu-peninsula', active: true },
  { region: 'West Auckland',    suburb: 'Te Atatu South',  postcodes: ['0610'],         slug: 'te-atatu-south',  active: true },
  { region: 'West Auckland',    suburb: 'Titirangi',       postcodes: ['0604'],         slug: 'titirangi',       active: true },
  { region: 'West Auckland',    suburb: 'Westgate',        postcodes: ['0814'],         slug: 'westgate',        active: true },
  { region: 'West Auckland',    suburb: 'Whenuapai',       postcodes: ['0618'],         slug: 'whenuapai',       active: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All active suburbs in a region, sorted alphabetically. */
export function getAreasByRegion(region: string): ServiceArea[] {
  return SERVICE_AREAS
    .filter((a) => a.region === region && a.active)
    .sort((a, b) => a.suburb.localeCompare(b.suburb))
}

/** Case-insensitive, trimmed search across suburb names and postcodes. */
export function searchAreas(query: string): ServiceArea[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return SERVICE_AREAS.filter((area) => {
    if (!area.active) return false
    if (area.suburb.toLowerCase().includes(q)) return true
    if (area.postcodes.some((p) => p.startsWith(q) || p === q)) return true
    return false
  })
}
