// Internal preview of the two review-request messages (recent / previous) as
// email + SMS. Visit /preview/review-emails.

import { reviewDefaultMessage, reviewSmsText, reviewEmailHtml, reviewEmailSubject, type ReviewVariant } from '@/lib/review-request'

const SAMPLE_NAME = 'Marina Rabangaki'
const SAMPLE_URL = 'https://g.page/r/your-google-review-link/review'

function Card({ variant, label, sub }: { variant: ReviewVariant; label: string; sub: string }) {
  const message = reviewDefaultMessage(variant, SAMPLE_NAME)
  const sms = reviewSmsText(message, SAMPLE_URL)
  const html = reviewEmailHtml(message, SAMPLE_URL)
  const subject = reviewEmailSubject(variant)
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-sage-800">{label}</h2>
      <p className="text-sm text-sage-500 mb-4">{sub}</p>
      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">Email</p>
          <div className="rounded-xl border border-sage-200 bg-white overflow-hidden">
            <div className="border-b border-sage-100 px-4 py-2 bg-sage-50/60 text-xs text-sage-600">
              <span className="text-sage-400">Subject:</span> <span className="font-medium text-sage-800">{subject}</span>
            </div>
            <div className="p-5" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">SMS ({sms.length} chars)</p>
          <div className="rounded-2xl bg-[#e7f6e9] border border-emerald-100 p-4 max-w-xs">
            <p className="text-[13px] text-sage-900 leading-relaxed whitespace-pre-wrap">{sms}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ReviewEmailsPreview() {
  return (
    <div className="min-h-screen bg-sage-50/40 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-sage-800 mb-1">Review request — message preview</h1>
        <p className="text-sm text-sage-500 mb-8">Sample data (Marina). The Google link comes from <code>SANO_GOOGLE_REVIEW_URL</code>. Staff can edit the message and choose SMS and/or email each time.</p>
        <Card variant="recent" label="Template A — recent clean" sub="For a recent clean that went well — wording is time-neutral (today or a few weeks ago)." />
        <Card variant="previous" label="Template B — previous client" sub="Gentle re-engagement for a client whose clean was a while ago." />
      </div>
    </div>
  )
}
