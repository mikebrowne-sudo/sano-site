import Image from 'next/image'
import Link from 'next/link'
import type { Service } from '@/types'

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-sage-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-sage-800/10"
    >
      {/* Fixed-height image */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden">
        <Image
          src={service.cardImage}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content — grows to fill remaining height */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-sage-800 mb-2">{service.name}</h3>
        <p className="text-sage-600 text-sm leading-relaxed flex-1">{service.shortDescription}</p>
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-sage-50">
          <span className="text-sm font-semibold text-sage-800 group-hover:text-sage-500 transition-colors duration-200 group-hover:underline underline-offset-2">
            Learn more →
          </span>
        </div>
      </div>
    </Link>
  )
}
