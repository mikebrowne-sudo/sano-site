// A contractor_invoice linked to a NON-draft statement is locked: it can't be
// edited or voided through ordinary actions — corrections require superseding
// the statement. Pure helper; callers fetch the linked statement's status.

export function statementEditBlock(
  statementStatus: string | null | undefined,
  statementNumber: string | null | undefined,
): string | null {
  if (!statementStatus || statementStatus === 'draft') return null
  const num = statementNumber ? ` ${statementNumber}` : ''
  return `This payable is on statement${num} (${statementStatus}). Supersede that statement to change or void it.`
}
