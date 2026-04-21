import { cn } from '@/lib/utils'

type ProposalSectionProps = {
  eyebrow?: string
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function ProposalSection({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: ProposalSectionProps) {
  return (
    <section className={cn('scroll-mt-20', className)}>
      {(eyebrow || title || subtitle) && (
        <header className="mb-6 lg:mb-8">
          {eyebrow && (
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500 mb-3">
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="font-display font-bold text-sage-800 text-2xl lg:text-[1.75rem] leading-tight tracking-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-2 text-sage-600 text-[0.95rem] leading-relaxed">
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
