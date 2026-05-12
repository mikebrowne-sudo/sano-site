// Phase 4C — list-config barrel. New configs export from here so
// pages have a single import path.

export type { ListPageConfig, ListPageActionConfig, ListPageTabConfig } from './types'
export { JOBS_LIST_CONFIG, JOB_TABS, type JobTab } from './jobs.config'
export { QUOTES_LIST_CONFIG, QUOTE_TABS, type QuoteTab } from './quotes.config'
export { INVOICES_LIST_CONFIG, INVOICE_TABS, type InvoiceTab } from './invoices.config'
