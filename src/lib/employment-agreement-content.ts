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
}

export interface AgreementSection {
  title: string
  body: string[]
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
