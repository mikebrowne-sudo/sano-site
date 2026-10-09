'use client'

// "Questions or changes?" under the Accept panel — so accepting isn't the
// only option. Call, or send a message to the team (emailed + logged).
// Tailwind-styled (not the document CSS) so it renders the same on the
// residential quote and the commercial proposal share pages.

import { useState, useTransition } from 'react'
import { MessageSquare, Phone } from 'lucide-react'
import { requestQuoteChanges } from '../_actions'

const btn =
  'inline-flex items-center gap-2 rounded-full border border-sage-100 bg-[#faf9f6] px-4 py-2.5 text-sm font-semibold text-sage-800 transition-colors hover:border-sage-500'

export function QuoteQuestions({ shareToken, defaultEmail }: { shareToken: string; defaultEmail?: string | null }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await requestQuoteChanges(shareToken, message, email)
      if ('error' in res && res.error) setError(res.error)
      else setSent(true)
    })
  }

  return (
    <div className="mx-auto mt-5 max-w-[560px] rounded-[18px] border border-sage-100 bg-white px-6 py-5 text-center print:hidden">
      <p className="font-display text-[17px] font-bold text-sage-800">Questions, or need something changed?</p>
      {sent ? (
        <p className="mt-1 text-sm text-sage-600">Thanks, your message is with our team. We&apos;ll be in touch shortly.</p>
      ) : (
        <>
          <p className="mt-1 mb-4 text-sm text-sage-600">We&apos;re happy to talk it through or adjust the quote.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <a href="tel:0800726686" className={btn}>
              <Phone size={15} /> Call 0800 726 686
            </a>
            {!open && (
              <button type="button" onClick={() => setOpen(true)} className={btn}>
                <MessageSquare size={15} /> Send us a message
              </button>
            )}
          </div>
          {open && (
            <div className="mt-4 grid gap-2.5 text-left">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What would you like to ask or change?"
                aria-label="Your message"
                className="w-full rounded-xl border border-sage-100 px-3.5 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (so we can reply)"
                aria-label="Your email"
                className="w-full rounded-xl border border-sage-100 px-3.5 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
              />
              <button
                type="button"
                onClick={send}
                disabled={isPending}
                className="justify-self-center rounded-full bg-sage-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sage-700 disabled:bg-sage-200"
              >
                {isPending ? 'Sending…' : 'Send message'}
              </button>
              {error && <p className="text-center text-[13px] text-red-700">{error}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
