// Mammoth email signature — Option A
//
// "No badges, no Take Back" — a single 720×211 banner image linked to
// https://mammoth.co.nz. One row, one link. The simplest of the three
// signature options.
//
// Signature shape matches the source package's `signature.html` (Version
// A from the Mammoth Signature deploy pack). Markup injected verbatim
// via dangerouslySetInnerHTML so Outlook-specific `mso-table-*` hints
// survive into the rendered DOM.

const SIGNATURE_HTML = `<table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:720px;max-width:100%;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td style="padding:0;margin:0;line-height:0;font-size:0;">
      <a href="https://mammoth.co.nz" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="https://sano.nz/email/mammoth-signature-slim.png" width="720" alt="Mike Browne — Architectural BDM, Mammoth Modern Insulation" style="display:block;border:0;outline:none;width:720px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>
</table>`

export default function EmailSignatureMammothA() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Mammoth Email Signature — Option A (slim, no Take Back)
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '8px' }}>
        Highlight the block below (starting at &quot;Kind regards,&quot;), copy,
        and paste into Outlook signature.
      </p>

      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Other options:{' '}
        <a href="/email-signature-mammoth" style={{ color: '#0066cc' }}>Full (badges + Take Back)</a>{' · '}
        <a href="/email-signature-mammoth-b" style={{ color: '#0066cc' }}>Signature B (slim + Take Back)</a>
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
