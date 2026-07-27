// Tax & KiwiSaver forms reference on the onboarding Documents step. IR330 and
// KS2 are completed online in the wizard; this panel reassures the signer of
// that and offers Sano's hosted copies + the always-current IRD version for
// their records. Presentational only.

import { FileText, Download, ExternalLink, Check } from 'lucide-react'
import { IRD_ONBOARDING_FORMS } from '@/lib/ird-forms'

export function IrdFormsPanel() {
  return (
    <div className="mt-6 rounded-xl border border-sage-100 bg-sage-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-sage-100 bg-white">
        <h3 className="text-sm font-semibold text-sage-800">Tax &amp; KiwiSaver forms</h3>
        <p className="text-[12px] text-sage-500 mt-0.5">
          Your tax code (IR330) and KiwiSaver details are completed online in this form — there’s nothing to print or upload. Copies are here for your records.
        </p>
      </div>
      <ul className="divide-y divide-sage-100">
        {IRD_ONBOARDING_FORMS.map((f) => (
          <li key={f.code} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-lg bg-white border border-sage-100 p-2 text-sage-500">
              <FileText size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-sage-800">{f.title}</span>
                {f.doneOnline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-0.5">
                    <Check size={10} /> Completed online
                  </span>
                )}
              </div>
              <p className="text-[12px] text-sage-500 mt-0.5 leading-relaxed">{f.blurb}</p>
              <div className="flex items-center gap-4 mt-1.5">
                {f.hostedPath && (
                  <a
                    href={f.hostedPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sage-700 hover:text-sage-900"
                  >
                    <Download size={13} /> Download PDF
                  </a>
                )}
                <a
                  href={f.irdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-sage-500 hover:text-sage-700"
                >
                  Latest on ird.govt.nz <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
