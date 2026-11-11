/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Keep puppeteer-core + @sparticuz/chromium out of the webpack
  // bundle so they load at runtime from node_modules. Both packages
  // do dynamic requires / ship a native Chromium binary that webpack
  // can't pack into a serverless function.
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    // Server actions default to a 1 MB body, which rejected ordinary phone
    // photos on staff document uploads. Netlify functions cap request bodies at
    // ~6 MB anyway, so match that. Contractor/agreement uploads bypass this
    // entirely (direct-to-storage — see src/lib/worker-document-upload.ts).
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  // The git commit this build came from (Netlify sets COMMIT_REF at build
  // time). Inlined at build, so /api/health can report which deploy is live
  // without reading env at runtime — the post-deploy smoke check waits for it.
  env: {
    BUILD_COMMIT: process.env.COMMIT_REF ?? '',
  },
}

export default nextConfig
