// Accountant pack → Excel workbook (one sheet per ledger).

import { addKeyValueSheet, addTableSheet, workbookBuffer, type CellValue } from '@/lib/xlsx-workbook'
import type { AccountantPack } from './accountant-pack'

export async function accountantPackWorkbook(pack: AccountantPack, generatedAt: string): Promise<Buffer> {
  const { from, to, pl, totals } = pack
  const period = `${from} to ${to}`

  return workbookBuffer((wb) => {
    addKeyValueSheet(wb, {
      name: 'Summary',
      lines: [
        ['Sano — accountant pack'],
        ['Period', period],
        ['Generated', generatedAt],
        ['Currency', 'NZD'],
        [''],
        ['Sales (invoice basis — issued in period)'],
        ['Sales excl GST', totals.salesExGst],
        ['GST on sales', totals.salesGst],
        ['Sales incl GST', totals.salesInclGst],
        ['Received from customers (incl GST)', totals.receivedInclGst, 'Payments basis — invoices paid in the period'],
        [`Owed by customers at ${pack.asAt} (incl GST)`, totals.receivablesInclGst, 'See Receivables sheet for ageing'],
        [''],
        ['Profit & loss — cash basis, GST-inclusive (management view)'],
        ['Income received', pl.income],
        ['Contractor remittances paid', -pl.remittancesTotal],
        ['Other contractor payments (expenses)', -pl.otherContractorTotal],
        ['Gross profit', pl.grossProfit, `${pl.grossMarginPct}% margin`],
        ...pl.operatingExpenses.map((l) => [`  ${l.label}`, -l.total, `${l.count} items`] as [string, CellValue, string]),
        ['Total operating expenses', -pl.operatingExpensesTotal],
        ['Net profit / (loss)', pl.netProfit, `${pl.netMarginPct}% of income`],
        ...(pl.belowLine.length > 0
          ? [['Below the line (not in profit) — confirm treatment'] as [string], ...pl.belowLine.map((l) => [`  ${l.label}`, l.total, `${l.count} items`] as [string, CellValue, string])]
          : []),
        ...(pl.duplicatesExcludedCount > 0
          ? [['Excluded: contractor expenses duplicating a remittance', pl.duplicatesExcludedTotal, `${pl.duplicatesExcludedCount} items — not counted twice`] as [string, CellValue, string]]
          : []),
        [''],
        ['GST'],
        ['GST claimable on purchases (by payment date)', totals.purchasesGst, 'Expenses + GST-registered contractors; see GST summary sheet'],
        [''],
        ['Contractors owed now (approved, unpaid)', totals.contractorPayablesTotal, 'As at the generated date, not the period end'],
        ['Items needing attention', pack.attention.length, 'See the Needs attention sheet'],
        [''],
        ['How to read this pack'],
        ['Profit & loss', '', 'Cash basis: income when received, costs when paid. GST-inclusive. Working management view, not a filed statement.'],
        ['Contractor cost', '', 'Paid remittances (the record of contractor pay) plus contractor payments made outside remittances.'],
        ['Contractor GST', '', 'Only where the contractor invoice has a verified GST status of "applied". Not-assessed payments show $0 GST.'],
        ['Sales GST', '', 'Shown on both invoice basis (issue date) and payments basis (paid date). Use whichever basis Sano files on.'],
        ['Employee wages', '', 'Payroll sheet = paid employee pay runs (the record of wages). The P&L wages line comes from Expenses and may not match — see Needs attention.'],
      ],
    })

    addTableSheet(wb, {
      name: 'Needs attention',
      intro: [`Needs attention — ${period}`, 'Things to resolve or confirm before the books are final.'],
      columns: [
        { header: 'Area', key: 'area', width: 14 },
        { header: 'Issue', key: 'issue', width: 60 },
        { header: 'Count', key: 'count', kind: 'number', width: 8 },
        { header: 'Amount', key: 'amount', kind: 'money' },
        { header: 'Action', key: 'action', width: 70 },
      ],
      rows: pack.attention.map((a) => ({ ...a })),
    })

    addTableSheet(wb, {
      name: 'Sales invoices',
      intro: [`Sales invoices issued — ${period}`, 'Drafts and cancelled invoices excluded. GST split uses the same maths as the invoice PDF.'],
      columns: [
        { header: 'Invoice', key: 'invoice' },
        { header: 'Client', key: 'client', width: 34 },
        { header: 'Issued', key: 'issued', kind: 'date' },
        { header: 'Due', key: 'due', kind: 'date' },
        { header: 'Status', key: 'status' },
        { header: 'Paid', key: 'paid', kind: 'date' },
        { header: 'Prices entered', key: 'entered' },
        { header: 'Excl GST', key: 'exGst', kind: 'money', total: true },
        { header: 'GST', key: 'gst', kind: 'money', total: true },
        { header: 'Incl GST', key: 'incl', kind: 'money', total: true },
      ],
      rows: pack.sales,
    })

    addTableSheet(wb, {
      name: 'Payments received',
      intro: [`Customer payments received — ${period}`],
      columns: [
        { header: 'Paid', key: 'paid', kind: 'date' },
        { header: 'Invoice', key: 'invoice' },
        { header: 'Client', key: 'client', width: 34 },
        { header: 'Method', key: 'method' },
        { header: 'Excl GST', key: 'exGst', kind: 'money', total: true },
        { header: 'GST', key: 'gst', kind: 'money', total: true },
        { header: 'Incl GST', key: 'incl', kind: 'money', total: true },
      ],
      rows: pack.received,
    })

    addTableSheet(wb, {
      name: 'Receivables',
      intro: [`Owed by customers at ${pack.asAt}`, 'Issued on or before that date and not paid by then (the period end, or today if the period is still open). Age = days past due.'],
      columns: [
        { header: 'Invoice', key: 'invoice' },
        { header: 'Client', key: 'client', width: 34 },
        { header: 'Issued', key: 'issued', kind: 'date' },
        { header: 'Due', key: 'due', kind: 'date' },
        { header: 'Age', key: 'age' },
        { header: 'Amount incl GST', key: 'incl', kind: 'money', total: true },
      ],
      rows: pack.receivables,
    })

    addTableSheet(wb, {
      name: 'Expenses',
      intro: [`Expenses — ${period}`, 'GST = 3/23 of GST-inclusive amounts; $0 for wages, IRD, loans and owner capital.'],
      columns: [
        { header: 'Date', key: 'date', kind: 'date' },
        { header: 'Category', key: 'category', width: 30 },
        { header: 'Vendor', key: 'vendor', width: 28 },
        { header: 'Description', key: 'description', width: 36 },
        { header: 'Amount', key: 'amount', kind: 'money', total: true },
        { header: 'GST', key: 'gst', kind: 'money', total: true },
        { header: 'Excl GST', key: 'exGst', kind: 'money', total: true },
        { header: 'Treatment', key: 'treatment', width: 34 },
        { header: 'Bank reference', key: 'reference', width: 30 },
        { header: 'Receipt', key: 'receipt', width: 9 },
      ],
      rows: pack.expenses,
    })

    addTableSheet(wb, {
      name: 'Contractor payments',
      intro: [`Contractor payments (remittances) — ${period}`, 'GST only where the contractor invoice is verified "applied". Withholding tax shown where deducted.'],
      columns: [
        { header: 'Paid', key: 'paid', kind: 'date' },
        { header: 'Remittance', key: 'remittance' },
        { header: 'Bank reference', key: 'reference', width: 28 },
        { header: 'Contractor', key: 'contractor', width: 28 },
        { header: 'GST number', key: 'gstNumber' },
        { header: 'Job / item', key: 'job', width: 24 },
        { header: 'Amount paid', key: 'amount', kind: 'money', total: true },
        { header: 'GST', key: 'gst', kind: 'money', total: true },
        { header: 'Excl GST', key: 'exGst', kind: 'money', total: true },
        { header: 'Withholding tax', key: 'wht', kind: 'money', total: true },
        { header: 'GST status', key: 'gstStatus' },
      ],
      rows: pack.contractorPayments,
    })

    addTableSheet(wb, {
      name: 'Contractors owed',
      intro: ['Approved contractor invoices not yet paid', `As at ${generatedAt.slice(0, 10)} (current, not the period end).`],
      columns: [
        { header: 'Invoice', key: 'invoice' },
        { header: 'Contractor', key: 'contractor', width: 28 },
        { header: 'Service date', key: 'serviceDate', kind: 'date' },
        { header: 'Submitted', key: 'submitted', kind: 'date' },
        { header: 'Amount', key: 'amount', kind: 'money', total: true },
        { header: 'GST', key: 'gst', kind: 'money', total: true },
        { header: 'GST status', key: 'gstStatus' },
      ],
      rows: pack.contractorPayables,
    })

    addTableSheet(wb, {
      name: 'Payroll',
      intro: [`Employee payroll (paid pay runs) — ${period}`],
      columns: [
        { header: 'Pay date', key: 'payDate', kind: 'date' },
        { header: 'Period start', key: 'periodStart', kind: 'date' },
        { header: 'Period end', key: 'periodEnd', kind: 'date' },
        { header: 'Employee', key: 'employee', width: 24 },
        { header: 'Hours', key: 'hours', kind: 'number', total: true },
        { header: 'Gross', key: 'gross', kind: 'money', total: true },
        { header: 'Holiday pay', key: 'holidayPay', kind: 'money', total: true },
        { header: 'PAYE', key: 'paye', kind: 'money', total: true },
        { header: 'Student loan', key: 'studentLoan', kind: 'money', total: true },
        { header: 'KiwiSaver (employee)', key: 'ksEmployee', kind: 'money', total: true },
        { header: 'KiwiSaver (employer)', key: 'ksEmployer', kind: 'money', total: true },
        { header: 'ESCT', key: 'esct', kind: 'money', total: true },
        { header: 'Net pay', key: 'net', kind: 'money', total: true },
        { header: 'Mileage reimbursed', key: 'mileage', kind: 'money', total: true },
        { header: 'Payday filing', key: 'filing' },
      ],
      rows: pack.payroll,
    })

    addTableSheet(wb, {
      name: 'GST summary',
      intro: [`GST by month — ${period}`, 'Positive net = GST to pay; negative = refund. Pick the column matching Sano’s GST basis.'],
      columns: [
        { header: 'Month', key: 'month' },
        { header: 'Sales GST (invoice basis)', key: 'salesGstInvoiceBasis', kind: 'money', total: true },
        { header: 'Sales GST (payments basis)', key: 'salesGstPaymentsBasis', kind: 'money', total: true },
        { header: 'Purchases GST — expenses', key: 'purchasesGstExpenses', kind: 'money', total: true },
        { header: 'Purchases GST — contractors', key: 'purchasesGstContractors', kind: 'money', total: true },
        { header: 'Net GST (invoice basis)', key: 'netInvoiceBasis', kind: 'money', total: true },
        { header: 'Net GST (payments basis)', key: 'netPaymentsBasis', kind: 'money', total: true },
      ],
      rows: pack.gst.map((g) => ({ ...g })),
    })

    addTableSheet(wb, {
      name: 'Bank transactions',
      intro: [`Bank transactions imported — ${period}`],
      columns: [
        { header: 'Date', key: 'date', kind: 'date' },
        { header: 'Account', key: 'account' },
        { header: 'Type', key: 'type' },
        { header: 'Payee', key: 'payee', width: 30 },
        { header: 'Memo', key: 'memo', width: 36 },
        { header: 'Amount', key: 'amount', kind: 'money', total: true },
        { header: 'Reconciled', key: 'reconciled', width: 11 },
      ],
      rows: pack.bank,
    })

    addTableSheet(wb, {
      name: 'Mileage',
      intro: [`Mileage log — ${period}`],
      columns: [
        { header: 'Date', key: 'date', kind: 'date' },
        { header: 'Person', key: 'person', width: 20 },
        { header: 'Purpose', key: 'purpose', width: 40 },
        { header: 'Km', key: 'km', kind: 'number', total: true },
        { header: 'Rate / km', key: 'rate', kind: 'money' },
        { header: 'Reimbursement', key: 'amount', kind: 'money', total: true },
        { header: 'Status', key: 'status' },
      ],
      rows: pack.mileage,
    })
  })
}
