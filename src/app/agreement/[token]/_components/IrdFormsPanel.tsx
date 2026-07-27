// Tax & KiwiSaver forms reference on the onboarding Documents step. IR330 and
// KS2 are completed online in the wizard; this panel reassures the signer of
// that and offers Sano's hosted copies + the always-current IRD version for
// their records. Presentational only.

import { Download, ExternalLink, CheckCircle2, Clock } from 'lucide-react'
import { IRD_ONBOARDING_FORMS } from '@/lib/ird-forms'

export function IrdFormsPanel() {
  return (
    <section className="mt-6 rounded-2xl border border-sage-200 bg-white overflow-hidden">
      <header className="px-5 py-4 border-b border-sage-100">
        <h3 className="text-[15px] font-semibold text-sage-800">Tax &amp; KiwiSaver forms</h3>
        <p className="text-[13px] text-sage-500 mt-1 leading-relaxed">
          You’ve already completed your tax code and KiwiSaver details in this form — nothing to print or upload. Copies are here for your records.
        </p>
      </header>

      <ul className="divide-y divide-sage-100">
        {IRD_ONBOARDING_FORMS.map((f) => {
          const done = f.status === 'done'
          return (
            <li key={f.code} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 ${done ? 'text-emerald-500' : 'text-sage-300'}`}>
                  {done ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-sage-800">{f.title}</span>
                    <span className="text-[10px] font-semibold tracking-wide text-sage-400 bg-sage-50 border border-sage-100 rounded px-1.5 py-0.5">{f.code}</span>
                    <span className={`ml-auto text-[11px] font-medium rounded-full px-2.5 py-0.5 ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-sage-100 text-sage-600'}`}>
                      {done ? 'Done in this form' : 'If needed, later'}
                    </span>
                  </div>

                  <p className="text-[13px] text-sage-500 mt-1 leading-relaxed">{f.blurb}</p>

                  <div className="flex items-center gap-2 mt-3">
                    {f.hostedPath && (
                      <a
                        href={f.hostedPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-1.5 hover:bg-sage-50 transition-colors"
                      >
                        <Download size={13} /> Download PDF
                      </a>
                    )}
                    <a
                      href={f.irdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sage-500 rounded-lg px-2.5 py-1.5 hover:text-sage-700 hover:bg-sage-50 transition-colors"
                    >
                      View on ird.govt.nz <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
