'use client'

import clsx from 'clsx'
import type { CommercialResult } from '@/lib/commercialPricing'

function nzd(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function ResultSummary({
  result,
  targetMarginPct,
  minimumCharge,
}: {
  result: CommercialResult
  targetMarginPct: number
  minimumCharge: number
}) {
  const warnings: { tone: 'amber' | 'blue' | 'red'; text: string }[] = []
  if (result.below_target_margin) {
    warnings.push({
      tone: 'amber',
      text: `Margin is below the ${Math.round(targetMarginPct * 100)}% target for this frequency.` +
            (result.suggested_price != null
              ? ` Suggested price to hit target: ${nzd(result.suggested_price)}.`
              : ''),
    })
  }
  if (result.minimum_applied) {
    warnings.push({
      tone: 'blue',
      text: `Minimum charge of ${nzd(minimumCharge)} applied.`,
    })
  }
  if (result.pricing_status === 'tight') {
    warnings.push({
      tone: 'red',
      text: 'Pricing is tight. Review inputs or lift the pricing mode.',
    })
  }

  const extras = result.extras_breakdown
  const hasExtras = result.extras_total > 0

  return (
    <div className="rounded-xl border border-sage-100 bg-white p-5 space-y-5">
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={clsx('text-sm rounded-lg px-3 py-2 border',
                w.tone === 'amber' && 'bg-amber-50 border-amber-200 text-amber-800',
                w.tone === 'blue'  && 'bg-blue-50 border-blue-200 text-blue-800',
                w.tone === 'red'   && 'bg-red-50 border-red-200 text-red-800',
              )}
            >
              {w.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Headline (feeds the quote)</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Price per clean"        value={nzd(result.total_per_clean)} strong />
            <Row label="Monthly value"          value={nzd(result.monthly_value)} />
            <Row label="Effective hourly rate"  value={`${nzd(result.effective_hourly_rate)} / hr`} />
          </dl>
        </div>

        <div className="rounded-lg bg-sage-50 border border-sage-100 p-3">
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Internal only</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Estimated hours"       value={`${result.estimated_hours} hrs`} />
            <Row label="Estimated cost"        value={nzd(result.estimated_cost)} />
            <Row label="Profit"                value={nzd(result.profit)} />
            <Row label="Margin"                value={pct(result.margin)} />
            <Row label="Status"                value={
              <span className={clsx('inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                result.pricing_status === 'high_margin' && 'bg-emerald-100 text-emerald-800',
                result.pricing_status === 'healthy'     && 'bg-sage-100 text-sage-800',
                result.pricing_status === 'tight'       && 'bg-red-100 text-red-800',
              )}>
                {result.pricing_status.replace('_', ' ')}
              </span>
            } />
          </dl>
        </div>
      </div>

      {hasExtras && (
        <div>
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">One-off extras (not in monthly)</div>
          <ul className="text-sm space-y-1">
            {extras.windows    > 0 && <li className="flex justify-between"><span>Window cleaning</span><span>{nzd(extras.windows)}</span></li>}
            {extras.carpet     > 0 && <li className="flex justify-between"><span>Carpet cleaning</span><span>{nzd(extras.carpet)}</span></li>}
            {extras.hard_floor > 0 && <li className="flex justify-between"><span>Hard floor treatment</span><span>{nzd(extras.hard_floor)}</span></li>}
            {extras.deep_clean > 0 && <li className="flex justify-between"><span>Deep clean uplift</span><span>{nzd(extras.deep_clean)}</span></li>}
            <li className="flex justify-between font-medium pt-1 border-t border-sage-100 mt-1">
              <span>Extras total</span><span>{nzd(result.extras_total)}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-sage-600">{label}</dt>
      <dd className={clsx(strong && 'font-semibold text-sage-800')}>{value}</dd>
    </div>
  )
}
