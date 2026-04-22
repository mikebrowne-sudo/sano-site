export default function EmailSignature() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      
      <h2 style={{ fontFamily: 'Arial, sans-serif' }}>
        Email Signature
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '20px' }}>
        Highlight below, copy, and paste into Outlook signature.
      </p>

      <div style={{ background: '#ffffff', padding: '20px', display: 'inline-block' }}>
        <table cellPadding="0" cellSpacing="0" border={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', padding: 0 }}>
                Kind regards,
              </td>
            </tr>
            <tr>
              <td style={{ padding: 0 }}>
                <a href="https://sano.nz" target="_blank">
                  <img
                    src="/email/email-banner-carol.jpg"
                    alt="Sano Email Banner"
                    style={{ width: '800px', display: 'block' }}
                  />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}