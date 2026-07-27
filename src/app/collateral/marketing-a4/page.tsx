// Sano — A4 double-sided marketing flyer (print-preview route).
//
// Photo-led, editorial layout in the Sano brand (sage + Noto Serif +
// Poppins), taking the structure of the reference flyers: full-bleed hero,
// big serif headline + italic accent, circular trust badge, circular
// line-icon service row, refined sage footer with the CTA.
//
// Preview at /collateral/marketing-a4. Export: Ctrl+P -> Save as PDF, A4,
// "Background graphics" ON, margins None. Bleed + crop marks added at the
// print-prep stage once the look is signed off.

import {
  Home, Building2, ClipboardCheck, Sofa, Sparkles, HardHat,
  ShieldCheck, Users, MapPin, BadgeCheck, Phone, Leaf,
  type LucideIcon,
} from 'lucide-react'

export const metadata = { title: 'Sano — A4 Marketing Flyer' }

const SAGE = {
  50: '#F7F9F7', 100: '#E0EAE3', 200: '#a8c5b0', 300: '#7EC87A',
  500: '#076653', 600: '#5C6B64', 700: '#344C3D', 800: '#06231D',
}
const serif = "var(--font-noto-serif), 'Noto Serif', Georgia, serif"
const sans = "var(--font-poppins), Poppins, system-ui, sans-serif"

function Eyebrow({ children, color = SAGE[500] }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase', color }}>
      {children}
    </div>
  )
}

const SERVICES: [LucideIcon, string][] = [
  [Home, 'Homes'],
  [Building2, 'Offices'],
  [ClipboardCheck, 'End of tenancy'],
  [Sofa, 'Carpet & upholstery'],
  [Sparkles, 'Windows'],
  [HardHat, 'Post-construction'],
]

const TRUST: [LucideIcon, string][] = [
  [ShieldCheck, 'Fully insured'],
  [Users, 'Vetted teams'],
  [MapPin, 'Auckland-wide'],
  [BadgeCheck, 'Satisfaction guarantee'],
]

const WHY = [
  ['Detail, not just surface', 'We clean for how a space feels — air, touch and finish — with a checklist for every room, every visit.'],
  ['People you can trust inside', 'Insured, vetted and trained teams. The same standard whether it’s your home or your workplace.'],
  ['Clear quotes, no surprises', 'Transparent pricing, tidy paperwork and a satisfaction guarantee on every clean.'],
]

function CircleIcon({ Icon, filled = false }: { Icon: LucideIcon; filled?: boolean }) {
  return (
    <div style={{
      width: '15mm', height: '15mm', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: filled ? SAGE[800] : SAGE[100], border: filled ? 'none' : `1px solid ${SAGE[200]}`,
    }}>
      <Icon size={26} strokeWidth={1.4} color={filled ? '#fff' : SAGE[700]} />
    </div>
  )
}

export default function MarketingA4() {
  return (
    <div style={{ background: '#e9ebe9', minHeight: '100vh', padding: '32px 0', fontFamily: sans, color: SAGE[800] }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: #fff; }
          .screen-only { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
        }
        .sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="screen-only" style={{ textAlign: 'center', marginBottom: 20, color: SAGE[600] }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Sano · A4 marketing flyer — draft v2 (photo-led)</div>
        <div style={{ fontSize: 11 }}>Front + Back · Ctrl+P → Save as PDF (A4, background graphics on)</div>
      </div>

      {/* ───────────────── FRONT ───────────────── */}
      <div className="sheet" style={{ width: '210mm', height: '297mm', margin: '0 auto 28px', background: SAGE[50], boxShadow: '0 4px 24px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Hero photo */}
        <div style={{ position: 'relative', height: '158mm', width: '100%' }}>
          <img src="/images/herne-bay-residential.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,35,29,0.45) 0%, rgba(6,35,29,0.05) 38%, rgba(6,35,29,0.30) 62%, rgba(6,35,29,0.86) 100%)' }} />

          {/* top row: logo + badge */}
          <div style={{ position: 'absolute', top: '13mm', left: '15mm', right: '15mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <img src="/brand/sano-full-white.png" alt="Sano" style={{ height: '12mm', objectFit: 'contain' }} />
            <div style={{ width: '27mm', height: '27mm', borderRadius: '50%', background: 'rgba(6,35,29,0.78)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center' }}>
              <Leaf size={13} color={SAGE[200]} strokeWidth={1.5} />
              <div style={{ fontFamily: sans, fontSize: 7.5, fontWeight: 600, letterSpacing: '0.14em', lineHeight: 1.6, marginTop: 3 }}>INSURED<br />TRUSTED<br />AUCKLAND</div>
            </div>
          </div>

          {/* headline */}
          <div style={{ position: 'absolute', bottom: '12mm', left: '15mm', right: '15mm' }}>
            <Eyebrow color={SAGE[200]}>Auckland cleaning</Eyebrow>
            <div style={{ fontFamily: serif, fontWeight: 700, color: '#fff', fontSize: 42, lineHeight: 1.08, marginTop: 8, letterSpacing: '-0.01em' }}>
              Clean spaces.<br />Healthy living.
            </div>
            <div style={{ fontFamily: serif, fontStyle: 'italic', color: SAGE[200], fontSize: 18, marginTop: 8 }}>
              Cleaning you can feel — not just see.
            </div>
          </div>
        </div>

        {/* intro */}
        <div style={{ padding: '11mm 15mm 0' }}>
          <p style={{ fontFamily: sans, fontSize: 11.5, lineHeight: 1.65, color: SAGE[700], margin: 0, maxWidth: '160mm' }}>
            Sano is a reliable, detail-focused cleaning team for Auckland homes, rentals and workplaces —
            trained people, room-by-room checklists, and a standard that stays the same every visit.
          </p>
        </div>

        {/* services */}
        <div style={{ padding: '9mm 15mm 0' }}>
          <Eyebrow>What we clean</Eyebrow>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6mm' }}>
            {SERVICES.map(([Icon, label]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '26mm', textAlign: 'center' }}>
                <CircleIcon Icon={Icon} />
                <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 9.5, color: SAGE[800], marginTop: '3mm', lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* trust row */}
        <div style={{ margin: '10mm 15mm 0', borderTop: `1px solid ${SAGE[200]}`, paddingTop: '6mm', display: 'flex', justifyContent: 'space-between' }}>
          {TRUST.map(([Icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
              <Icon size={17} strokeWidth={1.6} color={SAGE[500]} />
              <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, color: SAGE[700] }}>{label}</span>
            </div>
          ))}
        </div>

        {/* footer CTA */}
        <div style={{ marginTop: 'auto', background: SAGE[800], padding: '10mm 15mm', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Eyebrow color={SAGE[200]}>Ready when you are</Eyebrow>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 24, marginTop: 5 }}>Get your free quote today.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5mm' }}>
            <div style={{ width: '14mm', height: '14mm', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={20} color="#fff" strokeWidth={1.6} />
            </div>
            <div style={{ textAlign: 'right', fontFamily: sans }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>0800 726 686</div>
              <div style={{ fontSize: 11, color: SAGE[200] }}>sano.nz · hello@sano.nz</div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── BACK ───────────────── */}
      <div className="sheet" style={{ width: '210mm', height: '297mm', margin: '0 auto', background: SAGE[50], boxShadow: '0 4px 24px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16mm 15mm 0' }}>
          <Eyebrow>Why Sano</Eyebrow>
          <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: SAGE[800], margin: '5mm 0 0', maxWidth: '155mm' }}>
            A cleaner space you can feel — delivered the same way, every time.
          </h2>

          <div style={{ marginTop: '11mm', display: 'flex', flexDirection: 'column', gap: '8mm' }}>
            {WHY.map(([t, b], i) => (
              <div key={t} style={{ display: 'flex', gap: '7mm', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 26, fontWeight: 700, color: SAGE[200], width: '13mm', lineHeight: 1 }}>0{i + 1}</div>
                <div>
                  <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 16, color: SAGE[800] }}>{t}</div>
                  <p style={{ fontFamily: sans, fontSize: 11, lineHeight: 1.65, color: SAGE[700], margin: '3px 0 0', maxWidth: '145mm' }}>{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* photo strip */}
        <div style={{ height: '52mm', width: '100%', marginTop: '12mm', position: 'relative' }}>
          <img src="/images/Sano-crew-auckland.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,35,29,0.55) 0%, rgba(6,35,29,0) 55%)' }} />
          <div style={{ position: 'absolute', left: '15mm', top: '50%', transform: 'translateY(-50%)', color: '#fff', fontFamily: serif, fontStyle: 'italic', fontSize: 18, maxWidth: '90mm' }}>
            “The Sano team — vetted, trained, and proudly Auckland.”
          </div>
        </div>

        {/* contact band */}
        <div style={{ marginTop: 'auto', background: SAGE[800], padding: '11mm 15mm', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Eyebrow color={SAGE[200]}>Book a clean</Eyebrow>
            <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 22, marginTop: 5 }}>Talk to us today.</div>
            <img src="/brand/sano-full-white.png" alt="Sano" style={{ height: '8mm', objectFit: 'contain', marginTop: '7mm', opacity: 0.9 }} />
          </div>
          <div style={{ textAlign: 'right', fontFamily: sans, lineHeight: 1.9 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}>0800 726 686</div>
            <div style={{ fontSize: 11.5 }}>hello@sano.nz</div>
            <div style={{ fontSize: 11.5 }}>sano.nz</div>
          </div>
        </div>
      </div>
    </div>
  )
}
