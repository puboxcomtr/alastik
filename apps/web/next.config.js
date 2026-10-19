const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    const mediaFolders = ['urun', 'uploads', 'blog', 'kategori', 'marka', 'sliders', 'theme', 'banners', 'montage', 'general'];
    const imagePattern = '(.+\\.(?:jpg|jpeg|png|webp|gif|avif|svg|ico))';

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3082/api/:path*',
        },
        ...mediaFolders.map(folder => ({
          source: `/${folder}/:file${imagePattern}`,
          destination: `http://localhost:3082/${folder}/:file`,
        })),
        {
          source: `/genel/:file${imagePattern}`,
          destination: 'http://localhost:3082/general/:file',
        },
      ],
      afterFiles: [],
      fallback: mediaFolders.map(folder => ({
        source: `/${folder}/:path*`,
        destination: `http://localhost:3082/${folder}/:path*`,
      })),
    };
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
       {
        protocol: 'https',
        hostname: 'dev.alastik.com',
        port: '4082',
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
