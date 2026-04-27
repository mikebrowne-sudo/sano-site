'use client'

// Phase 5.5.12 — Create Job button now opens the JobSetupWizard
// instead of immediately creating a draft job. The wizard collects
// schedule + worker + payment + scope hints, then submits via
// createJobFromQuoteWithSetup which redirects on success.
//
// Seed props are sourced from the quote on the parent page so the
// wizard renders with sensible defaults.

import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { JobSetupWizard, type JobSetupSeed } from './JobSetupWizard'

export function CreateJobButton({ seed }: { seed: JobSetupSeed }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
      >
        <Briefcase size={16} />
        Create Job
      </button>
      {open && <JobSetupWizard seed={seed} onCancel={() => setOpen(false)} />}
    </div>
  )
}
