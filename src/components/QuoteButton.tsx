import Link from 'next/link'

interface QuoteButtonProps {
  label?: string
  href?: string
  className?: string
  variant?: 'primary' | 'outline' | 'white' | 'ghost'
}

export function QuoteButton({
  label = 'Get a Free Quote',
  href = '/contact',
  className = '',
  variant = 'primary',
}: QuoteButtonProps) {
  const base = 'inline-block rounded-full px-6 py-3 font-sans font-semibold text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95 hover:scale-[1.03]'
  const variants = {
    primary: 'bg-sage-800 text-white hover:bg-sage-500 shadow-sm hover:shadow-md',
    outline: 'border-2 border-sage-800 text-sage-800 hover:bg-sage-50',
    white:   'bg-white text-sage-800 hover:bg-sage-50 shadow-sm hover:shadow-md',
    ghost:   'border-2 border-white/70 text-white hover:bg-white/15',
  }
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {label}
    </Link>
  )
}
