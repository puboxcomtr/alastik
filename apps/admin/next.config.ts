import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/tr/dashboards/ecommerce',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(tr)',
        destination: '/:lang/dashboards/ecommerce',
        permanent: true,
        locale: false
      },
      {
        source: '/((?!(?:tr|front-pages|favicon.ico)\\b)):path',
        destination: '/tr/:path',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
