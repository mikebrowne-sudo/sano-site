// Reusable inner-page header — FIXED COMPONENT.
//
// Same height, same logo size and position, same title placement,
// same gradient on every page. Only the section title changes.
//
// Inner-page image: any high-quality commercial interior (offices,
// lobbies, meeting rooms). Must feel like the same environment
// across all pages. Currently uses sano-commercial-clean-auckland
// — flagged for review: if that asset shows staff/cleaners or a
// residential/lifestyle scene, swap the file via the BG_IMAGE
// constant below. One change, updates every inner page.

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
        <div className="proposal-header__title-wrap">
          <span className="proposal-header__title">{title}</span>
          <span className="proposal-header__underline" aria-hidden />
        </div>
      </div>
    </header>
  )
}
