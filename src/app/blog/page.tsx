import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { HeroSection } from '@/components/HeroSection'
import { POSTS } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog | Sano Cleaning',
  description:
    'Practical tips, guides, and insights to help you keep your space clean and well-maintained.',
}

export default function BlogPage() {
  return (
    <>
      <HeroSection
        imageUrl="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80"
        imageAlt="Clean Auckland home"
        badge="Tips & Guides"
        headline="Cleaning Advice for Auckland Homes"
        subtext="Practical tips, guides, and insights to help you keep your space clean and well-maintained."
        showSecondaryButton={false}
        centred
      />

      <section className="container-max section-padding py-14 pb-20">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {POSTS.map((post, index) => {
            const isLast = index === POSTS.length - 1
            const isOdd = POSTS.length % 3 !== 0
            return (
              <li
                key={post.slug}
                className={isLast && isOdd ? 'lg:col-start-2' : undefined}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block bg-white rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-all duration-[250ms] hover:scale-[1.03] hover:shadow-[0_8px_28px_rgba(0,0,0,0.13)]"
                >
                  <div className="h-[200px] overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={600}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 pt-[20px] pb-[22px] px-[22px]">
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-gray-400 mb-2">
                      {post.date}
                    </p>
                    <h2 className="text-[15px] font-bold text-sage-800 leading-snug mb-2.5">
                      {post.title}
                    </h2>
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
