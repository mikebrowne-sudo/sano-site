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
  src="/email/email-signature-michael-700.jpg"
  alt="Sano Email Banner"
  width="700"
  height="151"
  style={{
    display: 'block',
    width: '700px',
    // The file is 700px NATIVE on purpose. Classic Outlook ignores CSS
    // width/max-width and often drops the width attribute on a pasted
    // signature image, so it shows the file at native size (x Windows DPI).
    // Native = display size means it can never blow up. Do not swap back
    // to the ~1665px email-banner-*.jpg (that is the campaign banner).
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