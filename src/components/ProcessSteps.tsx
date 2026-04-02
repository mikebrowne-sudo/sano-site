const STEPS = [
  {
    number: '01',
    title: 'Book',
    description: "Fill in our quick quote form. We'll confirm your booking within a few hours.",
  },
  {
    number: '02',
    title: 'We clean',
    description: 'Our vetted cleaner arrives on time, fully equipped with eco-friendly products.',
  },
  {
    number: '03',
    title: 'You relax',
    description: 'Come home to a spotless space. We guarantee your satisfaction.',
  },
]

export function ProcessSteps() {
  return (
    <section className="section-padding py-16 bg-white">
      <div className="container-max">
        <h2 className="text-center text-sage-800 mb-12">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <li key={step.number} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-100 text-sage-800 font-display text-xl mb-4">
                {step.number}
              </div>
              <h3 className="text-lg mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
