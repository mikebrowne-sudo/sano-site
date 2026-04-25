-- ════════════════════════════════════════════════════════════════════
--  Phase H.1 — SMS workflow triggers, foundation seed.
--
--  Pure data seed. No schema changes. Builds on the Phase H tables
--  (notification_settings / notification_templates / notification_logs).
--
--  Seeds default message bodies for the five new automated SMS types
--  the Phase H.2 → H.4 triggers will look up:
--
--    customer.invoice_sent             — fired from sendInvoiceEmail
--    customer.cleaner_on_the_way       — fired from contractor "On my way"
--    customer.job_reminder_day_before  — fired from daily cron
--    contractor.job_reminder_day_before — fired from daily cron
--    customer.payment_reminder         — fired from daily cron (overdue)
--
--  All bodies:
--    • prefixed "Sano:" per portal SMS convention
--    • GSM-7 safe (no em dash, no smart quotes, no curly chars)
--    • sized to fit a single 160-char SMS segment with realistic
--      placeholder values; operator can edit per-template via
--      /portal/settings/notifications. The editor's char-counter
--      will surface 160-char overruns.
--
--  notification_settings is NOT touched here. The defaults map in
--  src/lib/notifications/settings.ts already has the five new type
--  toggles set to true, and mergeTypes() falls back to defaults for
--  any missing key — so the templates resolve as enabled the moment
--  they exist.
--
--  Idempotent: ON CONFLICT (type, channel, audience) DO NOTHING.
--  Re-running this seed on a partially-applied DB is safe and will
--  not overwrite operator edits to existing rows.
--
--  Rollback (manual, if ever required):
--    delete from public.notification_templates
--     where (type, channel, audience) in (
--        ('invoice_sent',             'sms', 'customer'),
--        ('cleaner_on_the_way',       'sms', 'customer'),
--        ('job_reminder_day_before',  'sms', 'customer'),
--        ('job_reminder_day_before',  'sms', 'contractor'),
--        ('payment_reminder',         'sms', 'customer')
--     );
-- ════════════════════════════════════════════════════════════════════

insert into public.notification_templates (type, channel, audience, body, enabled)
values
  (
    'invoice_sent', 'sms', 'customer',
    'Sano: Invoice {{invoice_number}} ${{invoice_total}} due {{due_date}}. View: {{invoice_link}}',
    true
  ),
  (
    'cleaner_on_the_way', 'sms', 'customer',
    'Sano: Your cleaner is on the way to {{site_address}}, arriving around {{scheduled_time}}.',
    true
  ),
  (
    'job_reminder_day_before', 'sms', 'customer',
    'Sano: Reminder - your clean is tomorrow {{scheduled_date}} at {{scheduled_time}}, {{site_address}}. Reply to reschedule.',
    true
  ),
  (
    'job_reminder_day_before', 'sms', 'contractor',
    'Sano: Tomorrow {{scheduled_time}} - {{job_title}} at {{site_address}} ({{allowed_hours}}h).',
    true
  ),
  (
    'payment_reminder', 'sms', 'customer',
    'Sano: Friendly reminder - invoice {{invoice_number}} (${{invoice_total}}) was due {{due_date}}. View: {{invoice_link}}',
    true
  )
on conflict (type, channel, audience) do nothing;
