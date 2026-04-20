export function CareersContact() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4">Have a question?</h2>
          <p className="body-text mb-8">
            If you&apos;re unsure about anything or want to check if this is the right fit, feel free to get in touch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0800726686"
              className="inline-flex items-center justify-center rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
            >
              0800 726 686
            </a>
            <a
              href="mailto:hello@sano.nz"
              className="inline-flex items-center justify-center rounded-full border border-sage-800 px-6 py-3 text-sm font-medium text-sage-800 hover:bg-sage-50 transition-colors"
            >
              hello@sano.nz
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
