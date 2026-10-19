const nextConfig = {
  basePath: process.env.BASEPATH,

  eslint: {
    ignoreDuringBuilds: true
  },

  typescript: {
    ignoreBuildErrors: true
  },

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