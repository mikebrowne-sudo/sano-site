'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCustomInvoice } from '../_actions-custom'
import type { CustomInvoiceFormInput } from '@/lib/custom-invoice-validation'
import { Input, Textarea, Select, Checkbox, ToggleGroup, FormFeedback, FormActions } from '../../_components/form'

interface ClientOption {
  id: string
  name: string
  company_name: string | null
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function plus14ISO(from: string): string {
  const d = new Date(from + 'T00:00:00')
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export function CustomInvoiceForm({ clients }: { clients: ClientOption[] }) {
  const today = todayISO()

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientId, setClientId] = useState('')
  const [dateIssued, setDateIssued] = useState(today)
  const [dueDate, setDueDate] = useState(plus14ISO(today))
  const [serviceAddress, setServiceAddress] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [gstIncluded, setGstIncluded] = useState(true)
  const [paymentType, setPaymentType] = useState<'cash_sale' | 'on_account'>('on_account')
  const [clientReference, setClientReference] = useState('')
  const [requiresPo, setRequiresPo] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomInvoiceFormInput, string>>>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const priceNum = parseFloat(basePrice)
    const input: CustomInvoiceFormInput = {
      invoice_number: invoiceNumber.trim(),
      client_id: clientId,
      date_issued: dateIssued,
      due_date: dueDate,
      service_address: serviceAddress.trim() || null,
      service_description: serviceDescription,
      notes,
      base_price: Number.isFinite(priceNum) ? priceNum : NaN,
      gst_included: gstIncluded,
      payment_type: paymentType,
      client_reference: clientReference.trim() || null,
      requires_po: requiresPo,
    }

    startTransition(async () => {
      const result = await createCustomInvoice(input)
      if (result?.error) {
        setError(result.error)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      }
      // Successful create redirects server-side; no client-side nav needed.
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <FormFeedback variant="error">{error}</FormFeedback>}

      <Input
        label="Invoice number"
        placeholder="INV-26001"
        value={invoiceNumber}
        onChange={setInvoiceNumber}
        autoComplete="off"
        hint="Format: INV-XXXX (4–6 digits). Must not already exist."
        error={fieldErrors.invoice_number}
      />

      <Select
        label="Client"
        value={clientId}
        onChange={setClientId}
        error={fieldErrors.client_id}
        options={[
          { value: '', label: '— Select client —' },
          ...clients.map((c) => ({ value: c.id, label: c.company_name ? `${c.company_name} (${c.name})` : c.name })),
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Date issued" type="date" value={dateIssued} onChange={setDateIssued} error={fieldErrors.date_issued} />
        <div>
          <Input label="Due date" type="date" value={dueDate} onChange={setDueDate} error={fieldErrors.due_date} />
          <button
            type="button"
            onClick={() => setDueDate(plus14ISO(dateIssued))}
            className="text-xs text-sage-600 underline hover:text-sage-800 mt-1"
          >
            Use 14-day terms
          </button>
        </div>
      </div>

      <Input label="Service address (optional)" value={serviceAddress} onChange={setServiceAddress} />

      <div>
        <Input
          label="Client reference / PO number (optional)"
          placeholder="e.g. PO-12345"
          value={clientReference}
          onChange={setClientReference}
          autoComplete="off"
        />
        <div className="mt-2">
          <Checkbox checked={requiresPo} onChange={setRequiresPo} label="Client requires a PO before invoicing" />
        </div>
      </div>

      <Textarea
        label="Service description"
        rows={6}
        placeholder="e.g. Two-bedroom end-of-tenancy clean including oven and fridge interior."
        value={serviceDescription}
        onChange={setServiceDescription}
        hint="Customer-facing wording — appears on the printed invoice and the share link as the main description."
        error={fieldErrors.service_description}
      />

      <Textarea
        label="Additional notes (optional)"
        rows={4}
        placeholder="Internal notes or supporting wording. Renders in the Notes section if filled."
        value={notes}
        onChange={setNotes}
        error={fieldErrors.notes}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Base price (NZD)" type="number" step="0.01" min="0" value={basePrice} onChange={setBasePrice} error={fieldErrors.base_price} />
        <div className="flex items-end pb-3">
          <Checkbox checked={gstIncluded} onChange={setGstIncluded} label="GST included in price" />
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Payment type</span>
        <ToggleGroup
          ariaLabel="Payment type"
          value={paymentType}
          onChange={(v) => setPaymentType(v as 'cash_sale' | 'on_account')}
          options={[
            { value: 'on_account', label: 'On account' },
            { value: 'cash_sale', label: 'Cash sale' },
          ]}
        />
        {fieldErrors.payment_type && <p className="mt-1 text-xs text-red-600">{fieldErrors.payment_type}</p>}
      </div>

      <div className="pt-4 border-t border-sage-100">
        <FormActions>
          <button
            type="submit"
            disabled={isPending}
            className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Creating…' : 'Create custom invoice'}
          </button>
          <Link href="/portal/invoices" className="text-sm text-sage-600 hover:text-sage-800">Cancel</Link>
        </FormActions>
      </div>
    </form>
  )
}
