// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASEPATH,

  eslint: {
    ignoreDuringBuilds: true
  },

  typescript: {
    ignoreBuildErrors: true
  },

  // Sabit build id, /_next/static/<buildId>/ altındaki dosya listesi "immutable" olarak
  // önbelleğe alındığı için tarayıcıda eskiyip silinmiş chunk'ları istemeye ve sayfanın
  // yüklemede takılı kalmasına yol açıyordu. Her derleme benzersiz kimlik almalı.
  generateBuildId: async function () {
    return process.env.BUILD_ID || `build-${Date.now()}`
  },

  output: 'standalone',

  redirects: async function () {
    return [
      {
        source: '/',
        destination: '/tr/apps/ecommerce/',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(tr)',
        destination: '/:lang/apps/ecommerce/',
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

module.exports = nextConfig