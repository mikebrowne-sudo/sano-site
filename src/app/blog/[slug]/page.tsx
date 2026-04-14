import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { POSTS, getPostBySlug } from '@/lib/blog'
import { CtaBanner } from '@/components/CtaBanner'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: `${post.title} | Sano Blog`,
    description: post.excerpt,
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  return (
    <>
      {/* Featured image banner */}
      <div className="relative h-[380px] overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(6,35,29,0.85) 0%, rgba(6,35,29,0.40) 50%, rgba(6,35,29,0.10) 100%)',
          }}
          aria-hidden="true"
        />
        {/* Title + date overlaid on image */}
        <div className="absolute bottom-0 left-0 right-0 container-max section-padding pb-8">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-white/70 mb-2">
            {post.date}
          </p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold leading-snug max-w-2xl">
            {post.title}
          </h1>
        </div>
      </div>

      {/* Article body */}
      <article className="container-max section-padding py-16">
        <div className="max-w-2xl mx-auto">
          {/* Intro */}
          <p className="text-[16px] text-gray-600 leading-relaxed mb-8">{post.intro}</p>

          {/* Sections */}
          {post.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-[18px] font-bold text-sage-800 mt-8 mb-3">
                {section.heading}
              </h2>
              <p className="text-[16px] text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}

          {/* Conclusion */}
          <hr className="my-10 border-gray-200" />
          <h2 className="text-[18px] font-bold text-sage-800 mb-3">
            {post.conclusion.heading}
          </h2>
          <p className="text-[16px] text-gray-600 leading-relaxed">
            {post.conclusion.body}
          </p>
        </div>
      </article>

      <CtaBanner />
    </>
  )
}
