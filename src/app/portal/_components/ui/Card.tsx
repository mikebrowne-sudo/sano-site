import clsx from 'clsx'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx('bg-white rounded-2xl border border-sage-100', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

interface SectionCardProps {
  title: string
  action?: React.ReactNode
  empty?: boolean
  emptyMessage?: string
  children?: React.ReactNode
  className?: string
}

export function SectionCard({
  title,
  action,
  empty,
  emptyMessage = 'Nothing here yet.',
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sage-100">
        <h2 className="text-sm font-semibold text-sage-800">{title}</h2>
        {action}
      </div>
      {empty ? (
        <div className="px-5 py-10 text-center text-sm text-sage-500">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-sage-50">{children}</div>
      )}
    </Card>
  )
}
