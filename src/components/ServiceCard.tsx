import Image from 'next/image'
import Link from 'next/link'
import type { Service } from '@/types'

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-sage-100">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={service.cardImage}
          alt={service.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <h3 className="text-sage-800 mb-2">{service.name}</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{service.shortDescription}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-sage-500 font-medium">From ${service.fromPrice} NZD</span>
          <Link
            href={`/services/${service.slug}`}
            className="text-sm font-medium text-sage-800 hover:text-sage-500 transition-colors"
          >
            Learn more →
          </Link>
        </div>
      </div>
    </article>
  )
}
