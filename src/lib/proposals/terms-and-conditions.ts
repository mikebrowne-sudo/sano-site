// Sano Property Services Limited — Approved commercial Terms & Conditions
// Version: 2026-04-26 (locked)
//
// Production source for the proposal system. Imported by:
//   • src/lib/proposals/proposal-settings.ts as the default
//     value for terms.terms_and_conditions_html
//
// The companion src/lib/proposals/terms-and-conditions.html is a
// byte-identical record file for human readability and for any future
// build-time pipeline that wants the HTML on disk. Keep the two in
// sync if the wording is ever updated (with legal sign-off).
//
// Markup conventions:
//   • <h3> for each numbered section heading
//   • <p>  for regular text
//   • <ul>/<li> for bullet lists
//   • &amp; for ampersands; &rsquo; for the curly apostrophe in "Sano’s"
//
// The TermsAndConditionsPage renders this string via
// dangerouslySetInnerHTML inside .proposal-prose--terms (compact
// 2-column layout designed to fit a single A4 page).

export const APPROVED_TERMS_HTML = `
<h3>1. Agreement Overview</h3>
<p>This proposal outlines the scope, frequency, and pricing for cleaning services to be provided by Sano Property Services Limited.</p>
<p>By accepting this proposal, the client agrees to the services and terms outlined below.</p>

<h3>2. Contract Term</h3>
<p>This agreement is based on an initial term of 12 months, commencing from the agreed service start date.</p>
<p>This allows for consistent service delivery, staffing, and quality control.</p>

<h3>3. Scope of Services</h3>
<p>Services will be delivered in accordance with the agreed scope and frequency outlined in this proposal.</p>
<p>Only the tasks specifically listed in the scope of works are included.</p>
<p>Any additional services or changes to scope will be treated as a variation and agreed separately.</p>

<h3>4. Service Delivery</h3>
<p>Services will be carried out:</p>
<ul>
  <li>at the agreed frequency</li>
  <li>within agreed service windows</li>
  <li>in line with industry standards for commercial cleaning</li>
</ul>
<p>Cleaning outcomes are influenced by site condition, usage levels, and maintenance between visits. Sano Property Services Limited does not guarantee restoration of surfaces beyond normal cleaning processes.</p>

<h3>5. Pricing &amp; Payment Terms</h3>
<ul>
  <li>Invoices are issued monthly in arrears</li>
  <li>Payment is required within 14 days of invoice date</li>
  <li>All pricing is exclusive of GST unless stated otherwise</li>
</ul>
<p>Sano Property Services Limited reserves the right to review pricing annually or where material changes occur, including:</p>
<ul>
  <li>changes to scope of work</li>
  <li>site conditions differing from initial assessment</li>
  <li>increases in labour, materials, or operating costs</li>
</ul>
<p>Any pricing adjustments will be communicated in advance.</p>

<h3>6. Variations &amp; Additional Work</h3>
<p>Work outside the agreed scope will be quoted and approved prior to being carried out. This includes:</p>
<ul>
  <li>one-off cleaning</li>
  <li>deep cleaning</li>
  <li>changes to site layout or usage</li>
</ul>

<h3>7. Access &amp; Site Conditions</h3>
<p>The client must provide access to the premises at the agreed service times. If access is not available at the scheduled time:</p>
<ul>
  <li>the visit may be recorded as completed</li>
  <li>charges may still apply</li>
</ul>

<h3>8. After-Hours &amp; Security Access</h3>
<p>Where services are carried out outside normal business hours:</p>
<ul>
  <li>the client must ensure safe and authorised access is available</li>
  <li>all alarm codes, access instructions, and procedures must be clearly provided</li>
  <li>Sano Property Services Limited will follow all provided site protocols</li>
</ul>
<p>Sano Property Services Limited is not responsible for issues arising from:</p>
<ul>
  <li>incorrect or outdated instructions</li>
  <li>faulty alarm systems</li>
  <li>restricted or failed access outside its control</li>
</ul>

<h3>9. Key Holding &amp; Alarm Responsibility</h3>
<p>Where keys, fobs, or access credentials are provided:</p>
<ul>
  <li>they will be stored and handled securely</li>
  <li>they will only be used for delivering agreed services</li>
</ul>
<p>The client remains responsible for:</p>
<ul>
  <li>ensuring alarm systems are functioning correctly</li>
  <li>ensuring access instructions are accurate and current</li>
</ul>

<h3>10. Client Responsibilities</h3>
<p>The client agrees to:</p>
<ul>
  <li>provide access to power and water</li>
  <li>notify Sano Property Services Limited of any hazards or special requirements</li>
  <li>maintain a safe working environment</li>
</ul>

<h3>11. Cleaning Equipment</h3>
<p>All standard cleaning equipment required to deliver the agreed services will be supplied by Sano Property Services Limited, unless otherwise agreed.</p>

<h3>12. Consumables</h3>
<p>Consumables will be supplied by the client unless otherwise agreed in writing. This includes, but is not limited to:</p>
<ul>
  <li>bin liners</li>
  <li>paper products</li>
  <li>soaps and hygiene supplies</li>
</ul>
<p>The client is responsible for maintaining adequate stock levels to support service delivery. Sano Property Services Limited is not responsible for service interruptions caused by insufficient consumables.</p>

<h3>13. Health &amp; Safety</h3>
<p>Sano Property Services Limited operates under appropriate health and safety procedures. The client agrees to:</p>
<ul>
  <li>communicate site-specific safety requirements</li>
  <li>support compliance with all relevant safety protocols</li>
</ul>

<h3>14. Insurance &amp; Liability</h3>
<p>Sano Property Services Limited maintains appropriate insurance cover, including public liability insurance. While all care is taken:</p>
<ul>
  <li>Sano Property Services Limited is not responsible for pre-existing damage or normal wear and tear</li>
  <li>any damage must be reported within 48 hours of service delivery</li>
</ul>
<p>Liability is limited to the value of services provided within the preceding three-month period, except where required by law.</p>

<h3>15. Subcontractors</h3>
<p>Sano Property Services Limited may use trained employees and subcontractors to deliver services. All personnel operate under Sano&rsquo;s quality and safety standards.</p>

<h3>16. Non-Payment</h3>
<p>If invoices remain unpaid beyond agreed terms:</p>
<ul>
  <li>Sano Property Services Limited may suspend services</li>
  <li>services will resume once the account is brought up to date</li>
</ul>

<h3>17. Termination &amp; Notice</h3>
<p>After the initial term, either party may terminate the agreement with 30 days written notice. Early termination within the contract period may incur costs relating to:</p>
<ul>
  <li>staff allocation</li>
  <li>scheduling</li>
  <li>service setup</li>
</ul>

<h3>18. Service Review &amp; Communication</h3>
<p>Sano Property Services Limited values long-term working relationships and open communication. Service reviews can be conducted to:</p>
<ul>
  <li>ensure expectations are met</li>
  <li>adjust scope where required</li>
</ul>

<h3>19. Events Outside Control</h3>
<p>Sano Property Services Limited is not liable for delays or inability to deliver services due to events outside its control, including but not limited to:</p>
<ul>
  <li>weather conditions</li>
  <li>access restrictions</li>
  <li>unforeseen site conditions</li>
</ul>
`.trim()
