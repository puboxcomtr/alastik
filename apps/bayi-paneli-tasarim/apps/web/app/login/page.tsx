import Image from "next/image";
import { LoginForm } from "./login-form";

/**
 * Giriş — bölünmüş düzen: solda marka paneli (siyah zemin + sarı vurgu),
 * sağda giriş formu. Kendi kendine kayıt YOK; "Bayimiz Olun" iletişim
 * sayfasına götürür, kayıt formu açmaz.
 */
export default function LoginPage() {
  return (
    <div className="login-split">
      <aside className="login-hero">
        <div className="hero-ic">
          <h1>
            B2B Lastik
            <br />
            <span>Tedarik Platformu</span>
          </h1>
          <p>
            Binlerce lastik ve jant ürününe hızlı erişim, özel bayi fiyatları
            ve güvenilir tedarik zinciri.
          </p>
          <ul className="hero-ozellikler">
            <li>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Güvenli Alışveriş
            </li>
            <li>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="1.5" />
                <circle cx="17.5" cy="17.5" r="1.5" />
              </svg>
              Hızlı Teslimat
            </li>
            <li>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 1v22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Özel Fiyatlar
            </li>
          </ul>
        </div>
        <div className="hero-alt">© LastikJantAVM. Tüm hakları saklıdır.</div>
      </aside>

      <main className="login-form-side">
        <div className="login-box sade">
          <Image
            className="logo"
            src="/lastikjant-logo.png"
            alt="LastikJantAVM"
            width={230}
            height={46}
            priority
          />
          <h2>Hesabınıza giriş yapın</h2>
          <p className="sub">Bayi panelinize erişmek için bilgilerinizi girin</p>

          <LoginForm />

          <div className="login-veya">
            <span>veya</span>
          </div>
          <p className="login-cta-baslik">Henüz hesabınız yok mu?</p>
          <a className="login-cta" href="/bayimiz-olun">
            Bayimiz Olun <span aria-hidden="true">→</span>
          </a>
        </div>
      </main>
    </div>
  );
}
