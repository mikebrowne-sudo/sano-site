const STEPS = ['Apply', 'Review', 'Contact', 'Trial', 'Get started']

export function CareersProcess() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2>How it works</h2>
        </div>

        {/* Desktop: horizontal row with connector line */}
        <div className="relative mx-auto hidden max-w-4xl md:block">
          <div
            aria-hidden="true"
            className="absolute left-[10%] top-5 h-px w-[80%] bg-sage-100"
          />
          <div className="relative grid grid-cols-5 gap-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-sage-100 text-sage-600 text-sm font-semibold ring-4 ring-white">
                  {i + 1}
                </div>
                <p className="mt-3 text-sm font-medium text-sage-800">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <ol className="mx-auto max-w-sm space-y-5 md:hidden">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-sage-100 text-sage-600 text-sm font-semibold">
                {i + 1}
              </div>
              <p className="text-sm font-medium text-sage-800">{label}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
