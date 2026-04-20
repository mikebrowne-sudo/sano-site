'use client'

export function SuccessStep() {
  return (
    <div role="status" className="bg-sage-50 border border-sage-100 rounded-2xl p-10 text-center">
      <p className="text-5xl mb-6" aria-hidden="true">✓</p>
      <h2 className="text-sage-800 mb-4">Thanks — application received</h2>
      <p className="body-text max-w-lg mx-auto">
        We&apos;ve received your application and will be in touch if it looks like a good fit. If you don&apos;t hear from us within a week, feel free to reach out at{' '}
        <a href="mailto:hello@sano.nz" className="text-sage-800 underline hover:text-sage-500">
          hello@sano.nz
        </a>
        .
      </p>
    </div>
  )
}
