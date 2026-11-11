import { normaliseExperienceLevel, EXPERIENCE_LEVELS } from '../experience-level'
import { validateEmergencyContact } from '../emergency-contact'
import { buildWorkerDocPath, isExpectedWorkerDocPath } from '../worker-document-upload'
import { profileDocTypesForWorker, requiredProfileDocValues } from '../agreement-documents'

describe('normaliseExperienceLevel', () => {
  it('accepts canonical values', () => {
    for (const l of EXPERIENCE_LEVELS) expect(normaliseExperienceLevel(l.value)).toBe(l.value)
  })
  it('fixes case and stray spaces (the "Experienced " bug)', () => {
    expect(normaliseExperienceLevel('Experienced ')).toBe('experienced')
    expect(normaliseExperienceLevel('  LEAD')).toBe('lead')
  })
  it('treats blank as null', () => {
    expect(normaliseExperienceLevel('')).toBeNull()
    expect(normaliseExperienceLevel('   ')).toBeNull()
    expect(normaliseExperienceLevel(null)).toBeNull()
  })
  it('flags anything else as invalid', () => {
    expect(normaliseExperienceLevel('expert')).toBe('invalid')
  })
})

describe('validateEmergencyContact', () => {
  it('accepts a normal NZ contact and trims', () => {
    const r = validateEmergencyContact({ name: ' Ana Silva ', phone: ' 021 123 4567 ', relationship: ' Partner ' })
    expect(r).toEqual({
      ok: true,
      value: { emergency_contact_name: 'Ana Silva', emergency_contact_phone: '021 123 4567', emergency_contact_relationship: 'Partner' },
    })
  })
  it('allows an empty relationship (stored as null)', () => {
    const r = validateEmergencyContact({ name: 'Ana', phone: '+64 21 123 4567', relationship: '' })
    expect(r.ok && r.value.emergency_contact_relationship).toBeNull()
  })
  it('requires name and phone', () => {
    expect(validateEmergencyContact({ name: '', phone: '0211234567' }).ok).toBe(false)
    expect(validateEmergencyContact({ name: 'Ana', phone: '' }).ok).toBe(false)
  })
  it('rejects a phone with letters', () => {
    expect(validateEmergencyContact({ name: 'Ana', phone: 'call my mum' }).ok).toBe(false)
  })
})

describe('worker document paths', () => {
  const prefix = 'contractors/3784151e-65ed-47a7-86ad-2bd68bc768db'

  it('builds <prefix>/<type>-<ts>.<ext> with a safe lowercase extension', () => {
    expect(buildWorkerDocPath(prefix, 'id_verification', 'IMG_0194.PNG', 1794389118033))
      .toBe(`${prefix}/id_verification-1794389118033.png`)
    expect(buildWorkerDocPath(prefix, 'insurance', 'noext', 1794389118033))
      .toBe(`${prefix}/insurance-1794389118033.noext`)
    expect(buildWorkerDocPath(prefix, 'insurance', 'weird.p/d..f', 1794389118033))
      .toBe(`${prefix}/insurance-1794389118033.f`)
  })

  it('accepts only paths it could have issued to this caller', () => {
    const good = buildWorkerDocPath(prefix, 'insurance', 'cert.pdf', 1794389118033)
    expect(isExpectedWorkerDocPath(good, prefix, 'insurance')).toBe(true)
    // wrong document type
    expect(isExpectedWorkerDocPath(good, prefix, 'id_verification')).toBe(false)
    // someone else's folder
    expect(isExpectedWorkerDocPath(good.replace('3784151e', 'aaaaaaaa'), prefix, 'insurance')).toBe(false)
    // traversal / nesting
    expect(isExpectedWorkerDocPath(`${prefix}/../other/insurance-1794389118033.pdf`, prefix, 'insurance')).toBe(false)
    expect(isExpectedWorkerDocPath(`${prefix}/x/insurance-1794389118033.pdf`, prefix, 'insurance')).toBe(false)
  })
})

describe('profile document slots', () => {
  it('contractors get ID, insurance and right-to-work — never tax forms', () => {
    const values = profileDocTypesForWorker('contractor').map((d) => d.value)
    expect(values).toEqual(['id_verification', 'insurance', 'right_to_work'])
    expect(values).not.toContain('ir330c')
  })
  it('employees get ID + right-to-work only', () => {
    expect(profileDocTypesForWorker('employee').map((d) => d.value)).toEqual(['id_verification', 'right_to_work'])
  })
  it('right-to-work is never flagged as required (visa holders only)', () => {
    expect(requiredProfileDocValues('contractor')).toEqual(['id_verification', 'insurance'])
    expect(requiredProfileDocValues('employee')).toEqual(['id_verification'])
  })
})
