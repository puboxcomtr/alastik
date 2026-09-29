import type { NextConfig } from "next";

/**
 * Tamamen statik dışa aktarım.
 *
 * `next build` çalıştığında `apps/web/out/` altına saf HTML/CSS/JS üretilir;
 * bu klasör herhangi bir statik sunucuya (nginx, S3, Netlify, cPanel…)
 * kopyalanabilir. Node.js sunucusu, veritabanı ya da API gerekmez.
 *
 * Görsel optimizasyonu kapalıdır (`unoptimized`): optimize eden ara katman
 * bir sunucu gerektirirdi.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Alt klasörde sunulacaksa (örn. site.com/bayi) burayı açın:
  // basePath: "/bayi",
};

export default nextConfig;
