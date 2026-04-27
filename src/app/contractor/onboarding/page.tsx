// Phase 5.5.7 — Read-only contractor onboarding overview.
//
// Surfaces "how we work" + safety reminders + a link to the full
// training modules. No edits, no checklist mutation — admins still
// drive the real onboarding lifecycle from /portal/contractors/[id].

import Link from 'next/link'
import { CheckCircle2, ShieldCheck, Sparkles, GraduationCap, ChevronRight } from 'lucide-react'

const HOW_WE_WORK = [
  'Confirm the job in the Jobs tab the day before — addresses, access notes, and timing.',
  'Tap "On my way" when you set off so the customer gets an automatic heads-up.',
  'Tap "Start job" when you arrive on site, and "Complete job" once everything is finished.',
  'Add notes or photos under "Your Notes" if anything was unusual or worth flagging.',
]

const EXPECTATIONS = [
  'Arrive on time. If you’re running late, message Sano right away.',
  'Bring your kit, your PPE, and any product noted on the job.',
  'Treat customer property with care — leave the space cleaner than you found it.',
  'Keep communication respectful and professional at all times.',
]

const SAFETY = [
  'Wear gloves and footwear suited to the job. Slip risk first, every time.',
  'Open windows and ventilate before and during chemical use.',
  'Never mix bleach with ammonia-based products.',
  'Lift with your legs. If something is too heavy, ask for help — don’t injure yourself.',
  'Report any incident, near miss, or unsafe situation to Sano immediately.',
]

export default function ContractorOnboardingPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-sage-800">Onboarding</h1>
        <p className="text-sage-500 text-sm mt-0.5">How we work, what we expect, and how to stay safe on site.</p>
      </header>

      <Section title="How we work" icon={<Sparkles size={16} className="text-sage-400" />}>
        <Bullets items={HOW_WE_WORK} tone="neutral" />
      </Section>

      <Section title="Expectations" icon={<CheckCircle2 size={16} className="text-sage-400" />}>
        <Bullets items={EXPECTATIONS} tone="neutral" />
      </Section>

      <Section title="Safety reminders" icon={<ShieldCheck size={16} className="text-amber-500" />}>
        <Bullets items={SAFETY} tone="warn" />
      </Section>

      <Link
        href="/contractor/training"
        className="block bg-white rounded-2xl border border-sage-100 px-5 py-4 hover:border-sage-300 active:bg-sage-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sage-800 font-medium">
            <GraduationCap size={18} className="text-sage-500" />
            Training modules
          </span>
          <ChevronRight size={16} className="text-sage-400" />
        </div>
        <p className="text-xs text-sage-500 mt-1">View your assigned training and progress.</p>
      </Link>

      <p className="text-xs text-sage-500 text-center">
        Questions? Get in touch with Sano any time.
      </p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-sage-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800 mb-3">
        {icon}{title}
      </h2>
      {children}
    </section>
  )
}

function Bullets({ items, tone }: { items: readonly string[]; tone: 'neutral' | 'warn' }) {
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-sage-700 leading-relaxed">
          <span
            className={
              tone === 'warn'
                ? 'mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0'
                : 'mt-1.5 w-1.5 h-1.5 rounded-full bg-sage-500 shrink-0'
            }
            aria-hidden="true"
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}
