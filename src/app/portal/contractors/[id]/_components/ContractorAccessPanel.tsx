// Phase 5.5.3 — Contractor portal access panel (server component).

import clsx from 'clsx'
import {
  ContractorAccessActions,
  contractorAccessStatus,
  STATUS_LABEL,
  STATUS_BADGE,
} from './ContractorAccessActions'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ContractorAccessPanel({
  contractorId,
  email,
  authUserId,
  inviteSentAt,
  inviteAcceptedAt,
  accessDisabledAt,
  accessDisabledReason,
  featureEnabled,
}: {
  contractorId: string
  email: string | null
  authUserId: string | null
  inviteSentAt: string | null
  inviteAcceptedAt: string | null
  accessDisabledAt: string | null
  accessDisabledReason: string | null
  featureEnabled: boolean
}) {
  const status = contractorAccessStatus(
    {
      access_disabled_at: accessDisabledAt,
      invite_accepted_at: inviteAcceptedAt,
      invite_sent_at: inviteSentAt,
      auth_user_id: authUserId,
    },
    featureEnabled,
  )

  return (
    <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-semibold text-sage-800">Portal access</h2>
        <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[status])}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {!email && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
          No email on file — add one before sending an invite.
        </p>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
        <div>
          <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Auth user</dt>
          <dd className="text-sage-800 font-medium">{authUserId ? 'Linked' : 'Not linked'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Last invited</dt>
          <dd className="text-sage-800 font-medium">{fmtDate(inviteSentAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Invite accepted</dt>
          <dd className="text-sage-800 font-medium">{fmtDate(inviteAcceptedAt)}</dd>
        </div>
        {accessDisabledAt && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Disabled</dt>
            <dd className="text-red-700 font-medium">{fmtDate(accessDisabledAt)} — {accessDisabledReason || '(no reason)'}</dd>
          </div>
        )}
      </dl>

      {status === 'disabled' && (
        <p className="text-xs text-sage-600 bg-sage-50 rounded-lg px-3 py-2 mb-3">
          Access is disabled. Contact admin if this is unexpected.
        </p>
      )}

      <ContractorAccessActions
        contractorId={contractorId}
        status={status}
        featureEnabled={featureEnabled}
      />
    </div>
  )
}
