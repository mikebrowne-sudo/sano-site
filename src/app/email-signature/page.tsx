export default function EmailSignature() {
  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'Arial, sans-serif', marginTop: 0 }}>
        Email Signature
      </h2>

      <p style={{ fontFamily: 'Arial, sans-serif', marginBottom: '20px' }}>
        Highlight below, copy, and paste into Outlook signature.
      </p>

      {/* Copy Area */}
      <div style={{ background: '#ffffff', padding: '20px', display: 'inline-block' }}>
        
        {/* Text */}
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#000000',
            margin: 0,
            padding: 0,
          }}
        >
          Kind regards,
        </div>

        {/* Banner */}
        <a
          href="https://sano.nz"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', display: 'block', margin: 0, padding: 0 }}
        >
          <img
            src="/email/email-banner-carol.jpg"
            alt="Sano Email Banner"
            width="600"
            style={{
              display: 'block',
              width: '600px',
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