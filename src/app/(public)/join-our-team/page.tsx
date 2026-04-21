import type { Metadata } from 'next'
import { CareersHero } from '@/components/CareersHero'
import { WhyWorkWithSano } from '@/components/WhyWorkWithSano'
import { CareersProcess } from '@/components/CareersProcess'
import { CareersPrideSection } from '@/components/CareersPrideSection'
import { CareersContact } from '@/components/CareersContact'

export const metadata: Metadata = {
  title: 'Join Our Team | Sano',
  description:
    "We're looking for reliable, detail-focused people for flexible cleaning work across Auckland. Apply to join the Sano team.",
}

export default function JoinOurTeamPage() {
  return (
    <>
      <CareersHero />
      <WhyWorkWithSano />
      <CareersProcess />
      <CareersPrideSection />
      <CareersContact />
    </>
  )
}
