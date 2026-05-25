// Reply-to address for customer-facing automated emails (quote send,
// invoice send, public quote-form confirmation, quote-accept
// confirmation). Routes replies to Carol so they reach a real inbox
// instead of the noreply sender. Falls back to carol@sano.nz when the
// env var is unset so a missing config can never silently black-hole
// replies.
export function getCustomerReplyToEmail(): string {
  return process.env.SANO_EMAIL_REPLY_TO?.trim() || 'carol@sano.nz'
}
