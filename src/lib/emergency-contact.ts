// Validation for a worker's emergency contact (self-service on the contractor
// portal Profile screen). Pure so it is unit-tested.

export interface EmergencyContactInput {
  name?: string | null
  phone?: string | null
  relationship?: string | null
}

export interface EmergencyContactClean {
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string | null
}

const PHONE_RE = /^[0-9+()\s-]{6,20}$/

export function validateEmergencyContact(
  input: EmergencyContactInput,
): { ok: true; value: EmergencyContactClean } | { ok: false; error: string } {
  const name = (input.name ?? '').trim()
  const phone = (input.phone ?? '').trim()
  const relationship = (input.relationship ?? '').trim()

  if (!name) return { ok: false, error: 'Add your emergency contact’s name.' }
  if (name.length > 100) return { ok: false, error: 'That name is too long.' }
  if (!phone) return { ok: false, error: 'Add your emergency contact’s phone number.' }
  if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 6) {
    return { ok: false, error: 'That phone number doesn’t look right — use digits only, e.g. 021 123 4567.' }
  }
  if (relationship.length > 60) return { ok: false, error: 'Keep the relationship short, e.g. Partner or Parent.' }

  return {
    ok: true,
    value: {
      emergency_contact_name: name,
      emergency_contact_phone: phone,
      emergency_contact_relationship: relationship || null,
    },
  }
}
