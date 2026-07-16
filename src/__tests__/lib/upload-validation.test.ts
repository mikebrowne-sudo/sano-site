import { validateUploadFile, MAX_UPLOAD_BYTES } from '@/lib/upload-validation'

describe('validateUploadFile', () => {
  it('accepts PDF / JPG / PNG by extension', () => {
    expect(validateUploadFile({ name: 'cert.pdf', type: '', size: 1000 }).ok).toBe(true)
    expect(validateUploadFile({ name: 'id.JPG', type: '', size: 1000 }).ok).toBe(true)
    expect(validateUploadFile({ name: 'id.jpeg', type: '', size: 1000 }).ok).toBe(true)
    expect(validateUploadFile({ name: 'photo.png', type: '', size: 1000 }).ok).toBe(true)
  })

  it('accepts by MIME type even when the name has no clear extension', () => {
    expect(validateUploadFile({ name: 'scan', type: 'application/pdf', size: 1000 }).ok).toBe(true)
    expect(validateUploadFile({ name: 'scan', type: 'image/png', size: 1000 }).ok).toBe(true)
  })

  it('rejects disallowed types', () => {
    const r = validateUploadFile({ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 })
    expect(r.ok).toBe(false)
    expect(validateUploadFile({ name: 'archive.zip', type: 'application/zip', size: 1000 }).ok).toBe(false)
    expect(validateUploadFile({ name: 'sheet.xlsx', type: '', size: 1000 }).ok).toBe(false)
  })

  it('rejects empty and oversize files', () => {
    expect(validateUploadFile({ name: 'cert.pdf', type: 'application/pdf', size: 0 }).ok).toBe(false)
    expect(validateUploadFile({ name: 'cert.pdf', type: 'application/pdf', size: MAX_UPLOAD_BYTES + 1 }).ok).toBe(false)
    expect(validateUploadFile({ name: 'cert.pdf', type: 'application/pdf', size: MAX_UPLOAD_BYTES }).ok).toBe(true)
  })
})
