const TRUST_SIGNALS = [
  'Insured & vetted',
  'Eco-friendly products',
  'Satisfaction guaranteed',
  'No lock-in contracts',
  'Flexible scheduling',
]

export function TrustBar() {
  return (
    <div className="bg-sage-50 border-y border-sage-100">
      <div className="container-max section-padding">
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 py-3">
          {TRUST_SIGNALS.map((signal) => (
            <li key={signal} className="flex items-center gap-2 text-sm font-medium text-sage-800">
              <span className="text-sage-500" aria-hidden="true">✓</span>
              {signal}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
