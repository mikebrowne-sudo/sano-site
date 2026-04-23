// Sano Property Services Limited — Approved commercial Terms & Conditions
// Version: 2026-04-26 (locked) · tightened revision
//
// Production source for the proposal system. Imported by:
//   • src/lib/proposals/proposal-settings.ts as the default
//     value for terms.terms_and_conditions_html
//
// The companion src/lib/proposals/terms-and-conditions.html is a
// byte-equivalent record file for human readability and for any future
// build-time pipeline that wants the HTML on disk. The companion
// docs/proposal/terms-and-conditions.md mirrors the wording in
// markdown form. Keep all three in sync if the wording is ever
// updated (with legal/commercial sign-off).
//
// Markup conventions:
//   • <h3> for each numbered section heading
//   • <p>  for regular text
//   • <ul>/<li> for the small number of remaining bullet lists
//   • &amp; for ampersands
//
// The TermsAndConditionsPage renders this string via
// dangerouslySetInnerHTML inside .proposal-prose--terms (compact
// 2-column layout designed to fit a single A4 page).

export const APPROVED_TERMS_HTML = `
<h3>1. Agreement Overview</h3>
<p>This proposal sets out the scope, frequency, and pricing for cleaning services to be provided by Sano Property Services Limited. By accepting this proposal, the client agrees to the services and terms below.</p>

<h3>2. Contract Term</h3>
<p>The initial term is 12 months from the agreed service start date, supporting consistent service delivery, staffing, and quality control.</p>

<h3>3. Scope of Services</h3>
<p>Services will be delivered to the scope and frequency in this proposal. Only tasks listed in the scope of works are included. Any additional services or scope changes are treated as a variation and agreed separately.</p>

<h3>4. Service Delivery</h3>
<p>Services will be carried out at the agreed frequency, within agreed service windows, and to industry standards for commercial cleaning.</p>
<p>Cleaning outcomes are influenced by site condition, usage, and maintenance between visits. Sano Property Services Limited does not guarantee restoration of surfaces beyond normal cleaning processes.</p>

<h3>5. Pricing &amp; Payment Terms</h3>
<ul>
  <li>Invoices are issued monthly in arrears</li>
  <li>Payment is required within 14 days of invoice date</li>
  <li>All pricing is exclusive of GST unless stated otherwise</li>
</ul>
<p>Sano Property Services Limited may review pricing annually or where material changes occur &mdash; including changes to scope, site conditions differing from initial assessment, or increases in labour, materials, or operating costs. Adjustments will be communicated in advance.</p>

<h3>6. Variations &amp; Additional Work</h3>
<p>Work outside the agreed scope will be quoted and approved before being carried out &mdash; including one-off cleaning, deep cleaning, or changes to site layout or usage.</p>

<h3>7. Access &amp; Site Conditions</h3>
<p>The client must provide access at the agreed service times. If access is not available, the visit may be recorded as completed and charges may still apply.</p>

<h3>8. After-Hours &amp; Security Access</h3>
<p>For services carried out outside normal business hours:</p>
<ul>
  <li>the client must ensure safe and authorised access is available</li>
  <li>all alarm codes, access instructions, and site procedures must be clearly provided</li>
  <li>Sano Property Services Limited will follow the site protocols provided</li>
</ul>
<p>Sano Property Services Limited is not responsible for issues arising from incorrect or outdated instructions, faulty alarm systems, or access failures outside its control.</p>

<h3>9. Key Holding &amp; Alarm Responsibility</h3>
<p>Keys, fobs, or access credentials provided to Sano Property Services Limited will be stored and handled securely, and used only for delivering agreed services. The client remains responsible for ensuring alarm systems function correctly and access instructions are accurate and current.</p>

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
<p>Consumables (including bin liners, paper products, and soaps and hygiene supplies) are supplied by the client unless otherwise agreed in writing. The client is responsible for maintaining adequate stock; Sano Property Services Limited is not responsible for service interruptions caused by insufficient consumables.</p>

<h3>13. Health &amp; Safety</h3>
<p>Sano Property Services Limited operates under appropriate health and safety procedures. The client agrees to communicate site-specific safety requirements and support compliance with all relevant safety protocols.</p>

<h3>14. Insurance &amp; Liability</h3>
<p>Sano Property Services Limited maintains appropriate insurance cover, including public liability insurance. Sano Property Services Limited is not responsible for pre-existing damage or normal wear and tear, and any damage must be reported within 48 hours of service delivery. Liability is limited to the value of services provided within the preceding three-month period, except where required by law.</p>

<h3>15. Subcontractors</h3>
<p>Sano Property Services Limited may use trained employees and subcontractors to deliver services, all operating under Sano&rsquo;s quality and safety standards.</p>

<h3>16. Non-Payment</h3>
<p>If invoices remain unpaid beyond agreed terms, Sano Property Services Limited may suspend services. Services resume once the account is brought up to date.</p>

<h3>17. Termination &amp; Notice</h3>
<p>After the initial term, either party may terminate this agreement with 30 days written notice. Early termination within the contract period may incur costs relating to staff allocation, scheduling, and service setup.</p>

<h3>18. Service Review &amp; Communication</h3>
<p>Service reviews can be conducted to confirm expectations are met and adjust scope where required.</p>

<h3>19. Events Outside Control</h3>
<p>Sano Property Services Limited is not liable for delays or inability to deliver services due to events outside its control, including but not limited to weather conditions, access restrictions, and unforeseen site conditions.</p>
`.trim()
