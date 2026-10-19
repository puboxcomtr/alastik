"use client";

import { useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";

export function PasswordForm({ sinif = "form-grid" }: { sinif?: string }) {
  const [mevcut, setMevcut] = useState("");
  const [yeni, setYeni] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [durum, setDurum] = useState<{ tip: "ok" | "err"; mesaj: string } | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setDurum(null);
    if (yeni !== tekrar) { setDurum({ tip: "err", mesaj: "Yeni parolalar eşleşmiyor." }); return; }
    if (yeni.length < 4) { setDurum({ tip: "err", mesaj: "Yeni parola en az 4 karakter olmalıdır." }); return; }
    const token = localStorage.getItem("authToken");
    if (!token) { setDurum({ tip: "err", mesaj: "Oturum bulunamadı." }); return; }
    setGonderiliyor(true);
    try {
      const res = await fetch(API_ENDPOINTS.b2b.sifreDegistir(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({ currentPassword: mevcut, newPassword: yeni }),
      });
      const d = await res.json();
      if (d?.success) {
        setDurum({ tip: "ok", mesaj: d.message || "Parolanız güncellendi." });
        setMevcut(""); setYeni(""); setTekrar("");
      } else {
        setDurum({ tip: "err", mesaj: d?.message || "Parola değiştirilemedi." });
      }
    } catch {
      setDurum({ tip: "err", mesaj: "Bir hata oluştu, lütfen tekrar deneyiniz." });
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <>
      {durum ? (
        <div className={`alert ${durum.tip === "ok" ? "success" : "warn"}`}>{durum.mesaj}</div>
      ) : null}
      <form className={sinif} onSubmit={gonder}>
        <div>
          <label htmlFor="mevcutParola">Mevcut Parola</label>
          <input id="mevcutParola" type="password" autoComplete="current-password" required
            value={mevcut} onChange={(e) => setMevcut(e.target.value)} />
        </div>
        <div>
          <label htmlFor="yeniParola">Yeni Parola (en az 4 karakter)</label>
          <input id="yeniParola" type="password" autoComplete="new-password" minLength={4} required
            value={yeni} onChange={(e) => setYeni(e.target.value)} />
        </div>
        <div>
          <label htmlFor="yeniParolaTekrar">Yeni Parola (tekrar)</label>
          <input id="yeniParolaTekrar" type="password" autoComplete="new-password" minLength={4} required
            value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
        </div>
        <div>
          <button type="submit" className="btn-primary" disabled={gonderiliyor}>
            {gonderiliyor ? "Gönderiliyor…" : "Parolayı Değiştir"}
          </button>
        </div>
      </form>
    </>
  );
}
