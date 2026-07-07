// Casual Employment Agreement content (Sano Property Services Limited).
//
// Reproduced faithfully from the reviewed template, WITH the three compliance
// additions flagged in review: a Place of Work clause, a Rest & Meal Breaks
// clause, and the 90-day personal-grievance reference in Dispute Resolution.
//
// ⚠️ This is still a template — have an employment lawyer confirm before use.
// The numbered clauses are static; the parties/details come from the record.

export const EMPLOYER = {
  name: 'Sano Property Services Limited',
  gstNo: '148-387-648',
  address: '35 Holbrook Street, Blockhouse Bay',
}

export type AgreementType = 'casual_employee' | 'contractor'

export interface AgreementSection {
  title: string
  body: string[]
}

export function agreementTitle(type: AgreementType): string {
  return type === 'contractor' ? 'Independent Contractor Agreement' : 'Casual Employment Agreement'
}

export function agreementSections(type: AgreementType): AgreementSection[] {
  return type === 'contractor' ? CONTRACTOR_AGREEMENT_SECTIONS : CASUAL_AGREEMENT_SECTIONS
}

export const CASUAL_AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: 'Background',
    body: [
      'The Employer is in the business of providing property services, including cleaning and related services. The Employer may, from time to time, offer the Employee casual work when a genuine need for additional labour arises. The Employee is not obliged to accept any offer of work, and the Employer is not obliged to offer any minimum number of hours.',
      'This Agreement is a casual employment agreement under the Employment Relations Act 2000. The Employee is an employee of the Employer for the purposes of any accepted engagement, but there is no expectation of ongoing or regular work.',
    ],
  },
  {
    title: '1. Nature of Employment',
    body: [
      '1.1 The Employee is employed on a casual basis. There is no guaranteed minimum number of hours of work and no expectation of ongoing, regular, or systematic employment.',
      '1.2 Work will be offered by the Employer as and when it arises. The Employee may accept or decline any offer of work at their discretion.',
      '1.3 Each period of work accepted by the Employee constitutes a separate engagement under this Agreement.',
      '1.4 This Agreement does not create an obligation on the Employer to offer work, nor on the Employee to accept it.',
    ],
  },
  {
    title: '2. Role and Duties',
    body: [
      '2.1 The Employee is engaged as a Cleaner (Casual). The Employee will perform cleaning and property service tasks as directed by the Employer from time to time.',
      '2.2 The Employee must perform their duties to a professional standard and in accordance with any reasonable instructions, policies, or procedures communicated by the Employer.',
      '2.3 The Employer may vary the Employee’s duties from time to time, provided the variation is reasonable and within the general scope of the Employee’s role.',
    ],
  },
  {
    title: '3. Place of Work',
    body: [
      '3.1 The Employee’s work is performed at various client premises across the Auckland region, and at the Employer’s base as required. The specific location(s) for each engagement will be advised by the Employer at the time work is offered.',
    ],
  },
  {
    title: '4. Hours of Work',
    body: [
      '4.1 There are no guaranteed or minimum hours of work under this Agreement.',
      '4.2 When work is offered and accepted, hours will be agreed between the parties at the time of each engagement.',
      '4.3 The Employer will endeavour to give reasonable notice of available work, though this may not always be possible given the nature of casual work.',
    ],
  },
  {
    title: '5. Rest and Meal Breaks',
    body: [
      '5.1 The Employee is entitled to paid rest breaks and unpaid meal breaks in accordance with the Employment Relations Act 2000, based on the length of the engagement worked.',
      '5.2 The timing of breaks will be agreed between the parties, or, failing agreement, will be as reasonably directed by the Employer having regard to the nature of the work.',
    ],
  },
  {
    title: '6. Remuneration',
    body: [
      '6.1 The Employee will be paid at the hourly rate set out in the details above, which includes an 8% holiday pay component paid in accordance with clause 8.2 below.',
      '6.2 The hourly rate must be no less than the applicable minimum wage under the Minimum Wage Act 1983 (as amended from time to time). The Employer will review the rate whenever the minimum wage is updated.',
      '6.3 The Employee will be paid by direct credit to their nominated bank account. Pay periods and payment dates will be confirmed at the time of each engagement.',
      '6.4 The Employer will deduct PAYE tax and any KiwiSaver contributions in accordance with the Employee’s IRD obligations and any KiwiSaver election.',
    ],
  },
  {
    title: '7. KiwiSaver',
    body: [
      '7.1 The Employee may be eligible to enrol in KiwiSaver in accordance with the KiwiSaver Act 2006.',
      '7.2 Where the Employee is a new employee and eligible, the Employer will provide the required KiwiSaver information and, if applicable, make compulsory employer contributions as required by law.',
      '7.3 The Employee should notify the Employer of their KiwiSaver status and any election to opt out. A new employee may opt out by filing an opt-out request (KS10) between day 14 and day 56 of starting.',
    ],
  },
  {
    title: '8. Holidays and Leave',
    body: [
      '8.1 As a casual employee, the Employee’s entitlements under the Holidays Act 2003 are as follows: Annual Holidays — 8% of gross earnings as holiday pay, paid in accordance with clause 8.2. Public Holidays — the Employee is entitled to be paid for a public holiday if they work on that day, and to an alternative holiday if the public holiday falls on a day they would otherwise have worked. Sick Leave and Bereavement Leave — in accordance with the Holidays Act 2003, assessed on a case-by-case basis given the casual nature of employment.',
      '8.2 Holiday pay of 8% of gross earnings will be paid with each pay, rather than accrued. This reflects the irregular and casual nature of the employment, consistent with section 28 of the Holidays Act 2003. The Employer will clearly identify the holiday pay component on each payslip.',
    ],
  },
  {
    title: '9. Health and Safety',
    body: [
      '9.1 The Employer will take all reasonably practicable steps to ensure the Employee’s health and safety at work, in accordance with the Health and Safety at Work Act 2015.',
      '9.2 The Employee must take reasonable care for their own health and safety and that of others, follow all lawful health and safety instructions, and report any hazard, incident, or injury to the Employer promptly.',
      '9.3 The Employee must not attend work while unfit due to illness, injury, fatigue, or any other condition that may affect their ability to work safely.',
    ],
  },
  {
    title: '10. Confidentiality',
    body: [
      '10.1 The Employee must keep confidential all information about the Employer’s business, clients, pricing, systems, and operations that is not publicly available, and must not use it for any purpose other than performing their duties. This obligation survives termination.',
    ],
  },
  {
    title: '11. Conduct and Termination',
    body: [
      '11.1 The Employee must conduct themselves professionally and respectfully at all times, including at client premises, and comply with any reasonable workplace policies communicated by the Employer.',
      '11.2 Because this is a casual agreement with no guaranteed hours, either party may end the arrangement at any time by giving reasonable notice in writing (in most cases, one week is considered reasonable). The Employer may terminate an individual engagement at any time if there is no further work available.',
      '11.3 The Employer may terminate this Agreement immediately in cases of serious misconduct, following a fair process consistent with the Employment Relations Act 2000 and the duty of good faith. On termination, the Employee must return all Employer property, and any accrued but unpaid holiday pay will be paid in the final pay.',
    ],
  },
  {
    title: '12. Good Faith and Dispute Resolution',
    body: [
      '12.1 Both parties are bound by the duty of good faith under the Employment Relations Act 2000 — to be active and constructive in maintaining a productive employment relationship, responsive and communicative, and not to act in a misleading or deceptive manner.',
      '12.2 The parties will attempt to resolve any employment relationship problem by raising it promptly and discussing it in good faith. If it cannot be resolved directly, either party may refer it to mediation through the Ministry of Business, Innovation and Employment (MBIE).',
      '12.3 If the Employee wishes to raise a personal grievance, they must do so within 90 days of the action complained of (or of it coming to their attention), in accordance with section 114 of the Employment Relations Act 2000. The Employee may seek assistance from a union representative, support person, or advocate at any stage.',
    ],
  },
  {
    title: '13. General',
    body: [
      '13.1 This Agreement is governed by the laws of New Zealand, including the Employment Relations Act 2000 and the Holidays Act 2003. It constitutes the entire agreement between the parties regarding the Employee’s casual employment and supersedes any prior discussions.',
      '13.2 Any variation must be agreed in writing by both parties. If any provision is found unenforceable, the remaining provisions continue in full force. The Employee acknowledges they have had the opportunity to seek independent advice before signing and have been provided with a copy to retain.',
    ],
  },
]

export const CONTRACTOR_AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: 'Background',
    body: [
      'The Company operates a property services business and wishes to engage the Contractor to provide services on the terms set out in this Agreement. The Contractor wishes to provide those services on those terms.',
      'The parties agree that this Agreement does not create an employment relationship. The Contractor is engaged as an independent contractor only.',
    ],
  },
  {
    title: '1. Nature of Relationship',
    body: [
      '1.1 The Contractor is engaged as an independent contractor and not as an employee, agent, partner, or joint venturer of the Company.',
      '1.2 Nothing in this Agreement shall be construed to create an employment relationship. The provisions of the Employment Relations Act 2000 do not apply, except as required by law.',
      '1.3 The Contractor acknowledges they have had the opportunity to seek independent legal advice before entering into this Agreement.',
      '1.4 The parties acknowledge that the real nature of their relationship is that of principal and independent contractor, and this Agreement reflects that relationship in substance and in form.',
    ],
  },
  {
    title: '2. Services',
    body: [
      '2.1 The Contractor agrees to provide cleaning services as reasonably directed by the Company from time to time (“Services”). The scope, location, and schedule of Services will be agreed between the parties for each engagement.',
      '2.2 The Contractor may decline any particular job, and the Company is under no obligation to offer any minimum number of jobs.',
      '2.3 The Contractor will perform the Services to a professional standard, in accordance with the Company’s quality guidelines. The Contractor is responsible for the manner and method by which the Services are performed, provided the required outcome and standard are met.',
      '2.4 The Contractor must attend each accepted job at the agreed time, arrive prepared with all necessary equipment, and communicate clearly and respectfully with clients. If running late or unable to attend, the Contractor must notify the Company as soon as possible (immediately where less than 24 hours’ notice).',
    ],
  },
  {
    title: '3. Equipment and Supplies',
    body: [
      '3.1 The Contractor will supply, at their own cost, all equipment, tools, and cleaning products necessary to perform the Services. All equipment must be safe, fit for purpose, and maintained in good working order.',
      '3.2 The Contractor is responsible for compliance with all health and safety requirements relating to the equipment and products they use, including under the Health and Safety at Work Act 2015.',
    ],
  },
  {
    title: '4. Fees and Payment',
    body: [
      '4.1 The Company will pay the Contractor the fee agreed for each job at the time of engagement, as set out in a job confirmation or schedule.',
      '4.2 The Contractor must submit a valid tax invoice following completion of each job (or at agreed intervals). Payment will be made within 20 working days of receipt of a valid invoice.',
      '4.3 If the Contractor is registered for GST, they must include GST on their invoices; the Company will pay the GST component in addition to the agreed fee.',
      '4.4 The Contractor is solely responsible for their own income tax obligations. The Company will not make PAYE deductions. (Any schedular-payment withholding tax that applies by law will be handled in accordance with IRD requirements.)',
      '4.5 The Contractor is solely responsible for any KiwiSaver contributions applicable to them as a self-employed person.',
    ],
  },
  {
    title: '5. Insurance',
    body: [
      '5.1 The Contractor must hold and maintain current public liability insurance of at least NZD $1,000,000 per occurrence for residential cleaning, and NZD $2,000,000 per occurrence for commercial cleaning.',
      '5.2 The Contractor must provide evidence of current insurance on request and before commencing any Services. The Company may suspend or terminate this Agreement if the Contractor fails to maintain the required cover.',
      '5.3 The Contractor acknowledges the Company’s insurance does not extend to the Contractor, their employees, subcontractors, or equipment.',
    ],
  },
  {
    title: '6. Health and Safety',
    body: [
      '6.1 The Contractor must comply with all applicable health and safety laws, including the Health and Safety at Work Act 2015, and any site-specific requirements notified by the Company or the client. The Company remains a PCBU with its own overlapping duties.',
      '6.2 The Contractor must immediately report any workplace accident, incident, or near-miss, and must not work while unfit due to illness, injury, fatigue, or any impairment affecting safe performance.',
    ],
  },
  {
    title: '7. Subcontracting',
    body: [
      '7.1 The Contractor must not subcontract any Services without the Company’s prior written consent. Where approved, the Contractor remains fully responsible for the performance and conduct of any subcontractor and must ensure they are adequately insured and vetted.',
    ],
  },
  {
    title: '8. Confidentiality and Privacy',
    body: [
      '8.1 The Contractor must keep confidential all information relating to the Company’s business, clients, pricing, systems, and operations that is not publicly available, and must not use it for any purpose other than performing the Services. This obligation survives termination.',
      '8.2 The Contractor must handle any personal information they access in the course of the Services in accordance with the Privacy Act 2020, and only for the purpose of performing the Services.',
    ],
  },
  {
    title: '9. Non-Solicitation',
    body: [
      '9.1 During the term and for 6 months after termination, the Contractor must not directly solicit or accept work from any client of the Company with whom the Contractor personally worked or had direct contact through the Company, without the Company’s prior written consent. This does not prevent the Contractor advertising their services to the general public.',
    ],
  },
  {
    title: '10. Conduct and Representation',
    body: [
      '10.1 The Contractor must conduct themselves professionally at all times when performing the Services, must not represent themselves as an employee or agent of the Company, and must not make commitments on behalf of the Company without authorisation.',
      '10.2 The Contractor must not wear or display the branding, uniforms, or markings of a competing cleaning or property services business while on a job for the Company, and must conduct themselves in a way that reflects positively on the Company.',
    ],
  },
  {
    title: '11. Term and Termination',
    body: [
      '11.1 This Agreement commences on the date set out above and continues until terminated. Either party may terminate by giving 10 working days’ written notice.',
      '11.2 The Company may terminate immediately by written notice if the Contractor breaches a material term and fails to remedy it within 5 working days, fails to maintain insurance, brings the Company’s reputation into disrepute, is convicted of a relevant offence, or becomes insolvent.',
      '11.3 On termination, the Contractor must return any Company or client property, and the confidentiality and non-solicitation obligations continue.',
    ],
  },
  {
    title: '12. Liability',
    body: [
      '12.1 The Contractor is responsible for any loss or damage caused to the Company or a client by the Contractor’s negligence, wilful act, or breach of this Agreement.',
      '12.2 The Contractor’s liability to the Company or a client for damage in connection with the Services is capped at $1,000 per incident; the Contractor must hold public liability insurance sufficient to cover claims exceeding this amount. The Company’s liability to the Contractor is limited to fees due for Services properly performed. Neither party is liable for indirect or consequential loss.',
    ],
  },
  {
    title: '13. Dispute Resolution and General',
    body: [
      '13.1 The parties must first attempt to resolve any dispute by good-faith negotiation; if unresolved within 10 working days of written notice, either party may refer it to mediation before a mutually agreed mediator. Nothing prevents a party seeking urgent interim relief from a court.',
      '13.2 This Agreement is governed by the laws of New Zealand, constitutes the entire agreement, may only be amended in writing signed by both parties, and may not be assigned by the Contractor without the Company’s consent. If any provision is unenforceable, the remainder continues in full force.',
    ],
  },
]
