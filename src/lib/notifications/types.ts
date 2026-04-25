// Phase H — notification types + audiences shared across the
// settings, templates, sender, and logger.
//
// Channels: 'sms' | 'email'.
// Audiences: 'contractor' | 'customer' | 'staff'.
// Types: a closed set per audience (helps the toggle UI render
// without freeform strings).

export type NotificationChannel = 'sms' | 'email'
export type NotificationAudience = 'contractor' | 'customer' | 'staff'

export const CONTRACTOR_NOTIFICATION_TYPES = [
  'job_assigned',
  'job_reminder_day_before',
  'job_updated',
  'job_cancelled',
] as const

export const CUSTOMER_NOTIFICATION_TYPES = [
  'booking_confirmation',
  'job_reminder_day_before',
  'cleaner_on_the_way',
  'job_completed',
  'invoice_sent',
  'payment_reminder',
] as const

export type ContractorNotificationType = (typeof CONTRACTOR_NOTIFICATION_TYPES)[number]
export type CustomerNotificationType   = (typeof CUSTOMER_NOTIFICATION_TYPES)[number]
export type NotificationType = ContractorNotificationType | CustomerNotificationType

export const ALL_NOTIFICATION_TYPES: { type: NotificationType; audience: NotificationAudience; label: string }[] = [
  // Contractor
  { type: 'job_assigned',           audience: 'contractor', label: 'Job assigned' },
  { type: 'job_reminder_day_before', audience: 'contractor', label: 'Job reminder — day before' },
  { type: 'job_updated',            audience: 'contractor', label: 'Job updated' },
  { type: 'job_cancelled',          audience: 'contractor', label: 'Job cancelled' },
  // Customer
  { type: 'booking_confirmation',   audience: 'customer',   label: 'Booking confirmation' },
  { type: 'job_reminder_day_before', audience: 'customer',   label: 'Job reminder — day before' },
  { type: 'cleaner_on_the_way',     audience: 'customer',   label: 'Cleaner on the way' },
  { type: 'job_completed',          audience: 'customer',   label: 'Job completed' },
  { type: 'invoice_sent',           audience: 'customer',   label: 'Invoice sent' },
  { type: 'payment_reminder',       audience: 'customer',   label: 'Payment reminder' },
]

// Placeholder list used by the template editor for help / hints.
export const TEMPLATE_PLACEHOLDERS = [
  '{{client_name}}',
  '{{contractor_name}}',
  '{{job_title}}',
  '{{job_number}}',
  '{{site_address}}',
  '{{scheduled_date}}',
  '{{scheduled_time}}',
  '{{job_link}}',
  '{{business_name}}',
  '{{business_phone}}',
  // Phase H.1 — invoice + scheduling additions
  '{{invoice_number}}',
  '{{invoice_total}}',
  '{{due_date}}',
  '{{invoice_link}}',
  '{{allowed_hours}}',
] as const
