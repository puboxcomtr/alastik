"use client";

// Cari Hesap Özeti — bakiye + borç/alacak, vadesi geçen borç, hesap bilgileri ve
// parola işlemleri (tek sayfa). Kaynak: /cari-ozet + /vade-takvimi + /me (hepsi DB).
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { AlertIcon, SpinnerIcon } from "@components/b2b-theme/icons";
import { PremiumBadge } from "@components/b2b-theme/premium-badge";

interface Ozet {
  cariKodu: string;
  balanceKurus: number;
  borcKurus: number;
  alacakKurus: number;
  overdueKurus: number | null;
}
interface DueItem { date: string; amount: number; invoiceNo: string; }

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (kurus: number) => `${nf.format((kurus || 0) / 100)} TL`;

function daysBetween(a: string, b: string): number {
  const d1 = new Date(`${a}T00:00:00`).getTime();
  const d2 = new Date(`${b}T00:00:00`).getTime();
  return Math.round((d2 - d1) / 86400000);
}

export default function CariPage() {
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [me, setMe] = useState<{ name: string; email: string; cariKodu: string; premium?: boolean } | null>(null);
  const [items, setItems] = useState<DueItem[]>([]);
  const [today, setToday] = useState("");
  const [error, setError] = useState(false);

  // Parola formu
  const [mevcut, setMevcut] = useState("");
  const [yeni, setYeni] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [pwDurum, setPwDurum] = useState<{ tip: "ok" | "err"; mesaj: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    const h = { Authorization: `Bearer ${token}`, "X-Site": "b2b" };
    Promise.all([
      fetch(API_ENDPOINTS.b2b.cariOzet(), { headers: h }).then((r) => r.json()),
      fetch(API_ENDPOINTS.b2b.dueDates(), { headers: h }).then((r) => r.json()).catch(() => null),
      fetch(API_ENDPOINTS.b2b.me(), { headers: h }).then((r) => r.json()).catch(() => null),
    ]).then(([o, v, m]) => {
      if (o?.success && o.data) setOzet(o.data); else setError(true);
      if (v?.success && v.data) { setItems(v.data.items || []); setToday(v.data.today || ""); }
      if (m?.success && m.data) setMe(m.data);
    }).catch(() => setError(true));
  }, []);

  const overdueDays = useMemo(() => {
    if (!items.length || !today) return 0;
    const past = items.filter((it) => it.date < today).map((it) => it.date).sort();
    return past.length ? Math.max(0, daysBetween(past[0], today)) : 0;
  }, [items, today]);

  async function parolaGuncelle(e: React.FormEvent) {
    e.preventDefault();
    setPwDurum(null);
    if (yeni !== tekrar) { setPwDurum({ tip: "err", mesaj: "Yeni parolalar eşleşmiyor." }); return; }
    if (yeni.length < 4) { setPwDurum({ tip: "err", mesaj: "Yeni parola en az 4 karakter olmalıdır." }); return; }
    const token = localStorage.getItem("authToken");
    if (!token) { setPwDurum({ tip: "err", mesaj: "Oturum bulunamadı." }); return; }
    setPwBusy(true);
    try {
      const res = await fetch(API_ENDPOINTS.b2b.sifreDegistir(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({ currentPassword: mevcut, newPassword: yeni }),
      });
      const d = await res.json();
      if (d?.success) { setPwDurum({ tip: "ok", mesaj: d.message || "Parolanız güncellendi." }); setMevcut(""); setYeni(""); setTekrar(""); }
      else setPwDurum({ tip: "err", mesaj: d?.message || "Parola değiştirilemedi." });
    } catch { setPwDurum({ tip: "err", mesaj: "Bir hata oluştu." }); }
    finally { setPwBusy(false); }
  }

  if (error) {
    return (
      <>
        <div className="page-head"><div><h1>Cari Hesap Özeti</h1></div></div>
        <p className="note">Cari bilgileriniz şu an yüklenemedi.</p>
      </>
    );
  }

  const overdue = ozet?.overdueKurus ?? 0;

  return (
    <>
      <div className="page-head"><div><h1>Cari Hesap Özeti</h1></div></div>

      {/* ── Üst sıra: Bakiye + Vadesi Geçen ── */}
      <div className="cari-grid">
        <section className="cari-card cari-balance">
          <div className="cari-card-head">
            <span className="cari-card-title">Bakiye</span>
          </div>
          {/* Bakiye işaretlidir (alacaklı → negatif): (B) borçlu / (A) alacaklı */}
          <div className="cari-big">
            {ozet ? `${money(Math.abs(ozet.balanceKurus))}${ozet.balanceKurus > 0 ? " (B)" : ozet.balanceKurus < 0 ? " (A)" : ""}` : "…"}
          </div>
          {ozet ? (
            <div className="cari-pills">
              <span className="cari-pill"><i className="dot red" /> Borç <strong>{money(ozet.borcKurus)}</strong></span>
              <span className="cari-pill"><i className="dot green" /> Alacak <strong>{money(ozet.alacakKurus)}</strong></span>
            </div>
          ) : null}
        </section>

        <section className="cari-card cari-overdue">
          <div className="cari-card-head">
            <span className="cari-ico warn"><AlertIcon size={20} /></span>
            <span className="cari-card-title">Vadesi Geçen Borç</span>
            {overdueDays > 0 ? <span className="cari-badge gecikme">{overdueDays} GÜN GECİKME</span> : null}
          </div>
          <div className="cari-big orange">{ozet ? money(overdue) : "…"}</div>
          <div className="cari-overdue-foot">
            <span className="cari-note">{overdue > 0 ? "Geciken bakiyenizin ödenmesi gerekmektedir." : "Vadesi geçen borcunuz bulunmuyor."}</span>
            {overdue > 0 ? <a className="cari-btn-odeme" href="/odeme">Ödeme Yap</a> : null}
          </div>
        </section>
      </div>

      {/* ── Alt sıra: Hesap Bilgileri + Şifre İşlemleri ── */}
      <div className="cari-grid" style={{ marginTop: "1.1rem" }}>
        <section className="cari-card">
          <h3 className="cari-block-title">Hesap Bilgileri</h3>
          {!me ? (
            <p className="note loading-row"><SpinnerIcon size={16} className="loading-brand" /> Yükleniyor…</p>
          ) : (
            <div className="cari-info">
              <div><span className="k">Cari Kodu:</span><span className="v">{ozet?.cariKodu || me.cariKodu || "—"}</span></div>
              <div><span className="k">Firma:</span><span className="v">{me.name || "—"}</span></div>
              <div><span className="k">E-Mail:</span><span className="v">{me.email || "—"}</span></div>
              {me.premium ? <div><span className="k">Cari Tipi:</span><span className="v"><PremiumBadge /></span></div> : null}
            </div>
          )}
        </section>

        <section className="cari-card">
          <h3 className="cari-block-title">Şifre İşlemleri</h3>
          {pwDurum ? <div className={`alert ${pwDurum.tip === "ok" ? "success" : "warn"}`}>{pwDurum.mesaj}</div> : null}
          <form className="cari-pw-form" onSubmit={parolaGuncelle}>
            <input type="password" autoComplete="current-password" placeholder="Eski Şifre" required value={mevcut} onChange={(e) => setMevcut(e.target.value)} />
            <input type="password" autoComplete="new-password" placeholder="Yeni Şifre" minLength={4} required value={yeni} onChange={(e) => setYeni(e.target.value)} />
            <input type="password" autoComplete="new-password" placeholder="Yeni Şifre Tekrar" minLength={4} required value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
            <button type="submit" className="cari-btn-guncelle" disabled={pwBusy}>{pwBusy ? "Güncelleniyor…" : "Güncelle"}</button>
          </form>
        </section>
      </div>
    </>
  );
}
