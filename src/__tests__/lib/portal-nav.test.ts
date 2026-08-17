import { readFileSync } from 'fs'
import { join } from 'path'
import { NAV_GROUPS, isNavActive, navGroupsFor, type NavItem } from '@/app/portal/_components/nav-config'

const allItems = NAV_GROUPS.flatMap((g) => g.items)
const hrefs = allItems.map((i) => i.href)
const item = (href: string): NavItem => allItems.find((i) => i.href === href)!

describe('portal nav — restructured shape', () => {
  it('is 5 short groups, each ≤ 4 items', () => {
    expect(NAV_GROUPS.map((g) => g.heading)).toEqual(['Operations', 'Sales & clients', 'People', 'Money', 'System'])
    for (const g of NAV_GROUPS) expect(g.items.length).toBeLessThanOrEqual(4)
  })

  it('drops from the old 31 links to a lean sidebar (≤ 20)', () => {
    expect(allItems.length).toBeLessThanOrEqual(20)
  })

  it('exposes the three hubs as top-level links', () => {
    expect(hrefs).toContain('/portal/pay')
    expect(hrefs).toContain('/portal/reports')
    expect(hrefs).toContain('/portal/marketing')
  })

  it('no longer shows the ten flat finance tabs directly in the sidebar', () => {
    for (const gone of [
      '/portal/finance/profit-loss', '/portal/finance/job-margins', '/portal/finance/reconcile',
      '/portal/finance', '/portal/contractor-invoices', '/portal/contractor-statements',
      '/portal/payroll', '/portal/payroll/employee', '/portal/mileage',
      '/portal/leads', '/portal/campaigns', '/portal/reviews',
      '/portal/settings/accountants', '/portal/settings/archive',
    ]) {
      expect(hrefs).not.toContain(gone)
    }
  })
})

describe('isNavActive — hubs light up on the routes they front', () => {
  it('Pay hub is active across contractor pay + payroll + statements + mileage', () => {
    for (const p of [
      '/portal/pay', '/portal/contractor-invoices', '/portal/contractor-invoices/pay-run',
      '/portal/contractor-statements', '/portal/payroll', '/portal/payroll/employee', '/portal/mileage',
    ]) {
      expect(isNavActive(p, item('/portal/pay'))).toBe(true)
    }
  })
  it('Reports hub is active across the finance reports', () => {
    for (const p of ['/portal/reports', '/portal/finance', '/portal/finance/profit-loss', '/portal/finance/job-margins']) {
      expect(isNavActive(p, item('/portal/reports'))).toBe(true)
    }
  })
  it('Marketing hub is active across leads / campaigns / reviews', () => {
    for (const p of ['/portal/marketing', '/portal/leads', '/portal/campaigns', '/portal/reviews']) {
      expect(isNavActive(p, item('/portal/marketing'))).toBe(true)
    }
  })
  it('Calendar is its own item; Jobs and Calendar highlight distinctly', () => {
    // On the calendar page: Calendar lit, Jobs NOT.
    expect(isNavActive('/portal/jobs/calendar', item('/portal/jobs/calendar'))).toBe(true)
    expect(isNavActive('/portal/jobs/calendar', item('/portal/jobs'))).toBe(false)
    // On a jobs page: Jobs lit, Calendar NOT.
    expect(isNavActive('/portal/jobs', item('/portal/jobs'))).toBe(true)
    expect(isNavActive('/portal/jobs/123', item('/portal/jobs'))).toBe(true)
    expect(isNavActive('/portal/jobs', item('/portal/jobs/calendar'))).toBe(false)
  })
  it('Settings stays lit on its sub-pages (accountants / archive folded in)', () => {
    expect(isNavActive('/portal/settings/accountants', item('/portal/settings'))).toBe(true)
    expect(isNavActive('/portal/settings/archive', item('/portal/settings'))).toBe(true)
  })
  it('Dashboard is exact-match only (not lit on every /portal/* route)', () => {
    expect(isNavActive('/portal', item('/portal'))).toBe(true)
    expect(isNavActive('/portal/jobs', item('/portal'))).toBe(false)
  })
  it('hubs do NOT bleed into each other', () => {
    expect(isNavActive('/portal/finance', item('/portal/pay'))).toBe(false)      // finance = Reports, not Pay
    expect(isNavActive('/portal/contractor-invoices', item('/portal/reports'))).toBe(false)
  })
})

describe('navGroupsFor(financeOnly) — accountant sees only finance surfaces', () => {
  const fin = navGroupsFor(true)
  const finHrefs = fin.flatMap((g) => g.items).map((i) => i.href)
  it('includes the finance hubs + expenses + invoices', () => {
    for (const h of ['/portal/pay', '/portal/reports', '/portal/expenses', '/portal/invoices']) {
      expect(finHrefs).toContain(h)
    }
  })
  it('excludes non-finance areas (jobs, clients, marketing, people, settings)', () => {
    for (const h of ['/portal/jobs', '/portal/clients', '/portal/marketing', '/portal/contractors', '/portal/settings']) {
      expect(finHrefs).not.toContain(h)
    }
  })
  it('drops now-empty groups', () => {
    expect(fin.every((g) => g.items.length > 0)).toBe(true)
  })
})

describe('reachability — nothing removed (source-level)', () => {
  const mw = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8')
  const settings = readFileSync(join(process.cwd(), 'src/app/portal/settings/page.tsx'), 'utf8')
  const payHub = readFileSync(join(process.cwd(), 'src/app/portal/pay/page.tsx'), 'utf8')
  const reportsHub = readFileSync(join(process.cwd(), 'src/app/portal/reports/page.tsx'), 'utf8')

  it('the accountant middleware allows the new hub + pay routes (or they would redirect out)', () => {
    for (const p of ['/portal/pay', '/portal/reports', '/portal/contractor-statements', '/portal/mileage']) {
      expect(mw).toContain(`'${p}'`)
    }
  })
  it('Accountant access is reachable from Settings (was a removed top-level tab)', () => {
    expect(settings).toMatch(/\/portal\/settings\/accountants/)
    expect(settings).toMatch(/Accountant access/)
  })
  it('the Pay hub links every former pay tab', () => {
    // 'Employee pay' now points at the full payroll system (/portal/payroll);
    // the old /portal/payroll/employee helper redirects there.
    for (const p of ['/portal/contractor-invoices/pay-run', '/portal/contractor-invoices', '/portal/contractor-statements', '/portal/payroll', '/portal/mileage']) {
      expect(payHub).toContain(p)
    }
  })
  it('the Reports hub links every former report tab', () => {
    for (const p of ['/portal/finance/profit-loss', '/portal/finance/job-margins', '/portal/finance/reconcile']) {
      expect(reportsHub).toContain(p)
    }
  })

  it('⌘K still reaches the hub children by name (P&L, Mileage, Calendar, etc.)', () => {
    const palette = readFileSync(join(process.cwd(), 'src/app/portal/_components/CommandPalette.tsx'), 'utf8')
    // 'Pay run' became 'Contractor pay' in Phase 5 so the palette matches the
    // workspace naming (Contractor pay | Payment history). Same route.
    for (const label of ['P&L statement', 'Mileage logbook', 'Calendar', 'Contractor pay', 'Contractor statements', 'Accountant access']) {
      expect(palette).toContain(label)
    }
    expect(palette).toMatch(/HUB_DESTINATIONS/)
  })
})
