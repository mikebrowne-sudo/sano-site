import clsx from 'clsx'
import Link from 'next/link'

type Accent = 'neutral' | 'emerald' | 'amber' | 'blue' | 'red' | 'purple'

const accentText: Record<Accent, string> = {
  neutral: 'text-sage-800',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  blue: 'text-blue-700',
  red: 'text-red-700',
  purple: 'text-purple-700',
}

const accentIcon: Record<Accent, string> = {
  neutral: 'text-sage-500',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
}

interface KpiCardProps {
  icon?: React.ElementType
  label: string
  value: number | string
  accent?: Accent
  href?: string
}

export function KpiCard({ icon: Icon, label, value, accent = 'neutral', href }: KpiCardProps) {
  const body = (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-sage-100 p-5 transition-all',
        href && 'hover:border-sage-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} className={accentIcon[accent]} />}
        <span className="text-xs font-medium text-sage-600 uppercase tracking-wider">{label}</span>
      </div>
      <p className={clsx('text-3xl font-bold tracking-tight', accentText[accent])}>{value}</p>
    </div>
  )
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

interface MiniStatProps {
  label: string
  value: number | string
  accent?: Accent
  href: string
}

export function MiniStat({ label, value, accent = 'neutral', href }: MiniStatProps) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-sage-100 px-4 py-3.5 transition-all hover:border-sage-300 hover:shadow-sm"
    >
      <p className={clsx('text-2xl font-bold tracking-tight', accentText[accent])}>{value}</p>
      <p className="text-xs font-medium text-sage-600 mt-0.5">{label}</p>
    </Link>
  )
}
