import type { Metadata } from 'next'
import { SERVICE_AGREEMENT_SECTIONS, SERVICE_AGREEMENT_LAST_UPDATED } from '@/lib/service-agreement'

export const metadata: Metadata = {
  title: 'Service Agreement — Sano',
  robots: 'noindex, nofollow',
}

export default function ServiceAgreementPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="sa-page">
        <div className="sa-container">

          <header className="sa-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sano-logo-print.png" alt="Sano" className="sa-logo" />
            <h1 className="sa-title">Service Agreement</h1>
            <p className="sa-updated">Last updated: {SERVICE_AGREEMENT_LAST_UPDATED}</p>
          </header>

          <div className="sa-body">
            {SERVICE_AGREEMENT_SECTIONS.map((section, i) => (
              <section key={i} className="sa-section">
                <h2 className="sa-section-title">{i + 1}. {section.title}</h2>
                <div className="sa-section-content">{section.content}</div>
              </section>
            ))}
          </div>

          <footer className="sa-footer">
            <p>Sano Property Services Limited</p>
          </footer>

        </div>
      </div>
    </>
  )
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  body { margin: 0; }

  .sa-page {
    min-height: 100vh;
    background: #f5f5f5;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10pt;
    line-height: 1.7;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .sa-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 48px 40px;
    background: #fff;
    box-shadow: 0 1px 6px rgba(0,0,0,.08);
  }

  .sa-header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid #076653;
  }

  .sa-logo {
    height: 56px;
    width: auto;
    margin-bottom: 16px;
  }

  .sa-title {
    font-size: 20pt;
    font-weight: 700;
    color: #076653;
    margin: 0 0 4px;
  }

  .sa-updated {
    font-size: 9pt;
    color: #999;
    margin: 0;
  }

  .sa-body {
    margin-bottom: 40px;
  }

  .sa-section {
    margin-bottom: 28px;
  }

  .sa-section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #076653;
    margin: 0 0 8px;
  }

  .sa-section-content {
    font-size: 10pt;
    color: #333;
    white-space: pre-wrap;
    line-height: 1.7;
  }

  .sa-footer {
    padding-top: 16px;
    border-top: 1px solid #e0eae3;
    text-align: center;
    font-size: 9pt;
    color: #999;
  }

  @media print {
    .sa-page { background: none; }
    .sa-container { margin: 0; padding: 0; box-shadow: none; max-width: none; }
    @page { margin: 18mm 16mm; size: A4; }
  }
`
