import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface AttentionBannerProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function AttentionBanner({
  title = 'Needs attention',
  children,
  className,
}: AttentionBannerProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-sage-100 border-l-4 border-l-amber-400 rounded-xl px-5 py-4',
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-sage-800 mb-2 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" />
        {title}
      </h2>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">{children}</div>
    </div>
  )
}
