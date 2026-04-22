export default function EmailSignatureMichael() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Email Signature
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '20px' }}>
        Highlight below, copy, and paste into Outlook signature.
      </p>

      <div style={{ background: '#ffffff', padding: '20px', display: 'inline-block' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', margin: 0 }}>
          Kind regards,
        </div>

        <a href="https://sano.nz" target="_blank" rel="noreferrer" style={{ display: 'block' }}>
          <img
            src="/email/email-banner-michael.jpg"
            alt="Sano Email Banner"
            width="850"
            style={{
              display: 'block',
              width: '850px',
              maxWidth: '100%',
              height: 'auto',
              border: 0,
              margin: 0,
              padding: 0,
            }}
          />
        </a>
      </div>
    </div>
  )
}