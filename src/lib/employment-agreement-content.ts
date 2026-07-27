// Agreement content (Sano Property Services Limited) — casual employment and
// independent contractor.
//
// The contractor clauses were substantially revised (2026-07) against an NZ
// legal review to strengthen the contracting position under the 2026 contractor
// gateway test (clear right to determine availability, accept/decline work, and
// work for others), fix the tax section (IR330C / schedular payments), resolve
// the liability/insurance cap, narrow the non-solicitation restraint to a
// non-dealing clause, add cancellation, rectification, security, site-risk and
// mutual health-and-safety terms, and add e-signature/notices/general clauses.
//
// ⚠️ Still a template. Have a New Zealand employment / commercial lawyer confirm
// before use, and make sure the actual working arrangement matches the document
// (control, integration and economic reality still determine the relationship).
// The numbered clauses are static; the parties/details come from the record.

export const EMPLOYER = {
  name: 'Sano Property Services Limited',
  gstNo: '148-387-648',
  address: '35 Holbrook Street, Blockhouse Bay',
}

export type AgreementType = 'casual_employee' | 'permanent_employee' | 'contractor'

export interface AgreementSection {
  title: string
  body: string[]
}

export function agreementTitle(type: AgreementType): string {
  if (type === 'contractor') return 'Independent Contractor Agreement'
  if (type === 'permanent_employee') return 'Individual Employment Agreement'
  return 'Casual Employment Agreement'
}

export function agreementSections(type: AgreementType): AgreementSection[] {
  if (type === 'contractor') return CONTRACTOR_AGREEMENT_SECTIONS
  if (type === 'permanent_employee') return PERMANENT_AGREEMENT_SECTIONS
  return CASUAL_AGREEMENT_SECTIONS
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
      '12.3 If the Employee wishes to raise a personal grievance, most personal grievances must be raised within 90 days of the action complained of, or of it coming to the Employee’s attention, whichever is later. A personal grievance relating to sexual harassment must generally be raised within 12 months. These timeframes apply in accordance with section 114 of the Employment Relations Act 2000. The Employee may seek assistance from a union representative, support person, or advocate at any stage.',
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

// ⚠️ DRAFT permanent-employee template (Permanent Employee 2026). Assembled from
// the Employment NZ minimum required terms and the reviewed casual template, but
// NOT yet independently reviewed. Have an NZ employment lawyer / the Employment
// NZ agreement builder (employment.govt.nz) confirm before anyone signs. The
// variable terms (position, hours, place of work, rate, pay cycle, notice
// period) come from the details table on the record — the clauses reference
// "as set out in the details above".
export const PERMANENT_AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: 'Background',
    body: [
      'The Employer operates a property services business, including cleaning and related services. The Employer employs the Employee on a permanent basis in the position, and on the terms, set out in this Agreement and in the details above.',
      'This is an individual employment agreement under the Employment Relations Act 2000. The employment is ongoing (permanent) and continues until ended in accordance with this Agreement.',
    ],
  },
  {
    title: '1. Nature of Employment',
    body: [
      '1.1 The Employee is employed on a permanent basis in the position set out in the details above. Employment begins on the commencement date stated above and continues until ended in accordance with this Agreement.',
      '1.2 The Employee’s agreed hours and days of work are set out in the details above. These are regular, agreed hours; any ongoing change to them will be agreed between the parties in writing.',
      '1.3 There is no trial or probationary period under this Agreement.',
    ],
  },
  {
    title: '2. Role and Duties',
    body: [
      '2.1 The Employee is employed in the position set out in the details above and will perform the duties of that role, together with any other reasonable duties within their skills and experience as directed by the Employer.',
      '2.2 The Employee must perform their duties to a professional standard and in accordance with any reasonable instructions, policies and procedures communicated by the Employer.',
      '2.3 The Employer may vary the Employee’s duties from time to time, provided the variation is reasonable and within the general scope of the Employee’s role.',
    ],
  },
  {
    title: '3. Place of Work',
    body: [
      '3.1 The Employee’s place of work is as set out in the details above. The Employee may also be required to attend client premises or the Employer’s base from time to time as reasonably required for the role.',
    ],
  },
  {
    title: '4. Hours of Work',
    body: [
      '4.1 The Employee’s ordinary hours and days of work are set out in the details above.',
      '4.2 The Employee may be asked to work reasonable additional hours from time to time; any such hours will be agreed and paid at the Employee’s ordinary hourly rate unless otherwise agreed.',
    ],
  },
  {
    title: '5. Rest and Meal Breaks',
    body: [
      '5.1 The Employee is entitled to paid rest breaks and unpaid meal breaks in accordance with the Employment Relations Act 2000, based on the hours worked.',
      '5.2 The timing of breaks will be agreed between the parties or, failing agreement, will be as reasonably directed by the Employer having regard to the nature of the work.',
    ],
  },
  {
    title: '6. Remuneration',
    body: [
      '6.1 The Employee will be paid the hourly rate set out in the details above, for the hours worked, paid on the pay cycle set out in the details above by direct credit to the Employee’s nominated bank account.',
      '6.2 The hourly rate must be no less than the applicable adult minimum wage under the Minimum Wage Act 1983 (as amended). The Employer will review the rate whenever the minimum wage is updated.',
      '6.3 The Employer will deduct PAYE, the ACC earner levy, and any KiwiSaver contributions and other deductions required or lawfully agreed, and will provide the Employee with a payslip for each pay.',
      '6.4 The Employer will not make any deduction from the Employee’s wages without the Employee’s written consent or lawful authority, and will consult before making any deduction under a general deductions clause.',
    ],
  },
  {
    title: '7. KiwiSaver',
    body: [
      '7.1 KiwiSaver applies in accordance with the KiwiSaver Act 2006. Where the Employee is eligible and a member, the Employer will make compulsory employer contributions as required by law and deduct the Employee’s contributions at their chosen rate.',
      '7.2 A new employee who is automatically enrolled may opt out by filing an opt-out request (KS10) between day 14 and day 56 of starting. The Employee’s current KiwiSaver election is recorded in the details above.',
    ],
  },
  {
    title: '8. Annual Holidays and Leave',
    body: [
      '8.1 Annual holidays: after 12 months’ continuous employment the Employee is entitled to four weeks’ paid annual holidays under the Holidays Act 2003, accruing from the commencement date. Annual holidays are paid at the greater of the Employee’s ordinary weekly pay or average weekly earnings, as required by that Act.',
      '8.2 Sick leave: after six months’ continuous employment the Employee is entitled to 10 days’ paid sick leave per 12-month period, which may accumulate up to a maximum of 20 days, in accordance with the Holidays Act 2003.',
      '8.3 Public holidays: the Employee is entitled to a paid day off on a public holiday that falls on a day they would otherwise have worked; if they work on a public holiday they are paid at least time and a half and, where the day would otherwise be a working day, receive an alternative holiday.',
      '8.4 Bereavement leave and family violence leave apply in accordance with the Holidays Act 2003 and the Domestic Violence — Victims’ Protection Act 2018.',
    ],
  },
  {
    title: '9. Health and Safety',
    body: [
      '9.1 The Employer will take all reasonably practicable steps to ensure the Employee’s health and safety at work, in accordance with the Health and Safety at Work Act 2015.',
      '9.2 The Employee must take reasonable care for their own health and safety and that of others, follow all lawful health and safety instructions, and report any hazard, incident or injury to the Employer promptly.',
      '9.3 The Employee must not attend work while unfit due to illness, injury, fatigue or any other condition that may affect their ability to work safely.',
    ],
  },
  {
    title: '10. Confidentiality',
    body: [
      '10.1 The Employee must keep confidential all information about the Employer’s business, clients, pricing, systems and operations that is not publicly available, and must not use it for any purpose other than performing their duties. This obligation survives termination.',
    ],
  },
  {
    title: '11. Notice and Termination',
    body: [
      '11.1 Either party may end this employment by giving the notice period set out in the details above, in writing. The Employer may pay the Employee in lieu of notice.',
      '11.2 The Employer may terminate this Agreement immediately in cases of serious misconduct, following a fair process consistent with the Employment Relations Act 2000 and the duty of good faith.',
      '11.3 On termination the Employee must return all Employer property, and any accrued but unpaid holiday pay will be paid in the final pay.',
    ],
  },
  {
    // ⚠️ Part 6A employee-protection clause for the cleaning sector. Cleaning is
    // a category of work specified in Schedule 1A of the Employment Relations Act
    // 2000, so relevant employees are "specified employees" with a statutory
    // right to elect to transfer to an incoming provider on their existing terms
    // when the work is restructured/contracted out. Confirm this wording against
    // Employment NZ's agreement builder (employment.govt.nz) for the cleaning
    // sector before issuing — it must not be shortened below the statutory rights.
    title: '12. Employee Protection Provision — Restructuring and Contracting Out',
    body: [
      '12.1 The Employer provides cleaning services, which is a category of work specified in Schedule 1A of the Employment Relations Act 2000. If the Employer’s cleaning work, or part of it, is restructured — for example by being contracted out, sold or transferred, or where a client’s cleaning contract passes to another provider — the Employee may be a “specified employee” with rights under Subpart 1 of Part 6A of that Act.',
      '12.2 A specified employee has the right to elect to transfer to the new employer (the incoming provider) and, if they elect to do so, to continue on the same terms and conditions of employment as under this Agreement. The Employer will, within the timeframes required by Part 6A, give the Employee the information about this right and about the restructuring that the Act requires, and will give the new employer the employee-related information the Act requires so that the Employee’s continuous service and entitlements are preserved on transfer.',
      '12.3 If the Employee does not elect to transfer, or Part 6A does not apply to the particular restructuring, the Employer will follow a fair process consistent with the Employment Relations Act 2000 and the duty of good faith, and will meet any entitlements owed to the Employee under this Agreement and the law.',
    ],
  },
  {
    title: '13. Good Faith and Resolving Employment Problems',
    body: [
      '13.1 Both parties are bound by the duty of good faith under the Employment Relations Act 2000 — to be responsive and communicative, and not to act in a misleading or deceptive way.',
      '13.2 If an employment relationship problem arises, the parties will raise it promptly and try to resolve it in good faith by discussion. If it cannot be resolved directly, either party may seek mediation through the Ministry of Business, Innovation and Employment (MBIE).',
      '13.3 If the Employee wishes to raise a personal grievance, most personal grievances must be raised within 90 days of the action complained of, or of it coming to the Employee’s attention, whichever is later. A personal grievance relating to sexual harassment must generally be raised within 12 months. These timeframes apply in accordance with section 114 of the Employment Relations Act 2000. The Employee may seek assistance from a union representative, support person or advocate at any stage.',
    ],
  },
  {
    title: '14. General',
    body: [
      '14.1 This Agreement is governed by the laws of New Zealand, including the Employment Relations Act 2000 and the Holidays Act 2003. It constitutes the entire agreement between the parties regarding the Employee’s employment and supersedes any prior discussions.',
      '14.2 Any variation must be agreed in writing by both parties. If any provision is found unenforceable, the remaining provisions continue in full force. The Employee acknowledges they have had the opportunity to seek independent advice before signing and have been provided with a copy to retain. By typing their name to sign, the Employee confirms they have read, understood and agree to this Agreement.',
    ],
  },
]

export const CONTRACTOR_AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: 'Background',
    body: [
      'The Company (the Principal) operates a property services business, including residential and commercial cleaning. The Principal wishes to engage the Contractor to provide services on the terms set out in this Agreement, and the Contractor wishes to provide those services on those terms.',
      'This is a contract for services between a principal and an independent contractor. It is not a contract of employment and does not create an employment relationship.',
    ],
  },
  {
    title: '1. Nature of Relationship',
    body: [
      '1.1 The Contractor is engaged as an independent contractor carrying on their own business, and not as an employee, agent, partner or joint venturer of the Principal. The provisions of the Employment Relations Act 2000 do not apply, except as required by law.',
      '1.2 The Contractor confirms they have entered into this written agreement freely, have had a reasonable opportunity to seek independent legal and tax advice before signing, and have either taken that advice or chosen not to.',
      '1.3 The Contractor is free to provide services to other businesses and clients, including other cleaning businesses, provided this does not interfere with a job the Contractor has accepted or breach the confidentiality, security or client-protection provisions of this Agreement.',
      '1.4 The parties intend that this Agreement, and the way they operate under it, meet the requirements for a contracting relationship under New Zealand law, including any applicable statutory contractor test. The parties acknowledge that the substance of the relationship, not only its wording, determines its legal character.',
    ],
  },
  {
    title: '2. Availability, Accepting and Declining Work',
    body: [
      '2.1 The Contractor determines their own availability and may accept or decline any job offered by the Principal. The Principal is under no obligation to offer any minimum amount of work, and there is no guaranteed or regular work.',
      '2.2 The date and completion time for an accepted job will be mutually agreed. Declining a job, or making themselves unavailable, will not by itself result in termination of this Agreement or in any penalty.',
      '2.3 Once the Contractor accepts a job, they are responsible for completing it to the agreed scope, standard and timeframe. If running late or unable to attend an accepted job, the Contractor must notify the Principal as soon as possible (and immediately where less than 24 hours remain before the job).',
    ],
  },
  {
    title: '3. Services',
    body: [
      '3.1 The Contractor will provide residential and/or commercial cleaning services as agreed for each accepted job (the “Services”). The Contractor is responsible for the manner and method by which the Services are performed, provided the agreed outcome and standard are met.',
      '3.2 The Contractor will perform the Services to a professional standard and in accordance with the scope agreed for each job, and will communicate clearly and respectfully with clients.',
    ],
  },
  {
    title: '4. Job Confirmations',
    body: [
      '4.1 The Principal will confirm each job to the Contractor before it starts. A confirmation may be given by text message, email or through a job-management system, and any of these constitutes written confirmation for the purposes of this Agreement.',
      '4.2 Each job confirmation will set out, so far as practicable: the property address; the agreed scope of work; the completion deadline or access window; the fee and whether GST is included; any travel or parking payment; supplies expected to be provided; the named client contact; any known hazards; whether rectification of a prior clean is required; and any cancellation terms.',
    ],
  },
  {
    title: '5. Fees and Payment',
    body: [
      '5.1 The Principal will pay the Contractor at the agreed rate set out in the details above, or the fee agreed in the relevant job confirmation. The agreed rate is inclusive of GST. Where the Contractor is registered for GST, the agreed fee is treated as GST-inclusive and the Contractor will provide a valid tax invoice showing the GST component.',
      '5.2 The Contractor must submit a valid tax invoice following completion of each job, or at agreed intervals. The Principal will pay a valid invoice within 20 working days of receipt.',
      '5.3 The Contractor is responsible for their own income tax, GST, ACC levies, business registrations, vehicle costs and other business obligations. Where the payments are schedular payments under the Income Tax Act 2007, the Contractor must provide a completed IR330C (or a valid exemption or special tax rate certificate) before payment, and the Principal will deduct and account for withholding tax where required by law. Without a completed IR330C, the Principal may be required to deduct tax at the no-notification rate.',
      '5.4 The Contractor is responsible for any KiwiSaver contributions applicable to them as a self-employed person, and for obtaining any licences, permits or work rights required to provide the Services.',
    ],
  },
  {
    title: '6. Equipment and Supplies',
    body: [
      '6.1 Except for any supplies the Principal or client agrees to provide in a job confirmation, the Contractor will supply, at their own cost, the equipment, tools and cleaning products necessary to perform the Services. All equipment must be safe, fit for purpose and maintained in good working order.',
      '6.2 The Contractor is responsible for compliance with all health and safety and product-handling requirements relating to the equipment and products they use.',
    ],
  },
  {
    title: '7. Cancellations and Access',
    body: [
      '7.1 If an accepted job is cancelled with less than 24 hours’ notice, if access to the property is not made available, or if the property materially differs from the agreed scope (for example, it is materially worse than described or lacks working utilities), the Contractor may charge any cancellation, travel or additional fee agreed in the relevant job confirmation.',
      '7.2 The Contractor is not required to carry out work that is materially outside the agreed scope, or that cannot be performed safely, without further agreement on fee and timing.',
    ],
  },
  {
    title: '8. Rectification of Defective Work',
    body: [
      '8.1 If the Principal reasonably considers that the Services have not been completed to the agreed scope or standard, it must notify the Contractor promptly and provide reasonable details. The Contractor must, where reasonably practicable, return and rectify the issue at their own cost.',
      '8.2 Clause 8.1 does not apply where the issue resulted from an inaccurate or incomplete scope, a pre-existing condition, inadequate access, or circumstances outside the Contractor’s reasonable control.',
    ],
  },
  {
    title: '9. Insurance',
    body: [
      '9.1 The Contractor must hold and maintain current public liability insurance appropriate to the Services — the Principal’s minimum requirement is $1,000,000 for residential work and $2,000,000 for commercial work — and must provide evidence of cover on request and before commencing Services. The Principal may suspend or terminate this Agreement if the Contractor fails to maintain adequate cover.',
      '9.2 The Contractor acknowledges the Principal’s insurance does not extend to the Contractor, their personnel, subcontractors or equipment.',
    ],
  },
  {
    title: '10. Health and Safety',
    body: [
      '10.1 Both the Principal and the Contractor are PCBUs with duties under the Health and Safety at Work Act 2015. Where their duties overlap, the parties will, so far as reasonably practicable, consult, cooperate with and coordinate activities with each other, and with the client, regarding hazards, controls, incidents and site-specific requirements.',
      '10.2 The Principal will share known property and client hazards, relevant safety information and, where applicable, chemical safety data sheets, and will communicate arrangements for matters such as lone working, aggressive clients or animals, hazardous materials or waste, working at height, and first aid or emergencies, so far as it is reasonably able.',
      '10.3 The Contractor must take reasonable care for their own and others’ health and safety, follow lawful site-specific requirements, report any accident, incident or near-miss promptly, and must not work while unfit due to illness, injury, fatigue or any impairment affecting safe performance.',
      '10.4 The Contractor may stop or refuse work they reasonably believe presents an immediate or unmanaged health and safety risk, without penalty. The parties will then consult and agree how the risk can be managed before the work continues.',
    ],
  },
  {
    title: '11. Security and Client Property',
    body: [
      '11.1 Before commencing Services, the Contractor must provide proof of identity and evidence of their legal right to work in New Zealand, and must disclose any information reasonably relevant to their access to clients’ homes, keys, money and possessions. Any disclosure of convictions will be handled lawfully and fairly and only to the extent relevant to that access.',
      '11.2 The Contractor must keep secure any keys, alarm codes or access cards, must not copy or share them, and must immediately report any lost key or compromised security information.',
      '11.3 While providing the Services the Contractor must not: take photographs or video without authorisation; bring guests or unapproved people onsite; smoke or consume alcohol or drugs onsite; or remove, use or interfere with client property. The Contractor must promptly disclose any actual or suspected theft, loss or damage.',
    ],
  },
  {
    title: '12. Subcontracting',
    body: [
      '12.1 The Contractor may arrange for another suitably skilled, insured and vetted person to perform an accepted job, on prior written notice to the Principal, whose approval will not be unreasonably withheld. The Contractor remains fully responsible for the performance, conduct, insurance and health and safety of any such person, and for their compliance with this Agreement.',
    ],
  },
  {
    title: '13. Confidentiality and Privacy',
    body: [
      '13.1 The Contractor must keep confidential all information relating to the Principal’s business, clients, pricing, systems and operations that is not publicly available, and must not use it for any purpose other than performing the Services. This obligation survives termination.',
      '13.2 The Contractor must handle any personal information they access in the course of the Services in accordance with the Privacy Act 2020, and only for the purpose of performing the Services.',
    ],
  },
  {
    title: '14. Non-Solicitation',
    body: [
      '14.1 During this Agreement and for 6 months after it ends, the Contractor must not actively solicit cleaning or property services work from a client for whom the Contractor personally performed Services through the Principal during the final 6 months of this Agreement, for the purpose of bypassing the Principal.',
      '14.2 If such a client approaches the Contractor directly, the Contractor must promptly notify the Principal and must not knowingly arrange work intended to bypass an existing booking, quote or service relationship with the Principal. Nothing in this clause prevents the Contractor from advertising their services to the general public or working for other clients generally.',
    ],
  },
  {
    title: '15. Conduct and Representation',
    body: [
      '15.1 When performing the Services the Contractor must conduct themselves professionally, must not represent themselves as an employee or agent of the Principal, and must not make commitments on the Principal’s behalf without authorisation.',
      '15.2 The Contractor must not display the branding or uniform of a competing cleaning or property services business while on a job for the Principal.',
    ],
  },
  {
    title: '16. Term and Termination',
    body: [
      '16.1 This Agreement commences on the date set out above and continues until terminated. Either party may terminate on 10 working days’ written notice.',
      '16.2 The Principal may terminate immediately by written notice if the Contractor: materially breaches this Agreement and (where capable of remedy) fails to remedy it within 5 working days; fails to maintain adequate insurance; engages in theft, dishonesty, violence, a serious health and safety breach, deliberate property damage, a serious privacy breach or unauthorised entry; engages in conduct that has caused, or is reasonably likely to cause, material damage to the Principal’s reputation; is convicted of a relevant offence; or becomes insolvent.',
      '16.3 On termination the Contractor must return any Principal or client property. Termination does not affect the Principal’s obligation to pay for Services properly completed before termination. The confidentiality, security and non-solicitation obligations continue.',
    ],
  },
  {
    title: '17. Liability',
    body: [
      '17.1 The Contractor is responsible for direct loss or damage caused by their negligent or wilful acts or omissions, including any applicable insurance excess.',
      '17.2 Except in cases of fraud, wilful misconduct, theft, breach of confidentiality, or damage covered by the Contractor’s insurance, the Contractor’s aggregate liability to the Principal for any one event is limited to the greater of $5,000 or the amount recoverable under the Contractor’s insurance.',
      '17.3 The Principal’s liability to the Contractor is limited to fees due for Services properly performed. Neither party is liable to the other for indirect or consequential loss. Nothing in this Agreement limits or determines any right a client may have, as the client is not a party to this Agreement.',
    ],
  },
  {
    title: '18. Dispute Resolution and General',
    body: [
      '18.1 The parties will first attempt to resolve any dispute by good-faith negotiation. If it is not resolved within 10 working days of written notice, either party may refer it to mediation before a mutually agreed mediator. Nothing prevents a party from seeking urgent interim relief from a court.',
      '18.2 Notices under this Agreement may be given by email to the addresses the parties use for job confirmations, or to hello@sano.nz for the Principal.',
      '18.3 This Agreement may be signed electronically and in counterparts, each of which is an original and which together form one agreement. By typing their name to sign, the Contractor confirms they have read, understood and agree to this Agreement.',
      '18.4 This Agreement is governed by the laws of New Zealand, constitutes the entire agreement between the parties, may only be amended in writing agreed by both parties, and may not be assigned by the Contractor without the Principal’s consent. If any provision is unenforceable, the remainder continues in full force.',
    ],
  },
]
