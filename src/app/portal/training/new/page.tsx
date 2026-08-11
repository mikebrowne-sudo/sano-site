import { ModuleForm } from '../_components/ModuleForm'
import { BackLink } from '../../_components/BackLink'

export default function NewModulePage() {
  return (
    <div>
      <BackLink fallbackHref="/portal/training" label="Back to training" />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Training Module</h1>
      <ModuleForm />
    </div>
  )
}
