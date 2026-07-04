// Shared vocab for the sales-campaign system.

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'responded',
  'meeting',
  'quoted',
  'won',
  'lost',
  'do_not_contact',
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  responded: 'Responded',
  meeting: 'Meeting booked',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
  do_not_contact: 'Do not contact',
}

export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-sage-100 text-sage-700',
  contacted: 'bg-blue-100 text-blue-700',
  responded: 'bg-amber-100 text-amber-700',
  meeting: 'bg-purple-100 text-purple-700',
  quoted: 'bg-cyan-100 text-cyan-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-gray-200 text-gray-600',
  do_not_contact: 'bg-red-100 text-red-700',
}

export const QUALITY_RANKS = ['A', 'B', 'C'] as const
export type QualityRank = (typeof QUALITY_RANKS)[number]

export const QUALITY_RANK_LABELS: Record<QualityRank, string> = {
  A: 'A — named decision maker + direct line',
  B: 'B — named decision maker, general contact',
  C: 'C — company only',
}

export const QUALITY_RANK_BADGE: Record<QualityRank, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-sage-100 text-sage-600',
}

export const LEAD_INDUSTRIES = [
  'law',
  'accounting',
  'architecture',
  'engineering',
  'recruitment',
  'property',
  'finance',
  'office',
  'other',
] as const

export interface SalesLead {
  id: string
  company: string
  industry: string | null
  website: string | null
  staff_size: string | null
  address: string | null
  contact_name: string | null
  contact_role: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  source: string | null
  quality_rank: QualityRank
  status: LeadStatus
  notes: string | null
  next_follow_up: string | null
  unsubscribed_at: string | null
  created_at: string
}
