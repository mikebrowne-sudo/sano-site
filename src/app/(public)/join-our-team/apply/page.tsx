import type { Metadata } from 'next'
import { ApplicationWizard } from '@/components/careers-apply/ApplicationWizard'

export const metadata: Metadata = {
  title: 'Apply | Sano Careers',
  description: 'Apply to join the Sano cleaning team.',
}

export default function ApplyPage() {
  return (
    <section className="section-padding section-y bg-[#faf9f6] min-h-[80vh]">
      <ApplicationWizard />
    </section>
  )
}
