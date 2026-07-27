// Professional A4 payslip. Renders ONLY from an immutable PayslipSnapshot — no
// live employee/employer lookups. Employer KiwiSaver sits in its own section so
// it can never be mistaken for a deduction from net pay. `preview` shows an
// unstored, clearly-labelled draft (payment "Not yet paid").

import type { PayslipSnapshot } from '@/lib/payroll/payslip-snapshot'

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

const CSS = `
  :root { --ink:#22312a; --muted:#6b7a72; --green:#2f5d4e; --line:#e4eae7; --bg:#ffffff; }
  * { box-sizing: border-box; }
  .ps { font-family: 'Poppins','Outfit','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color: var(--ink); background: var(--bg); }
  @page { size: A4 portrait; margin: 0; }
  .ps-page { width: 210mm; min-height: 297mm; margin: 0 auto; background:#fff; padding: 18mm 16mm; position: relative; }
  .ps-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid var(--green); padding-bottom: 10mm; }
  .ps-logo { height: 15mm; }
  .ps-org { font-size: 10pt; color: var(--muted); margin-top: 2mm; line-height:1.5; }
  .ps-title { font-size: 20pt; font-weight: 700; color: var(--green); letter-spacing: -0.5px; }
  .ps-meta { text-align:right; font-size: 9.5pt; color: var(--muted); line-height: 1.7; }
  .ps-meta strong { color: var(--ink); }
  .ps-status { display:inline-block; font-size: 8.5pt; font-weight:600; border-radius: 999px; padding: 1mm 3mm; }
  .ps-status.paid { background:#e7f4ee; color:#1f6b4d; } .ps-status.preview { background:#fbf1dc; color:#8a6d1f; }
  .ps-section { margin-top: 9mm; }
  .ps-h { font-size: 11pt; font-weight:600; color: var(--green); margin: 0 0 3mm; }
  table.ps-t { width:100%; border-collapse: collapse; font-size: 10pt; }
  .ps-t th { text-align:left; color: var(--muted); font-weight:500; font-size: 8.5pt; text-transform:uppercase; letter-spacing:.4px; padding: 0 0 2mm; border-bottom:1px solid var(--line); }
  .ps-t td { padding: 2.4mm 0; border-bottom:1px solid var(--line); }
  .ps-t td.r, .ps-t th.r { text-align:right; }
  .ps-t tr.total td { font-weight:700; border-bottom:none; border-top: 1.5px solid var(--ink); }
  .ps-net { margin-top: 9mm; background:#f4f8f6; border:1px solid var(--line); border-radius: 4mm; padding: 6mm 7mm; display:flex; justify-content:space-between; align-items:center; }
  .ps-net .lbl { font-size: 11pt; color: var(--muted); } .ps-net .val { font-size: 22pt; font-weight:800; color: var(--green); }
  .ps-note { font-size: 8.5pt; color: var(--muted); font-style: italic; margin-top: 2.5mm; }
  .ps-foot { position:absolute; bottom: 12mm; left:16mm; right:16mm; border-top:1px solid var(--line); padding-top: 4mm; font-size: 8pt; color: var(--muted); display:flex; justify-content:space-between; gap: 6mm; }
  .ps-watermark { position:absolute; top: 120mm; left:0; right:0; text-align:center; font-size: 60pt; font-weight:800; color: rgba(138,109,31,0.08); transform: rotate(-20deg); letter-spacing: 8px; }
`

export function PayslipDocument({ snapshot, preview = false, reviewCopy = false }: { snapshot: PayslipSnapshot; preview?: boolean; reviewCopy?: boolean }) {
  const s = snapshot
  // reviewCopy = the official paid look, read-only (not the retained document).
  const paid = s.payment.paid && !preview
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ps">
        <div className="ps-page">
          {preview && <div className="ps-watermark">PREVIEW</div>}

          {/* Header */}
          <div className="ps-head">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ps-logo" src={s.employer.logoRef} alt="Sano" />
              <div className="ps-org">{s.employer.legalName}<br />{s.employer.address}</div>
            </div>
            <div>
              <div className="ps-title">Payslip</div>
              <div className="ps-meta">
                <div><strong>{s.employee.displayName}</strong></div>
                <div>Pay period {fmtDate(s.run.periodStart)} – {fmtDate(s.run.periodEnd)}</div>
                <div>Pay date {fmtDate(s.run.payDate)}</div>
                <div style={{ marginTop: '2mm' }}><span className={`ps-status ${paid ? 'paid' : 'preview'}`}>{paid ? 'Paid' : 'Not yet paid'}</span></div>
                <div style={{ marginTop: '2mm', fontSize: '8pt' }}>{preview ? 'Preview — not an official payslip' : `Ref ${s.reference} · v${s.version}`}</div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="ps-section">
            <h2 className="ps-h">Earnings</h2>
            <table className="ps-t">
              <thead><tr><th>Description</th><th className="r">Hours</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {s.earnings.lines.map((l, i) => (
                  <tr key={i}><td>{l.description}</td><td className="r">{l.hours != null ? l.hours.toFixed(2) : '—'}</td><td className="r">{l.rate != null ? money(l.rate) : '—'}</td><td className="r">{money(l.amount)}</td></tr>
                ))}
                <tr className="total"><td>Gross earnings</td><td className="r"></td><td className="r"></td><td className="r">{money(s.earnings.gross)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Employee deductions */}
          <div className="ps-section">
            <h2 className="ps-h">Employee deductions</h2>
            <table className="ps-t">
              <thead><tr><th>Description</th><th className="r">Amount</th></tr></thead>
              <tbody>
                <tr><td>PAYE (includes ACC earner levy)</td><td className="r">{money(s.deductions.paye)}</td></tr>
                <tr><td>Employee KiwiSaver ({s.deductions.employeeKsRate}%)</td><td className="r">{money(s.deductions.employeeKsAmount)}</td></tr>
                <tr className="total"><td>Total deductions</td><td className="r">{money(s.deductions.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Net pay */}
          <div className="ps-net">
            <span className="lbl">Net pay</span>
            <span className="val">{money(s.deductions.net)}</span>
          </div>

          {/* Payment details */}
          <div className="ps-section">
            <h2 className="ps-h">Payment</h2>
            <table className="ps-t">
              <tbody>
                <tr><td>Payment status</td><td className="r">{paid ? 'Paid' : 'Not yet paid'}</td></tr>
                {paid && <tr><td>Payment date</td><td className="r">{fmtDate(s.payment.paymentDate)}</td></tr>}
                {paid && <tr><td>Method</td><td className="r">{s.payment.paymentMethod ?? '—'}</td></tr>}
                {paid && <tr><td>Reference</td><td className="r">{s.payment.paymentReference ?? '—'}</td></tr>}
                {s.employee.maskedBankAccount && <tr><td>Paid to</td><td className="r">{s.employee.maskedBankAccount}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Employer contributions — SEPARATE */}
          <div className="ps-section">
            <h2 className="ps-h">Employer contributions</h2>
            <table className="ps-t">
              <tbody>
                <tr><td>Gross employer KiwiSaver ({s.employerContributions.ksRate}%)</td><td className="r">{money(s.employerContributions.ksGross)}</td></tr>
                {s.employerContributions.esct != null && <tr><td>Less ESCT</td><td className="r">{money(s.employerContributions.esct)}</td></tr>}
                {s.employerContributions.ksNet != null && <tr className="total"><td>Net employer KiwiSaver contribution</td><td className="r">{money(s.employerContributions.ksNet)}</td></tr>}
              </tbody>
            </table>
            <p className="ps-note">Employer contributions are paid in addition to gross wages and are not deducted from your net pay.</p>
          </div>

          {/* Footer */}
          <div className="ps-foot">
            <span>{s.employer.tradingName} · {s.employer.payrollEmail} · Please contact us if anything on this payslip appears incorrect.{reviewCopy ? ' · Review copy — not the retained payslip.' : ''}</span>
            <span>{preview ? 'Preview' : `Ref ${s.reference}`} · Generated {fmtDate(s.generatedAt.slice(0, 10))}</span>
          </div>
        </div>
      </div>
    </>
  )
}
