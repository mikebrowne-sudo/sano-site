// Shared class strings for portal buttons + button-styled links. Kept as
// string constants (not a component) so callers can pick `<button>` or
// `<Link>` without a polymorphic wrapper.

export const buttonClasses = {
  primary:
    'inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50',
  secondary:
    'inline-flex items-center gap-2 border border-sage-200 bg-white text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 hover:border-sage-300 transition-colors disabled:opacity-50',
  ghost:
    'inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors',
} as const

export type ButtonVariant = keyof typeof buttonClasses
