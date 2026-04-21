import { cn } from '@/lib/utils'

type ProposalPageShellProps = {
  children: React.ReactNode
  className?: string
}

export function ProposalPageShell({ children, className }: ProposalPageShellProps) {
  return (
    <div className={cn('bg-sage-50/60 min-h-screen print:bg-white', className)}>
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 print:px-0 print:py-0 print:max-w-none">
        <article className="bg-white border border-sage-100 rounded-2xl shadow-sm print:shadow-none print:border-0 print:rounded-none">
          <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-14 print:px-0 print:py-0 space-y-14 lg:space-y-20">
            {children}
          </div>
        </article>
      </div>
    </div>
  )
}
