// Types
import type { Metadata } from "next";
import { cookies, headers } from 'next/headers';

import { getSiteBySlug, DEFAULT_SITE } from '@src/config/siteConfig';
import { getGtmId } from '@src/config/tracking';

// Font
import { Inter } from "next/font/google";

// Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Styles
import "bootstrap/dist/css/bootstrap.min.css";
import './globals.css';
import 'remixicon/fonts/remixicon.css';

// Library
import ThemeRegistry from '@components/providers/ThemeRegistry';
import Script from "next/script";

// @import
import MetaHead from "@components/layout/MetaHead";
import SiteHeader from "@src/views/SiteHeader";
import SiteFooter from "@src/views/SiteFooter";

// Context
import { BrandsProvider } from '@/src/context/BrandsContext';
import { CartProvider } from '@/src/context/CartContext';
import { FavouritesProvider } from '@/src/context/FavouritesContext';
import { LoadingProvider } from '@/src/context/LoadingContext';

// Global Loading Overlay
import GlobalLoadingOverlay from '@components/common/GlobalLoadingOverlay';


/* Modal */
import TireSearchClient from '@components/layout/Modals/TireSearchClient';
import MontageOfferModal from '@components/layout/Modals/MontageOffer';
import TireSize from '@components/layout/Modals/TireSize';
import Modal from '@components/ui/Modal';

/* Theme Settings */
import { getThemeSettings } from '@src/services/themeService';
import { SettingsProvider } from '@src/context/SettingsContext';

/* Site Status */
import { isSiteActive } from '@src/hooks/Theme/useGeneralSettings';
import UnderConstruction from '@src/views/maintenance/UnderConstruction';

// Inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/* Meta */
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const siteSlug = headersList.get('x-site') || DEFAULT_SITE;
  const site = getSiteBySlug(siteSlug) || getSiteBySlug(DEFAULT_SITE)!;
  return {
    title: site.metaTitle,
    description: site.metaDescription,
    icons: { icon: site.favicon },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Site durumunu kontrol et
  const siteActive = await isSiteActive();

  // Admin token kontrolü - cookie'den
  const cookieStore = await cookies();
  const nextAuthToken = cookieStore.get('next-auth.session-token')?.value;
  const adminToken = cookieStore.get('adminToken')?.value;
  const isAdminLoggedIn = !!nextAuthToken || !!adminToken;

  const allCookies = cookieStore.getAll();
  if (!siteActive && !isAdminLoggedIn) {
    return (
      <html lang="tr">
        <head />
        <body className={inter.variable}>
          <UnderConstruction />
        </body>
      </html>
    );
  }
  const site = cookieStore.get('site')?.value || 'alastik';
  const themeSettings = await getThemeSettings(site);

  return (
    <html lang="tr">
      <MetaHead />
      <body className={inter.variable}>
        {/* Google Tag Manager (noscript) — site bazlı container */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${getGtmId(site)}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <SettingsProvider initialTheme={themeSettings}>
          <ThemeRegistry>
            <LoadingProvider>
              <BrandsProvider>
                <CartProvider>
                  <FavouritesProvider>
                    <GlobalLoadingOverlay />
                    <SiteHeader />
                    {children}
                    <SiteFooter />
                    <Modal />
                    <TireSearchClient />
                    {site === 'lastikjantavm' && <MontageOfferModal />}
                    <TireSize />
                  </FavouritesProvider>
                </CartProvider>
              </BrandsProvider>
            </LoadingProvider>
          </ThemeRegistry>
        </SettingsProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          limit={5}
        />
        <Script id="global-session-validate" strategy="afterInteractive">
          {`
            (async function(){
              try {
                if (window && window.authService && window.authService.validateSession) {
                  const ok = await window.authService.validateSession();
                  if (!ok) {
                    window.dispatchEvent(new CustomEvent('sessionInvalidated'));
                  }
                }
              } catch {}
            })();
          `}
        </Script>

        {/* UI güvenlik temizliği */}
        <Script id="ui-safety-cleanup" strategy="afterInteractive">
          {`
            (function(){
              function cleanupOverlays(){
                try {
                  document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(function(el){ el.parentNode && el.parentNode.removeChild(el); });
                  var openModal = document.querySelector('.modal.show');
                  if (openModal) {
                    openModal.classList.remove('show');
                    openModal.setAttribute('aria-hidden','true');
                    if (openModal.style) { openModal.style.display = 'none'; }
                  }
                  document.body && document.body.classList.remove('modal-open');
                  if (document.body && document.body.style) { document.body.style.removeProperty('paddingRight'); }
                } catch(_){ }
              }
              setTimeout(cleanupOverlays, 0);
              setTimeout(cleanupOverlays, 250);
              setTimeout(cleanupOverlays, 750);
              window.addEventListener('focus', cleanupOverlays);
              window.addEventListener('hashchange', cleanupOverlays);
            })();
          `}
        </Script>

        {/* JavaScript Files */}
        <Script src="https://cdn.jsdelivr.net/npm/sweetalert2@11" strategy="afterInteractive" />
        <Script id="route-safety-guard" strategy="afterInteractive">
          {`
            (function(){
              try {
                var f = sessionStorage.getItem('force_category_url');
                if (f && typeof f === 'string') {
                  if (!location.pathname.includes('/category')) {
                    console.warn('[ROUTE_GUARD] Forcing category navigation', f);
                    sessionStorage.removeItem('force_category_url');
                    location.replace(f);
                  } else {
                    sessionStorage.removeItem('force_category_url');
                  }
                }
              } catch(_){}
            })();
          `}
        </Script>

        {/* Image Hostname Manager Initialize */}
        <Script id="image-hostname-manager" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && window.imageHostnameManager) {
              window.imageHostnameManager.ensureInitialized();
            }
          `}
        </Script>

        {/* Google API Script */}
        <Script
          src="https://apis.google.com/js/api.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}