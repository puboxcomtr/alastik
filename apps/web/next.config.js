/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // mevcut API yönlendirmesi
      {
        source: '/api/:path*',
        destination: 'http://localhost:3082/api/:path*',
      },
      // yeni eklediğimiz assets yönlendirmesi
      {
        source: '/assets/:path*',
        destination: '/admin/public/assets/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.artvinticaret.com.tr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'www.artvinticaret.com.tr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'artvinticaret.com.tr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'artvinticaret.com.tr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-eu-west-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3082',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.wheel-size.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.wheel-size.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.wheel-size.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
