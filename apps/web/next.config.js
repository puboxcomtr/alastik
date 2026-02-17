/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3082/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alastik.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.alastik.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.artvinticaret.com.tr',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'www.artvinticaret.com.tr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'artvinticaret.com.tr',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'artvinticaret.com.tr',
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
        hostname: 's3-eu-west-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.wheel-size.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.wheel-size.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.wheel-size.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
