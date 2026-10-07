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
  },
  // The git commit this build came from (Netlify sets COMMIT_REF at build
  // time). Inlined at build, so /api/health can report which deploy is live
  // without reading env at runtime — the post-deploy smoke check waits for it.
  env: {
    BUILD_COMMIT: process.env.COMMIT_REF ?? '',
  },
}

export default nextConfig
