# GST Return — 1 April to 30 September 2026

**Sano Limited** · Prepared 5 October 2026
Prepared for Tax Action (John / Jason) from the Sano portal records.

> **This is a record pack, not a return.** The figures below are what the
> portal's records add up to. The return itself, the filing basis, and the
> treatment of the open items are your call.

---

## 1. Summary — GST position

The amount depends on which basis Sano files on, and **that is not yet
confirmed**. Both are shown.

| | Payments basis | Invoice basis |
|---|---|---|
| Gross sales | $60,544.94 | $74,289.44 |
| **GST collected (output)** | **$7,824.12** | **$9,616.88** |
| **GST on expenses (input)** | **−$2,250.56** | **−$2,250.56** |
| **Net GST payable** | **$5,573.56** | **$7,366.32** |

**Difference: $1,792.76.** Confirming the basis is the single most material
open question in this return.

*Payments basis counts invoices by the date money was received; invoice basis
by the date the invoice was issued. The $13,744.50 of sales difference is
invoices issued in the period whose payment falls outside it — 29 invoices
totalling $13,125 were still unpaid at 30 September, with the balance paid
after period end.*

---

## 2. Income

Source: `invoices` (excluding deleted and test records).

| Status | Count | Gross |
|---|---|---|
| Paid | 124 | $61,164.44 |
| Sent (unpaid at 30 Sep) | 29 | $13,125.00 |
| **Total issued in period** | **153** | **$74,289.44** |

All but two invoices in the period are GST-inclusive.

---

## 3. Expenses and input GST

Source: `expenses`. 43 records, $26,807.44, **$2,250.56 of claimable GST**.

| Category | Rows | Total | GST claimable |
|---|---|---|---|
| Contractor payments | 19 | $16,670.00 | **$1,621.96** |
| Capital expense (laptop) | 1 | $2,698.00 | $351.91 |
| Materials / supplies (uniforms) | 1 | $863.19 | $112.59 |
| Insurance | 7 | $543.21 | $70.85 |
| Rubbish removal | 3 | $305.22 | $39.81 |
| Software / subscriptions | 3 | $265.94 | $34.69 |
| Marketing | 1 | $67.73 | $8.83 |
| Telecommunications | 1 | $50.00 | $6.52 |
| Equipment | 1 | $25.99 | $3.39 |
| Wages / payroll (employee) | 4 | $2,318.16 | **$0.00** |
| Reimbursement to business | 1 | $2,000.00 | **$0.00** |
| Owner capital introduced | 1 | $1,000.00 | **$0.00** |
| **Total** | **43** | **$26,807.44** | **$2,250.56** |

*(The category rows sum to $2,250.55; the $2,250.56 total is computed on the
unrounded amounts. A 1c rounding difference.)*

The last three are deliberately $0.00 — see §4.

---

## 4. Corrections made before this return

Three categorisation errors were found and fixed. Flagging them rather than
presenting corrected figures silently.

### 4.1 Contractor payments were recorded as wages

19 payments to contractors had been filed under "wages / payroll". Employee
wages are outside the GST system; a GST-registered contractor's invoice carries
claimable GST. Collapsing both into one category made the expense records
unable to answer how much GST was claimable.

They are now a separate `contractor_payment` category. **$1,621.96** of input
GST sits here — the largest single credit in the return.

Verified GST registrations, per contractor declarations held in the portal:

| Contractor / entity | GST number | Status |
|---|---|---|
| VMK LTD (Kritika / Anishal Kumar) | 130-908-969 | Registered |
| Export and Import Trades Ltd (Upasni Devi) | 138-176-371 | Registered |
| Moi-Ra Limited (Marina Rabangaki) | 135-712-264 | Registered |
| MOU VALOUR BUILDING LIMITED (Lose Kalekale) | 137856395 | Registered |
| Jess (Nasrin Maleki) | 094-996-619 | Registered |
| Myrtle McGoon | — | **Verified NOT registered** (from 28 Apr 2026) |
| Bambi Peagram | — | No record on file |
| Peter Browne | — | Not registered (confirmed by owner) |

Payments to the last three carry **no** GST claim.

### 4.2 GST was being claimed on items that are not supplies

$703.11 of input GST had been claimed on transactions that can never carry it:

| Item | Amount | GST wrongly claimed |
|---|---|---|
| Owner capital introduced (18 Apr) | $1,000.00 | $130.43 |
| "Reimbursement to the business" (11 Jun) | $2,000.00 | $260.87 |
| Employee wages (Carol) + non-registered contractors | $2,318.16 + | $311.81 |
| **Total removed** | | **$703.11** |

All now recorded as GST-exclusive. The portal was also changed so these
categories cannot carry a GST claim at all, regardless of data entry.

### 4.3 IRD payments

10 IRD transactions (PAYE and conversion fees, Aug–Sep, $806.62 total) were
**never** entered as expenses, so no incorrect claim was made. They remain
unrecorded as expenses, which is correct — PAYE remitted is money held on
behalf, neither deductible nor GST-claimable.

---

## 5. Bank reconciliation status

75 debits in the period.

| | Count | Note |
|---|---|---|
| Recorded as an expense | 41 | In the expenses table |
| Already paid via remittance or pay run | 15 | Contractor remittances + employee pay runs — **not** expenses |
| Not recorded | 19 | Breakdown below |

**The 15 "paid elsewhere" are deliberately not expenses.** A contractor's cost
is already recorded through `contractor_invoices` and its remittance; an
employee's wages through `pay_runs`. Entering them as expenses as well would
double-count roughly $22,000 of cost and double-claim its GST.

### The 19 not recorded

| What | Count | Value | Treatment |
|---|---|---|---|
| IRD PAYE payments | 7 | $798.00 | Not an expense (money held on behalf) |
| IRD conversion fees | 3 | $4.62 | Bank fees; immaterial |
| KiwiSaver transfer (Carol) | 1 | $42.00 | Not an expense |
| Carol — combined wage transfers | 3 | $2,758.08 | Wages, already in pay runs; see note |
| Carol — mileage reimbursement | 1 | $180.00 | Reimbursement via payroll |
| Myrtle — contractor payment | 1 | $1,139.00 | Contractor payment; see §6 |
| Personal (likely) | 2 | $50.91 | Vapeys $40.00, Saigon Bakery $10.91 |
| Peter Browne labour | 1 | $700.00 | **Now entered** as a contractor payment, no GST |

**Note on Carol's combined transfers.** Each weekly pay run is $505.50 net, but
several weeks (sometimes plus mileage) were transferred as a single payment:
$1,501.20, $630.30 and $626.58. The underlying pay runs are all recorded and
paid; only the bank-line-to-pay-run match is unresolved, because one bank line
covers several records. No wages are missing or unrecorded.

---

## 6. Open questions for Tax Action

1. **Filing basis — payments or invoice?** Worth **$1,792.76**. Nothing else in
   this return matters as much.
2. **The $2,000 "reimbursement to the business" (11 Jun).** Recorded as an
   expense but it is money *in* — the owner repaying the company for part of a
   $2,698 laptop. GST has been zeroed; the correct accounting treatment
   (offset against the asset, or equity) is yours to decide.
3. **Myrtle McGoon $1,139 (3 Sep).** A contractor payment not yet matched to a
   remittance. She is verified not GST-registered, so no GST either way.
4. **Two likely-personal transactions** ($40.00 Vapeys, $10.91 Saigon Bakery).
   Excluded on the assumption they are personal; confirm.
5. **Bambi Peagram, $385 total.** Paid as a contractor with no GST record. If
   she is in fact registered, a claim of approximately $50 is being forgone.

---

## 7. Records provided

| Export | Contents |
|---|---|
| `invoices-csv` | Every invoice issued 1 Apr – 30 Sep, with GST flag |
| `expenses-csv` | All 43 expense records, with category and GST flag |
| `contractor-payments-csv` | Contractor payables and their GST status |
| `cash-out-csv` | Bank debits, for tying records to bank movements |
| ASB statements | Source documents, 1 Apr – 30 Sep |

John and Jason also hold read-only access to the portal's finance area and can
view all of the above live.

---

## 8. Basis of preparation

- Figures come from the Sano portal (Supabase) as at 5 October 2026.
- GST is computed as 3/23 of a GST-inclusive amount, the standard NZ 15% method.
- Expenses are counted by `expense_date`; income by `date_issued` (invoice
  basis) or `date_paid` (payments basis).
- Deleted and test records are excluded throughout.
- No GST has been claimed on employee wages, IRD remittances, owner capital, a
  director loan, or payments to non-GST-registered contractors.
- **Nothing here has been reviewed by an accountant.** The corrections in §4
  were made to the records, not to a filed return, and the open items in §6
  remain unresolved.
