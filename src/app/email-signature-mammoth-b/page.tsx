// Mammoth email signature — Option B
//
// "No badges, slim Take Back" — the same 720×211 banner image as
// Option A (shares `mammoth-signature-slim.png`) plus a SLIM live HTML
// Take Back strip underneath. Two links: banner → mammoth.co.nz,
// button → /pages/recycle. The strip is live HTML so it always renders
// even when Outlook blocks remote images.
//
// Signature shape matches the source package's `signature.html`
// (Version B from the Mammoth Signature deploy pack). Markup injected
// verbatim via dangerouslySetInnerHTML so the `bgcolor` attributes and
// `mso-table-*` hints survive into the rendered DOM.

const SIGNATURE_HTML = `<table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:720px;max-width:100%;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <!-- Banner image (links to website) -->
  <tr>
    <td style="padding:0;margin:0;line-height:0;font-size:0;">
      <a href="https://mammoth.co.nz" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="https://sano.nz/email/mammoth-signature-slim.png" width="720" alt="Mike Browne — Architectural BDM, Mammoth Modern Insulation" style="display:block;border:0;outline:none;width:720px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>
  <!-- Slim live Take Back strip (links to recycle page) -->
  <tr>
    <td bgcolor="#46413B" align="center" style="background:#46413B;padding:8px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#ECE8E2;line-height:1.2;padding-right:14px;">
            Recycling your offcuts? <span style="color:#ffffff;">Mammoth takes them back for free.</span>
          </td>
          <td bgcolor="#EE2D24" style="background:#EE2D24;border-radius:5px;">
            <a href="https://www.mammoth.co.nz/pages/recycle" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;color:#ffffff;text-decoration:none;line-height:1;padding:6px 12px;">Learn more &rsaquo;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

export default function EmailSignatureMammothB() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Mammoth Email Signature — Option B (slim + Take Back)
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '8px' }}>
        Highlight the block below (starting at &quot;Kind regards,&quot;), copy,
        and paste into Outlook signature.
      </p>

      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Other options:{' '}
        <a href="/email-signature-mammoth" style={{ color: '#0066cc' }}>Full (badges + Take Back)</a>{' · '}
        <a href="/email-signature-mammoth-a" style={{ color: '#0066cc' }}>Signature A (slim, no Take Back)</a>
      </p>

      <div style={{ background: '#ffffff', padding: '20px 0 20px 0', display: 'inline-block', width: '100%', maxWidth: '720px' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', marginBottom: '12px' }}>
          Kind regards,
        </div>

        <div dangerouslySetInnerHTML={{ __html: SIGNATURE_HTML }} />
      </div>
    </div>
  )
}
