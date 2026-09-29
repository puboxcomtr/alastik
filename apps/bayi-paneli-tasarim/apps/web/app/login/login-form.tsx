"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Giriş formu.
 *
 * ŞABLON NOTU: kimlik doğrulama YOKTUR. "Giriş Yap" yalnızca bayi paneline
 * götürür; girilen e-posta ve parola hiçbir yere gönderilmez ve saklanmaz.
 * Gerçek uygulamada burayı kendi oturum açma ucunuza bağlayın.
 */
export function LoginForm() {
  const router = useRouter();
  const [goster, setGoster] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/");
      }}
    >
      <label htmlFor="email">E-posta Adresi</label>
      <div className="girdi-sarici">
        <span className="girdi-ikon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
        </span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="ornek@firma.com"
          required
        />
      </div>

      <label htmlFor="password">Şifre</label>
      <div className="girdi-sarici">
        <span className="girdi-ikon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <input
          id="password"
          name="password"
          type={goster ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••••"
          required
          minLength={8}
        />
        <button
          type="button"
          className="parola-goz"
          onClick={() => setGoster((g) => !g)}
          aria-label={goster ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {goster ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <path d="m1 1 22 22" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <div className="login-satir">
        <span />
        <a className="unuttum" href="/bayimiz-olun">
          Şifremi unuttum
        </a>
      </div>

      <button className="primary" type="submit">
        Giriş Yap <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
