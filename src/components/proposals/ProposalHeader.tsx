// Proposal Phase 1 — reusable inner-page header.
//
// Same height, same logo placement, same backdrop image on every page.
// Only the section title (right side) changes. The image lives behind
// a dark gradient overlay so the white logo + title always have
// contrast.

const BG_IMAGE = '/images/sano-commercial-clean-auckland.jpeg'
const LOGO = '/brand/sano-logo-white.png'

export function ProposalHeader({ title }: { title: string }) {
  return (
    <header className="proposal-header">
      <div
        className="proposal-header__bg"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
        aria-hidden
      />
      <div className="proposal-header__overlay" aria-hidden />
      <div className="proposal-header__content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="Sano" className="proposal-header__logo" />
        <span className="proposal-header__title">{title}</span>
      </div>
    </header>
  )
}
