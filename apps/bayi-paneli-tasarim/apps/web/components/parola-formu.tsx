"use client";

import { useState } from "react";

/**
 * Parola değiştirme formu.
 *
 * ŞABLON NOTU: arka uç olmadığı için form GÖNDERİLMEZ; girilen değerler
 * hiçbir yere iletilmez ve saklanmaz. Gerçek uygulamada gönderimi kendi
 * ucunuza bağlayın (mevcut parola doğrulaması sunucuda yapılmalıdır).
 */
export function ParolaFormu({ sinif = "form-grid" }: { sinif?: string }) {
  const [uyari, setUyari] = useState(false);

  return (
    <>
      {uyari ? (
        <div className="alert warn">
          Bu bir tasarım şablonudur — parola değiştirme isteği gönderilmedi.
        </div>
      ) : null}
      <form
        className={sinif}
        onSubmit={(e) => {
          e.preventDefault();
          setUyari(true);
        }}
      >
        <div>
          <label htmlFor="mevcutParola">Mevcut Parola</label>
          <input
            id="mevcutParola"
            name="mevcutParola"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label htmlFor="yeniParola">Yeni Parola (en az 8 karakter)</label>
          <input
            id="yeniParola"
            name="yeniParola"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label htmlFor="yeniParolaTekrar">Yeni Parola (tekrar)</label>
          <input
            id="yeniParolaTekrar"
            name="yeniParolaTekrar"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="full">
          <button className="primary" type="submit">
            Parolayı Güncelle
          </button>
        </div>
      </form>
    </>
  );
}
