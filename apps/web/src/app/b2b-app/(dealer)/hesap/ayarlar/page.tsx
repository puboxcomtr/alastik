"use client";

import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { PasswordForm } from "@components/b2b-theme/password-form";
import { SpinnerIcon } from "@components/b2b-theme/icons";

interface Me { name: string; email: string; cariKodu: string; phone: string; }

export default function HesapAyarlariPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setMe(d.data); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hesap Ayarları</h1>
          <p className="sub">
            Parolanızı buradan değiştirebilirsiniz. Ünvan, cari kodu ve limit bilgileri bizim tarafımızdan yönetilir.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Hesap Bilgileri</h3>
        {!me ? (
          <p className="note loading-row"><SpinnerIcon size={16} className="loading-brand" /> Yükleniyor…</p>
        ) : (
          <dl className="info-list">
            <div><dt>Ünvan</dt><dd>{me.name || "—"}</dd></div>
            <div><dt>Cari Kodu</dt><dd>{me.cariKodu || "—"}</dd></div>
            <div><dt>E-posta</dt><dd>{me.email || "—"}</dd></div>
            <div><dt>Telefon</dt><dd>{me.phone || "—"}</dd></div>
          </dl>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Parola Değiştir</h3>
        <PasswordForm />
      </div>
    </>
  );
}
