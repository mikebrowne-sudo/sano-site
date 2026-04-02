/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.co.nz',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
  },
  transform: async (config, path) => {
    // Service subpages get higher priority
    if (path.startsWith('/services/') && path !== '/services') {
      return { loc: path, priority: 0.8, changefreq: 'monthly' }
    }
    return { loc: path, priority: 0.7, changefreq: 'monthly' }
  },
}
