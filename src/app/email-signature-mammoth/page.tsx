// Mammoth email signature preview — hosted on the Sano site so the
// signature image served at https://sano.nz/email/mammoth-signature-banner.png
// can be referenced from Outlook. Mirrors the pattern of
// `email-signature-michael` and the original Sano `email-signature` route:
// a plain HTML preview the operator opens, select-alls, copies, and
// pastes into Outlook.
//
// New (v2) design — one 720px-wide table with two rows:
//   Row 1  Banner image      -> https://mammoth.co.nz
//   Row 2  LIVE Take-Back strip (always renders, even with images blocked)
//          with a red "Learn more" button -> /pages/recycle
//
// The signature markup is injected verbatim via dangerouslySetInnerHTML
// so the Outlook-specific `mso-table-*` CSS hints, `bgcolor` attributes,
// and inline border-radius / background overrides survive into the
// rendered DOM (React's `style` typing strips unknown properties; and
// `bgcolor` on `<td>` is a presentational HTML attribute Outlook
// inspects for fallback colours).

const SIGNATURE_HTML = `<table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:720px;max-width:100%;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <!-- Banner image (links to website) -->
  <tr>
    <td style="padding:0;margin:0;line-height:0;font-size:0;">
      <a href="https://mammoth.co.nz" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="https://sano.nz/email/mammoth-signature-banner.png" width="720" alt="Mike Browne — Architectural BDM, Mammoth Modern Insulation" style="display:block;border:0;outline:none;width:720px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>
  <!-- Live Take Back strip (links to recycle page) -->
  <tr>
    <td bgcolor="#46413B" align="center" style="background:#46413B;padding:11px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#ECE8E2;line-height:1.2;padding-right:16px;">
            Recycling your offcuts? <span style="color:#ffffff;">Mammoth takes them back for free.</span>
          </td>
          <td bgcolor="#EE2D24" style="background:#EE2D24;border-radius:6px;">
            <a href="https://www.mammoth.co.nz/pages/recycle" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#ffffff;text-decoration:none;line-height:1;padding:8px 16px;">Learn more &rsaquo;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

export default function EmailSignatureMammoth() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Mammoth Email Signature — Full (badges + Take Back)
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '8px' }}>
        Highlight the block below (starting at &quot;Kind regards,&quot;), copy,
        and paste into Outlook signature.
      </p>

      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Other options:{' '}
        <a href="/email-signature-mammoth-a" style={{ color: '#0066cc' }}>Signature A (slim, no Take Back)</a>{' · '}
        <a href="/email-signature-mammoth-b" style={{ color: '#0066cc' }}>Signature B (slim + Take Back)</a>
      </p>

      {/*
        Signature wrapper. White background for visual contrast against
        the preview page chrome, but ZERO inner padding so the signature
        table sits flush against the left edge — when copied into
        Outlook the signature lines up cleanly under the "Kind regards,"
        text with no hidden left indent.
      */}
      <div style={{ background: '#ffffff', padding: '20px 0 20px 0', display: 'inline-block', width: '100%', maxWidth: '720px' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', marginBottom: '12px' }}>
          Kind regards,
        </div>

        <div dangerouslySetInnerHTML={{ __html: SIGNATURE_HTML }} />
      </div>
    </div>
  )
}
