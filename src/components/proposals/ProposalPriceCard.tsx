import { cn } from '@/lib/utils'
import { formatNzd } from '@/lib/proposals/format'

type ProposalPriceCardProps = {
  title: string
  price: number | null
  recommended?: boolean
  description?: string
  cadenceLabel?: string
  className?: string
}

export function ProposalPriceCard({
  title,
  price,
  recommended = false,
  description,
  cadenceLabel = 'per month + GST',
  className,
}: ProposalPriceCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border p-5 lg:p-6 flex flex-col h-full print:break-inside-avoid transition-colors',
        recommended
          ? 'border-sage-500 bg-sage-50/60 ring-1 ring-sage-500/20'
          : 'border-sage-100 bg-white',
        className
      )}
    >
      {recommended && (
        <div className="absolute -top-2.5 left-5">
          <span className="inline-flex items-center gap-1 bg-sage-500 text-white text-[0.65rem] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full">
            Recommended
          </span>
        </div>
      )}

      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-2">
        {title}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="font-display text-sage-800 text-3xl lg:text-[2rem] font-bold tracking-tight">
          {formatNzd(price)}
        </span>
        <span className="text-sage-600 text-xs">{cadenceLabel}</span>
      </div>

      {description && (
        <p className="text-sage-600 text-[0.9rem] leading-relaxed mt-auto">
          {description}
        </p>
      )}
    </div>
  )
}
