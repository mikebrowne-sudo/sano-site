'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import type { ApplicationFormData, JobApplicationPayload } from '@/types/application'
import { createEmptyApplicationForm, validateApplication } from '@/lib/applicationValidation'
import { stepValidators, type StepField } from '@/lib/applicationStepValidation'
import { STEPS, type StepDef } from './steps.config'
import { WizardProgress } from './WizardProgress'
import { WizardNav } from './WizardNav'
import { WelcomeStep } from './step-types/WelcomeStep'
import { InfoStep } from './step-types/InfoStep'
import { TextStep } from './step-types/TextStep'
import { TextareaStep } from './step-types/TextareaStep'
import { DateStep } from './step-types/DateStep'
import { YesNoStep } from './step-types/YesNoStep'
import { ChipSingleStep } from './step-types/ChipSingleStep'
import { ChipMultiStep } from './step-types/ChipMultiStep'
import { DeclarationStep } from './step-types/DeclarationStep'
import { ReviewStep } from './step-types/ReviewStep'
import { SuccessStep } from './step-types/SuccessStep'

type Status = 'idle' | 'submitting' | 'success' | 'error'

function stepError(step: StepDef, data: ApplicationFormData): string | null {
  if ('field' in step && step.type !== 'declaration') {
    const field = step.field as StepField
    if (field in stepValidators) {
      const required = 'required' in step && step.required
      const minSelected = step.type === 'chip-multi' ? step.minSelected ?? 0 : 0
      if (required || minSelected > 0) {
        return stepValidators[field](data)
      }
    }
  }
  if (step.type === 'declaration') {
    return stepValidators.confirm_truth(data)
  }
  return null
}

export function ApplicationWizard() {
  const [form, setForm] = useState<ApplicationFormData>(createEmptyApplicationForm())
  const [stepIndex, setStepIndex] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showStepError, setShowStepError] = useState(false)

  const visibleSteps = useMemo(() => STEPS.filter((s) => !('visible' in s) || !s.visible || s.visible(form)), [form])
  const currentStep = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)]
  const total = visibleSteps.length
  const isFirst = stepIndex === 0
  const isLast = currentStep.type === 'success'

  function update<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setShowStepError(false)
  }

  function goNext() {
    const err = stepError(currentStep, form)
    if (err) {
      setShowStepError(true)
      return
    }
    if (currentStep.type === 'review') return // review has its own submit button
    setShowStepError(false)
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1))
  }

  function goBack() {
    setShowStepError(false)
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function submit() {
    const errors = validateApplication(form)
    if (Object.keys(errors).length > 0) {
      setErrorMessage(Object.values(errors)[0] ?? 'Please check your answers.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    try {
      const payload: JobApplicationPayload = form
      const res = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setStatus('success')
      setStepIndex(visibleSteps.findIndex((s) => s.type === 'success'))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const err = showStepError ? stepError(currentStep, form) : null
  const reviewStatus: 'idle' | 'submitting' | 'error' = status === 'submitting' ? 'submitting' : status === 'error' ? 'error' : 'idle'

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[600px] flex flex-col">
        {currentStep.type !== 'success' && (
          <div className="mb-12 max-w-2xl mx-auto w-full">
            <WizardProgress current={stepIndex} total={total} />
          </div>
        )}

        <div className="flex-1 max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep(currentStep, form, update, goNext, submit, reviewStatus, errorMessage, err)}
            </motion.div>
          </AnimatePresence>

          {currentStep.type !== 'success' && currentStep.type !== 'review' && currentStep.type !== 'welcome' && (
            <WizardNav
              onNext={goNext}
              onBack={goBack}
              isFirst={isFirst}
              isLast={isLast}
              nextLabel={currentStep.type === 'info' ? currentStep.nextLabel : undefined}
            />
          )}
        </div>
      </div>
    </MotionConfig>
  )
}

function renderStep(
  step: StepDef,
  form: ApplicationFormData,
  update: <K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => void,
  goNext: () => void,
  submit: () => void,
  reviewStatus: 'idle' | 'submitting' | 'error',
  errorMessage: string,
  err: string | null,
) {
  switch (step.type) {
    case 'welcome':
      return <WelcomeStep onNext={goNext} />
    case 'info':
      return <InfoStep data={form} title={step.title} body={step.body} />
    case 'text':
      return (
        <TextStep
          id={step.id}
          question={step.question}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          onNext={goNext}
          inputType={step.inputType}
          placeholder={step.placeholder}
          error={err}
        />
      )
    case 'textarea':
      return (
        <TextareaStep
          id={step.id}
          question={step.question}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          placeholder={step.placeholder}
          helper={step.helper}
        />
      )
    case 'date':
      return (
        <DateStep
          id={step.id}
          question={step.question}
          helper={step.helper}
          value={form.date_of_birth}
          onChange={(v) => update('date_of_birth', v)}
          onSkip={() => { update('date_of_birth', null); goNext() }}
        />
      )
    case 'yesno':
      return (
        <YesNoStep
          id={step.id}
          question={typeof step.question === 'function' ? step.question(form) : step.question}
          value={form[step.field] as boolean | null}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'chip-single':
      return (
        <ChipSingleStep
          id={step.id}
          question={step.question}
          options={step.options}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'chip-multi':
      return (
        <ChipMultiStep
          id={step.id}
          question={step.question}
          helper={step.helper}
          options={step.options}
          value={(form[step.field] as string[]) ?? []}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'declaration':
      return (
        <DeclarationStep
          body={step.body}
          checked={form.confirm_truth}
          onChange={(v) => update('confirm_truth', v)}
          error={err}
        />
      )
    case 'review':
      return (
        <ReviewStep
          data={form}
          status={reviewStatus}
          errorMessage={errorMessage}
          onSubmit={submit}
        />
      )
    case 'success':
      return <SuccessStep />
    default:
      return null
  }
}
