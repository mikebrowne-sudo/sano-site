import Image from 'next/image'
import Link from 'next/link'
import type { Service } from '@/types'

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-sage-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-sage-800/10">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={service.cardImage}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <h3 className="text-sage-800 mb-2">{service.name}</h3>
        <p className="text-sage-600 text-sm leading-relaxed mb-4">{service.shortDescription}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-sage-500 font-semibold">From ${service.fromPrice} NZD</span>
          <Link
            href={`/services/${service.slug}`}
            className="text-sm font-semibold text-sage-800 hover:text-sage-500 transition-colors duration-200 group-hover:underline underline-offset-2"
          >
            Learn more →
          </Link>
        </div>
      </div>
    </article>
  )
}
