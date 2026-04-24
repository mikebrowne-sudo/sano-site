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
}

export default nextConfig
