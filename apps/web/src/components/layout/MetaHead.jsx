import Script from "next/script";

export default function MetaHead() {
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
          href="/assets/fonts/inter-variable-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/icons/cartzilla-icons.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="google-site-verification" content="yubc1j2taIzdyUWWFlVWkSAYzwU8L_q-aEKtX1zdGh4" />

        {/* CSS Files */}
        <link rel="stylesheet" href="/assets/icons/cartzilla-icons.min.css" />
        <link rel="preload" href="/assets/css/theme.min.css" as="style" />
        <link rel="stylesheet" href="/assets/css/theme.min.css" id="theme-styles" />
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
    </>
  );
}