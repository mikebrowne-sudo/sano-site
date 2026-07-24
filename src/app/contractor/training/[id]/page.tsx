import { getContractor } from '../../_lib/get-contractor'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AcknowledgeGate } from './_components/AcknowledgeGate'
import clsx from 'clsx'

const CAT_STYLES: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  cleaning_training: 'bg-amber-50 text-amber-700',
  health_and_safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  policy: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Render module content with light structure: "- " lines become bullet lists,
// lines ending in ":" become sub-headings, blank lines separate paragraphs.
function renderModuleContent(content: string): JSX.Element[] {
  const blocks: JSX.Element[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="list-disc pl-5 space-y-1 marker:text-sage-400">
          {list.map((li, i) => <li key={i}>{li}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) { flushList(); continue }
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue }
    flushList()
    if (line.endsWith(':')) {
      blocks.push(<p key={`h${blocks.length}`} className="font-semibold text-sage-800">{line}</p>)
    } else {
      blocks.push(<p key={`p${blocks.length}`}>{line}</p>)
    }
  }
  flushList()
  return blocks
}

export default async function ContractorTrainingDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  const { data: assignment, error } = await supabase
    .from('worker_training_assignments')
    .select('id, status, due_date, completed_at, acknowledged_at, acknowledged_version, reacknowledgement_required, training_modules ( id, title, category, description, content, requires_acknowledgement, requires_completion, version, document_url, document_label )')
    .eq('id', params.id)
    .eq('contractor_id', contractor.id)
    .single()

  if (error || !assignment) redirect('/contractor/training')

  const mod = assignment.training_modules as unknown as {
    id: string; title: string; category: string; description: string | null
    content: string | null; requires_acknowledgement: boolean; requires_completion: boolean
    version: string | null; document_url: string | null; document_label: string | null
  } | null

  return (
    <div className="pb-8">
      <Link href="/contractor/training" className="inline-flex items-center gap-1.5 text-sm text-sage-500 hover:text-sage-700 transition-colors mb-5">
        <ArrowLeft size={14} /> Training
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-sage-800">{mod?.title ?? '—'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', CAT_STYLES[mod?.category ?? 'other'])}>{(mod?.category ?? 'other').replace(/_/g, ' ')}</span>
          {assignment.due_date && <span className="text-xs text-sage-500">Due {fmtDate(assignment.due_date)}</span>}
        </div>
      </div>

      {mod?.description && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Overview</h2>
          <p className="text-sage-700 text-sm leading-relaxed">{mod.description}</p>
        </div>
      )}

      {mod?.content && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-3">Content</h2>
          <div className="text-sage-700 text-sm leading-relaxed space-y-2.5">{renderModuleContent(mod.content)}</div>
        </div>
      )}

      {/* Supporting PDF — optional; opening it is NOT required to acknowledge. */}
      {mod?.document_url && (
        <a
          href={mod.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-sage-200 p-5 mt-4 hover:border-sage-300 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-sage-800">{mod.document_label || 'Supporting document'}</p>
            <p className="text-xs text-sage-500">View or download the full document (PDF){mod.version ? ` · v${mod.version}` : ''} — optional</p>
          </div>
          <span className="shrink-0 text-sage-500 text-sm font-medium">Open →</span>
        </a>
      )}

      {/* Sentinel: the acknowledgement gate enables only once this is reached. */}
      <div id="module-read-bottom" className="h-px w-full" aria-hidden="true" />

      <div className="mt-6">
        <AcknowledgeGate
          assignmentId={assignment.id}
          status={assignment.status}
          acknowledgedAt={assignment.acknowledged_at}
          completedAt={assignment.completed_at}
          acknowledgedVersion={(assignment as { acknowledged_version?: string | null }).acknowledged_version ?? null}
          currentVersion={mod?.version ?? null}
          reacknowledgementRequired={!!(assignment as { reacknowledgement_required?: boolean }).reacknowledgement_required}
          requiresAck={mod?.requires_acknowledgement ?? false}
          requiresCompletion={mod?.requires_completion ?? true}
          gateEnabled={!!mod?.content}
          sentinelId="module-read-bottom"
        />
      </div>
    </div>
  )
}
