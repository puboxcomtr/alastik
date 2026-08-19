import Script from "next/script";
import { headers } from "next/headers";
import { getSiteBySlug, DEFAULT_SITE } from "@/src/config/siteConfig";

export default async function MetaHead() {
  const hdrs = await headers();
  const siteSlug = hdrs.get("x-site") || DEFAULT_SITE;
  const site = getSiteBySlug(siteSlug) || getSiteBySlug(DEFAULT_SITE);
  const themeCss = site.theme.themeCss;
  return (
    <>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        {/* Preload fonts */}
        <link
          rel="preload"
          href="/alastik/assets/fonts/inter-variable-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/alastik/assets/icons/cartzilla-icons.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Google Search Console doğrulaması — site başına ayrı kod */}
        {siteSlug === "lastikjantavm" ? (
          <meta name="google-site-verification" content="G4wbqvmKtztasq6HYX4WX_d0fLS7GHGdnhApayTSVtE" />
        ) : (
          <meta name="google-site-verification" content="yubc1j2taIzdyUWWFlVWkSAYzwU8L_q-aEKtX1zdGh4" />
        )}

        {/* CSS Files */}
        <link rel="stylesheet" href="/alastik/assets/icons/cartzilla-icons.min.css" />
        <link rel="preload" href={themeCss} as="style" />
        <link rel="stylesheet" href={themeCss} id="theme-styles" />
      </head>
      {/* Google Ads (gtag.js) */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-18022245202"
        strategy="afterInteractive"
      />
      <Script id="google-ads" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18022245202');
        `}
      </Script>

      {/* Google Tag Manager */}
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-NVV296LW');
        `}
      </Script>
    </>
  );
}