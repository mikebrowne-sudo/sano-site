import { readFileSync } from 'fs'
import { join } from 'path'

// Uploading a completed statutory form is "mark as done" — the upload flips the
// matching received/filed flag so staff don't have to toggle it separately.
// These source-level assertions guard that behaviour + the document types.

describe('completed-form upload auto-marks the matching flag', () => {
  const actions = readFileSync(join(process.cwd(), 'src/app/portal/contractors/_actions.ts'), 'utf8')

  it('IR330 / IR330C upload sets ir330_received = true', () => {
    expect(actions).toMatch(/type === 'ir330' \|\| type === 'ir330c'/)
    expect(actions).toMatch(/update\(\{ ir330_received: true \}\)\.eq\('id', contractorId\)/)
  })

  it('KS10 opt-out upload records the opt-out as filed + received-dated', () => {
    expect(actions).toMatch(/type === 'ks10_optout'/)
    expect(actions).toMatch(/kiwisaver_optout_filed: true/)
    expect(actions).toMatch(/kiwisaver_ks10_received_date/)
  })
})

describe('document types offer the employee/KiwiSaver statutory forms', () => {
  const upload = readFileSync(join(process.cwd(), 'src/app/portal/contractors/_components/DocumentUpload.tsx'), 'utf8')

  it('offers IR330 (employee) distinct from IR330C (contractor)', () => {
    expect(upload).toMatch(/value: 'ir330'/)
    expect(upload).toMatch(/value: 'ir330c'/)
  })

  it('offers the KS10 KiwiSaver opt-out form', () => {
    expect(upload).toMatch(/value: 'ks10_optout'/)
  })
})
