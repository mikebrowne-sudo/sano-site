// Contractor-facing job title.
//
// Job titles are auto-generated with the source quote reference appended
// (e.g. "Clean — QUO-0104"). Contractors should only ever see the work
// description + their JOB number — never the internal quote number — so
// we strip a trailing "— QUO-####" for any contractor-facing surface.
// Display-only; the stored title (which staff see) is unchanged.

export function contractorJobTitle(title: string | null | undefined): string | null {
  if (!title) return null
  const stripped = title.replace(/\s*[—–-]\s*QUO-?\d+\s*$/i, '').trim()
  return stripped || null
}
