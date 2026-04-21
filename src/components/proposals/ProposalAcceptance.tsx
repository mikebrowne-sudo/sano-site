import type { ProposalClient } from '@/lib/proposals/types'
import { ProposalSection } from './ProposalSection'

type ProposalAcceptanceProps = {
  blurb: string
  client: ProposalClient
}

export function ProposalAcceptance({ blurb, client }: ProposalAcceptanceProps) {
  return (
    <ProposalSection eyebrow="Acceptance" title="Ready to go ahead?">
      <p className="text-sage-700 text-[1.0625rem] leading-[1.75] mb-6">
        {blurb}
      </p>

      <div className="rounded-xl border border-sage-100 bg-sage-50/40 p-5 lg:p-7 print:break-inside-avoid">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-5">
          Acceptance
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <div>
            <div className="text-sage-600 text-xs mb-2">
              Signed on behalf of {client.companyName}
            </div>
            <div className="h-12 border-b border-sage-200" aria-hidden />
            <div className="text-sage-500 text-xs mt-1.5">Signature</div>
          </div>
          <div>
            <div className="text-sage-600 text-xs mb-2">Name &amp; title</div>
            <div className="h-12 border-b border-sage-200" aria-hidden />
            <div className="text-sage-500 text-xs mt-1.5">Printed name</div>
          </div>
          <div>
            <div className="text-sage-600 text-xs mb-2">Date</div>
            <div className="h-12 border-b border-sage-200" aria-hidden />
            <div className="text-sage-500 text-xs mt-1.5">DD / MM / YYYY</div>
          </div>
          <div>
            <div className="text-sage-600 text-xs mb-2">Signed for Sano</div>
            <div className="h-12 border-b border-sage-200" aria-hidden />
            <div className="text-sage-500 text-xs mt-1.5">Sano Property Services Limited</div>
          </div>
        </div>
      </div>
    </ProposalSection>
  )
}
