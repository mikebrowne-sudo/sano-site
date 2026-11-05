/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz',
  generateRobotsTxt: true,
  // Keep internal tools / token-keyed / app routes OUT of the sitemap so
  // Google doesn't waste crawl budget on them or index thin utility pages.
  exclude: [
    '/email-signature',
    '/email-signature-*',
    '/preview',
    '/preview/*',
    '/share',
    '/share/*',
    '/client',
    '/client/*',
    '/portal',
    '/portal/*',
    '/contractor',
    '/contractor/*',
    '/proposals/*',
    '/collateral',
    '/collateral/*',
    '/agreement',
    '/agreement/*',
    '/remittance',
    '/remittance-*',
    '/training-docs',
    '/training-docs/*',
    '/contractor-setup',
    '/contractor-setup/*',
  ],
  // /contact reads searchParams, so it's dynamic and next-sitemap can't see
  // it in the prerender manifest — add it explicitly (it's the quote page).
  additionalPaths: async (config) => [await config.transform(config, '/contact')],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/email-signature',
          '/preview',
          '/share',
          '/client',
          '/portal',
          '/contractor',
          '/api',
        ],
      },
    ],
  },
  transform: async (config, path) => {
    // Service subpages get higher priority
    if (path.startsWith('/services/') && path !== '/services') {
      return { loc: path, priority: 0.8, changefreq: 'monthly' }
    }
    return { loc: path, priority: 0.7, changefreq: 'monthly' }
  },
}
