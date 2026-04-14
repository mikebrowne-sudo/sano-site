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

// ─── Edit this list to add or remove serviced suburbs ───────────────────────
// To add a suburb page later:
//   1. Create src/app/service-area/[slug]/page.tsx
//   2. In SuburbTag inside page.tsx, change <span> to <Link href={...}>
//      (the slug field is already wired up and ready)
// ────────────────────────────────────────────────────────────────────────────
export const SERVICE_AREAS: ServiceArea[] = [
  // Central Auckland
  { region: 'Central Auckland', suburb: 'Auckland CBD',   postcodes: ['1010'],        slug: 'auckland-cbd',    active: true },
  { region: 'Central Auckland', suburb: 'Ponsonby',       postcodes: ['1011'],        slug: 'ponsonby',        active: true },
  { region: 'Central Auckland', suburb: 'Herne Bay',      postcodes: ['1011'],        slug: 'herne-bay',       active: true },
  { region: 'Central Auckland', suburb: 'St Marys Bay',   postcodes: ['1011'],        slug: 'st-marys-bay',    active: true },
  { region: 'Central Auckland', suburb: 'Freemans Bay',   postcodes: ['1011'],        slug: 'freemans-bay',    active: true },
  { region: 'Central Auckland', suburb: 'Grey Lynn',      postcodes: ['1021'],        slug: 'grey-lynn',       active: true },
  { region: 'Central Auckland', suburb: 'Kingsland',      postcodes: ['1021'],        slug: 'kingsland',       active: true },
  { region: 'Central Auckland', suburb: 'Parnell',        postcodes: ['1052'],        slug: 'parnell',         active: true },
  { region: 'Central Auckland', suburb: 'Newmarket',      postcodes: ['1023'],        slug: 'newmarket',       active: true },
  { region: 'Central Auckland', suburb: 'Grafton',        postcodes: ['1010'],        slug: 'grafton',         active: true },
  { region: 'Central Auckland', suburb: 'Mount Eden',     postcodes: ['1024'],        slug: 'mount-eden',      active: true },
  { region: 'Central Auckland', suburb: 'Sandringham',    postcodes: ['1025'],        slug: 'sandringham',     active: true },
  { region: 'Central Auckland', suburb: 'Epsom',          postcodes: ['1023'],        slug: 'epsom',           active: true },
  { region: 'Central Auckland', suburb: 'Remuera',        postcodes: ['1050'],        slug: 'remuera',         active: true },
  { region: 'Central Auckland', suburb: 'Royal Oak',      postcodes: ['1061'],        slug: 'royal-oak',       active: true },
  { region: 'Central Auckland', suburb: 'Three Kings',    postcodes: ['1042'],        slug: 'three-kings',     active: true },

  // North Shore
  { region: 'North Shore',      suburb: 'Takapuna',       postcodes: ['0622'],        slug: 'takapuna',        active: true },
  { region: 'North Shore',      suburb: 'Devonport',      postcodes: ['0624'],        slug: 'devonport',       active: true },
  { region: 'North Shore',      suburb: 'Milford',        postcodes: ['0620'],        slug: 'milford',         active: true },
  { region: 'North Shore',      suburb: 'Birkenhead',     postcodes: ['0626'],        slug: 'birkenhead',      active: true },
  { region: 'North Shore',      suburb: 'Northcote',      postcodes: ['0627'],        slug: 'northcote',       active: true },
  { region: 'North Shore',      suburb: 'Glenfield',      postcodes: ['0629'],        slug: 'glenfield',       active: true },
  { region: 'North Shore',      suburb: 'Hillcrest',      postcodes: ['0627'],        slug: 'hillcrest',       active: true },
  { region: 'North Shore',      suburb: 'Forrest Hill',   postcodes: ['0620'],        slug: 'forrest-hill',    active: true },
  { region: 'North Shore',      suburb: 'Beach Haven',    postcodes: ['0626'],        slug: 'beach-haven',     active: true },
  { region: 'North Shore',      suburb: 'Birkdale',       postcodes: ['0626'],        slug: 'birkdale',        active: true },
  { region: 'North Shore',      suburb: 'Browns Bay',     postcodes: ['0630'],        slug: 'browns-bay',      active: true },
  { region: 'North Shore',      suburb: 'Albany',         postcodes: ['0632'],        slug: 'albany',          active: true },
  { region: 'North Shore',      suburb: 'Mairangi Bay',   postcodes: ['0630'],        slug: 'mairangi-bay',    active: true },

  // East Auckland
  { region: 'East Auckland',    suburb: 'Howick',         postcodes: ['2014'],        slug: 'howick',          active: true },
  { region: 'East Auckland',    suburb: 'Pakuranga',      postcodes: ['2010'],        slug: 'pakuranga',       active: true },
  { region: 'East Auckland',    suburb: 'Botany Downs',   postcodes: ['2013'],        slug: 'botany-downs',    active: true },
  { region: 'East Auckland',    suburb: 'Flat Bush',      postcodes: ['2016'],        slug: 'flat-bush',       active: true },
  { region: 'East Auckland',    suburb: 'Dannemora',      postcodes: ['2016'],        slug: 'dannemora',       active: true },
  { region: 'East Auckland',    suburb: 'Meadowlands',    postcodes: ['2014'],        slug: 'meadowlands',     active: true },
  { region: 'East Auckland',    suburb: 'Highland Park',  postcodes: ['2010'],        slug: 'highland-park',   active: true },
  { region: 'East Auckland',    suburb: 'Bucklands Beach',postcodes: ['2012'],        slug: 'bucklands-beach', active: true },
  { region: 'East Auckland',    suburb: 'Half Moon Bay',  postcodes: ['2012'],        slug: 'half-moon-bay',   active: true },
  { region: 'East Auckland',    suburb: 'Cockle Bay',     postcodes: ['2014'],        slug: 'cockle-bay',      active: true },

  // South Auckland
  { region: 'South Auckland',   suburb: 'Onehunga',       postcodes: ['1061'],        slug: 'onehunga',        active: true },
  { region: 'South Auckland',   suburb: 'Otahuhu',        postcodes: ['1062'],        slug: 'otahuhu',         active: true },
  { region: 'South Auckland',   suburb: 'Mangere',        postcodes: ['2022'],        slug: 'mangere',         active: true },
  { region: 'South Auckland',   suburb: 'Papatoetoe',     postcodes: ['2025'],        slug: 'papatoetoe',      active: true },
  { region: 'South Auckland',   suburb: 'Manukau',        postcodes: ['2104'],        slug: 'manukau',         active: true },
  { region: 'South Auckland',   suburb: 'Manurewa',       postcodes: ['2102'],        slug: 'manurewa',        active: true },
  { region: 'South Auckland',   suburb: 'Papakura',       postcodes: ['2110'],        slug: 'papakura',        active: true },
  { region: 'South Auckland',   suburb: 'Takanini',       postcodes: ['2112'],        slug: 'takanini',        active: true },

  // West Auckland
  { region: 'West Auckland',    suburb: 'Avondale',       postcodes: ['1026'],        slug: 'avondale',        active: true },
  { region: 'West Auckland',    suburb: 'New Lynn',       postcodes: ['0600'],        slug: 'new-lynn',        active: true },
  { region: 'West Auckland',    suburb: 'Henderson',      postcodes: ['0612'],        slug: 'henderson',       active: true },
  { region: 'West Auckland',    suburb: 'Glen Eden',      postcodes: ['0602'],        slug: 'glen-eden',       active: true },
  { region: 'West Auckland',    suburb: 'Kelston',        postcodes: ['0602'],        slug: 'kelston',         active: true },
  { region: 'West Auckland',    suburb: 'Te Atatu',       postcodes: ['0610'],        slug: 'te-atatu',        active: true },
  { region: 'West Auckland',    suburb: 'Massey',         postcodes: ['0614'],        slug: 'massey',          active: true },
  { region: 'West Auckland',    suburb: 'Westgate',       postcodes: ['0614'],        slug: 'westgate',        active: true },
  { region: 'West Auckland',    suburb: 'Titirangi',      postcodes: ['0604'],        slug: 'titirangi',       active: true },
]

export function getAreasByRegion(region: string): ServiceArea[] {
  return SERVICE_AREAS.filter((a) => a.region === region && a.active)
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
