// Phase G.2 step 5 — soft Contractor Payables transition note.
//
// Informational only. Sits at the top of the contractor-invoices
// list and detail pages to set context: this area tracks contractor
// payable records of both kinds (contractor-supplied invoices and
// internal payables generated from approved job hours), and the
// future direction is to connect it more tightly to job approvals
// and the contractor pay-run flow.
//
// Hard rules carried from the Phase G.2 spec §3.8 + §9:
//   - No "legacy" wording. No "deprecated". No "read-only".
//   - Calm sage styling (not warning amber, not error red).
//   - All actions on the surface stay enabled — this is a note, not
//     a gate.
//   - No route rename. No data hidden.

export function PayablesTransitionNote() {
  return (
    <div className="bg-sage-50 border-l-4 border-sage-500 rounded-r-lg px-4 py-3 mb-6 text-sm text-sage-700">
      This area tracks contractor payable records. Some are based on
      contractor-supplied invoices, and some may be generated internally
      from approved job hours. Future updates will connect this area
      more directly to job approvals and contractor pay runs.
    </div>
  )
}
