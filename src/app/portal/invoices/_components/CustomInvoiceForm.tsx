'use client'

import { useState, useTransition } from 'react'
import { createCustomInvoice } from '../_actions-custom'
import type { CustomInvoiceFormInput } from '@/lib/custom-invoice-validation'

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

  const inputCls = 'w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage-500'
  const labelCls = 'block text-sm font-medium text-sage-800 mb-1'
  const errCls = 'text-xs text-red-700 mt-1'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor="invoice_number">Invoice number</label>
        <input
          id="invoice_number"
          className={inputCls}
          placeholder="INV-26001"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          autoComplete="off"
        />
        <p className="text-xs text-sage-600 mt-1">Format: INV-XXXX (4–6 digits). Must not already exist.</p>
        {fieldErrors.invoice_number && <p className={errCls}>{fieldErrors.invoice_number}</p>}
      </div>

      <div>
        <label className={labelCls} htmlFor="client_id">Client</label>
        <select
          id="client_id"
          className={inputCls}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">— Select client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name ? `${c.company_name} (${c.name})` : c.name}
            </option>
          ))}
        </select>
        {fieldErrors.client_id && <p className={errCls}>{fieldErrors.client_id}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="date_issued">Date issued</label>
          <input
            id="date_issued"
            type="date"
            className={inputCls}
            value={dateIssued}
            onChange={(e) => setDateIssued(e.target.value)}
          />
          {fieldErrors.date_issued && <p className={errCls}>{fieldErrors.date_issued}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="due_date">Due date</label>
          <input
            id="due_date"
            type="date"
            className={inputCls}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setDueDate(plus14ISO(dateIssued))}
            className="text-xs text-sage-600 underline hover:text-sage-800 mt-1"
          >
            Use 14-day terms
          </button>
          {fieldErrors.due_date && <p className={errCls}>{fieldErrors.due_date}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="service_address">Service address (optional)</label>
        <input
          id="service_address"
          className={inputCls}
          value={serviceAddress}
          onChange={(e) => setServiceAddress(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="service_description">Service description</label>
        <textarea
          id="service_description"
          className={inputCls + ' min-h-[140px]'}
          placeholder="e.g. Two-bedroom end-of-tenancy clean including oven and fridge interior."
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
        />
        <p className="text-xs text-sage-600 mt-1">Customer-facing wording — appears on the printed invoice and the share link as the main description.</p>
        {fieldErrors.service_description && <p className={errCls}>{fieldErrors.service_description}</p>}
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">Additional notes (optional)</label>
        <textarea
          id="notes"
          className={inputCls + ' min-h-[100px]'}
          placeholder="Internal notes or supporting wording. Renders in the Notes section if filled."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {fieldErrors.notes && <p className={errCls}>{fieldErrors.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="base_price">Base price (NZD)</label>
          <input
            id="base_price"
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />
          {fieldErrors.base_price && <p className={errCls}>{fieldErrors.base_price}</p>}
        </div>
        <div className="flex items-center pt-7">
          <label className="inline-flex items-center text-sm text-sage-800">
            <input
              type="checkbox"
              className="mr-2"
              checked={gstIncluded}
              onChange={(e) => setGstIncluded(e.target.checked)}
            />
            GST included in price
          </label>
        </div>
      </div>

      <div>
        <label className={labelCls}>Payment type</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              className="mr-2"
              checked={paymentType === 'on_account'}
              onChange={() => setPaymentType('on_account')}
            />
            On account
          </label>
          <label className="inline-flex items-center text-sm">
            <input
              type="radio"
              className="mr-2"
              checked={paymentType === 'cash_sale'}
              onChange={() => setPaymentType('cash_sale')}
            />
            Cash sale
          </label>
        </div>
        {fieldErrors.payment_type && <p className={errCls}>{fieldErrors.payment_type}</p>}
      </div>

      <div className="pt-4 border-t border-sage-100 flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create custom invoice'}
        </button>
      </div>
    </form>
  )
}
