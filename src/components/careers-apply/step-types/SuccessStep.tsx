'use client'

import { motion } from 'framer-motion'
import { containerVariants, infoVariants } from '../motion'

export function SuccessStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="status"
      className="bg-sage-50 border border-sage-100 rounded-2xl p-10 text-center"
    >
      <motion.p variants={infoVariants} className="text-5xl mb-6" aria-hidden="true">✓</motion.p>
      <motion.h2 variants={infoVariants} className="text-sage-800 mb-4">Thanks — application received</motion.h2>
      <motion.p variants={infoVariants} className="body-text max-w-lg mx-auto">
        We&apos;ve received your application and will be in touch if it looks like a good fit. If you don&apos;t hear from us within a week, feel free to reach out at{' '}
        <a href="mailto:hello@sano.nz" className="text-sage-800 underline hover:text-sage-500">
          hello@sano.nz
        </a>
        .
      </motion.p>
    </motion.div>
  )
}
