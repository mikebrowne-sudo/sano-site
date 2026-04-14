export interface Service {
  slug: string
  name: string
  shortDescription: string
  description: string
  heroImage: string
  cardImage: string
  includes: string[]
  metaDescription: string
  relatedSlugs: string[]
}

export interface FaqCategory {
  category: string
  items: FaqItem[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface QuoteFormData {
  name: string
  email: string
  phone: string
  service: string
  postcode: string
  preferredDate: string
  message: string
}

export interface QuoteFormErrors {
  name?: string
  email?: string
  service?: string
  postcode?: string
}
