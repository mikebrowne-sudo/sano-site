// Mammoth email signature preview — hosted on the Sano site so the
// signature images served at https://sano.nz/email/* can be referenced
// from Outlook. Mirrors the pattern of `email-signature-michael` and
// the original Sano `email-signature` route: a plain HTML preview the
// operator can open, select-all, copy, and paste into Outlook.
//
// The signature is two linked images (per Claude-design package):
//   1. Top banner → https://mammoth.co.nz
//   2. Take-Back CTA bar → https://www.mammoth.co.nz/pages/recycle
//
// The signature markup is injected verbatim via dangerouslySetInnerHTML
// so the Outlook-specific `mso-table-*` CSS hints survive into the
// rendered DOM (React's `style` typing strips unknown properties).

const SIGNATURE_HTML = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td style="padding:0;margin:0;line-height:0;font-size:0;">
      <a href="https://mammoth.co.nz" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="https://sano.nz/email/mammoth-signature-top.png" alt="Mike Browne — Architectural BDM, Mammoth Modern Insulation" width="904" style="display:block;border:0;outline:none;width:904px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0;margin:0;line-height:0;font-size:0;">
      <a href="https://www.mammoth.co.nz/pages/recycle" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="https://sano.nz/email/mammoth-signature-cta.png" alt="Learn more about Mammoth's Take Back Programme" width="904" style="display:block;border:0;outline:none;width:904px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>
</table>`

export default function EmailSignatureMammoth() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Mammoth Email Signature
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '20px' }}>
        Highlight the block below, copy, and paste into Outlook signature.
      </p>

      <div style={{ background: '#ffffff', padding: '20px', display: 'inline-block' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', margin: 0, marginBottom: '12px' }}>
          Kind regards,
        </div>

        <div dangerouslySetInnerHTML={{ __html: SIGNATURE_HTML }} />
      </div>
    </div>
  )
}
