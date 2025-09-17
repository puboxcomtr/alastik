
// Types
import type { Metadata } from "next";

// Font
import { Inter } from "next/font/google";

// Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Styles
import "bootstrap/dist/css/bootstrap.min.css";
import './globals.css';
import "../styles/toast.css";
import 'remixicon/fonts/remixicon.css';

// Library
import { ThemeProvider, CssBaseline } from '@mui/material';
import ThemeRegistry from '@components/providers/ThemeRegistry';
import Script from "next/script";

// @import
import MetaHead from "@components/layout/MetaHead";
import Header from "@components/layout/Header/Header";
import Footer from "@components/layout/Footer/Footer";

// Hostnames
import { imageHostnameManager } from '../lib/imageHostnameManager';

/* Modal */
import TireSearchClient from '@components/layout/Modals/TireSearchClient';
import Modal from '@components/ui/Modal';

// Inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/* Meta */
// Default
export const metadata: Metadata = {
  title: "Anasayfa - ALastik.com",
  description: "Kaliteli lastik çeşitleri ve uygun fiyatlarla ALastik.com'da!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <MetaHead />
      <body className={inter.variable}>
        <ThemeRegistry>
          <Header />
          {children}
          <Footer />
          <Modal />
          <TireSearchClient />
        </ThemeRegistry>

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
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

        {/* Session validation: tüm sitede oturumu doğrula */}
        <Script id="global-session-validate" strategy="afterInteractive">
          {`
            (async function(){
              try {
                if (window && window.authService && window.authService.validateSession) {
                  const ok = await window.authService.validateSession();
                  if (!ok) {
                    // Seçim: sadece header state'i güncelliyoruz. Zorunlu yönlendirme yok.
                    window.dispatchEvent(new CustomEvent('sessionInvalidated'));
                  }
                }
              } catch {}
            })();
          `}
        </Script>

        {/* UI güvenlik temizliği: kalmış backdrop/overlay varsa tıklamayı engellemesin */}
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
              // İlk yükleme ve kısa aralıklarla tekrarla
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
