"use client";

// Teslimat Adresi — DIA carisinden çekilir; yeni eklenen adres de DIA cariye
// yazılır. Adres seçimi burada yapılır (ödeme sayfasında kullanılmak üzere).
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { showToast } from "@components/b2b-theme/toast";

type Address = {
  id: string;
  baslik: string;
  teslimat: boolean;
  ana: boolean;
  adres: string;
  il: string;
  ilce: string;
  telefon: string;
};

type City = { cityId: string; cityName: string };
type District = { districtId: string; districtName: string };

const BOS_FORM = {
  baslik: "",
  adSoyad: "",
  telefon: "",
  il: "",
  ilce: "",
  adres: "",
  adresDetay: "",
  postaKodu: "",
};

export function DeliveryAddress({
  onSelectedChange,
}: {
  // Seçili teslimat adresi değişince üst bileşene bildirir.
  onSelectedChange?: (address: Address | null) => void;
} = {}) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(BOS_FORM);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [ilId, setIlId] = useState("");

  function token(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  }

  function listeyiIsle(list: Address[]) {
    // Açık adresi boş olanlar gösterilmez
    const gecerli = list.filter((a) => a.adres.trim());
    setAddresses(gecerli);
    setSelectedId((prev) => {
      if (prev && gecerli.some((a) => a.id === prev)) return prev;
      const teslimat = gecerli.find((a) => a.teslimat) || gecerli.find((a) => a.ana) || gecerli[0];
      return teslimat?.id ?? "";
    });
  }

  useEffect(() => {
    const t = token();
    if (!t) {
      setAddresses([]);
      return;
    }
    fetch(API_ENDPOINTS.b2b.adresler(), { headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => listeyiIsle(res?.success ? res.data : []))
      .catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seçili adresi (şehri dahil) üst bileşene bildir.
  useEffect(() => {
    const sec = addresses?.find((a) => a.id === selectedId) || null;
    onSelectedChange?.(sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, addresses]);

  // İl listesi form ilk açıldığında bir kez çekilir
  useEffect(() => {
    if (!formAcik || cities.length > 0) return;
    fetch(API_ENDPOINTS.location.cities(), { headers: { "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => setCities(res?.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAcik]);

  function ilSec(cityId: string) {
    const c = cities.find((x) => x.cityId === cityId);
    setIlId(cityId);
    setForm((f) => ({ ...f, il: c?.cityName || "", ilce: "" }));
    setDistricts([]);
    if (cityId) {
      fetch(API_ENDPOINTS.location.districts(cityId), { headers: { "X-Site": "b2b" } })
        .then((r) => r.json())
        .then((res) => setDistricts(res?.data || []))
        .catch(() => {});
    }
  }

  function adresEkle(e: React.FormEvent) {
    e.preventDefault();
    const t = token();
    if (!t || !form.adres.trim() || gonderiliyor) return;
    setGonderiliyor(true);
    fetch(API_ENDPOINTS.b2b.adresEkle(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, "X-Site": "b2b" },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) {
          const list: Address[] = res.data || [];
          listeyiIsle(list);
          // Yeni ekleneni seç (sonuncu teslimat adresi)
          const yeni = [...list].reverse().find((a) => a.teslimat);
          if (yeni) setSelectedId(yeni.id);
          setForm(BOS_FORM);
          setIlId("");
          setDistricts([]);
          setFormAcik(false);
          showToast("Adres eklendi", "ok");
        } else {
          showToast(res?.message || "Adres eklenemedi", "bilgi");
        }
      })
      .catch(() => showToast("Adres eklenemedi", "bilgi"))
      .finally(() => setGonderiliyor(false));
  }

  return (
    <div className="cart-card delivery-card">
      <div className="delivery-top">
        <h2 className="cart-card-title">Teslimat Adresi</h2>
        <button type="button" className="delivery-change" onClick={() => setFormAcik(true)}>
          Adres Ekle
        </button>
      </div>

      {addresses === null ? (
        <p className="note" style={{ padding: "0.6rem 0" }}>Adresler yükleniyor…</p>
      ) : addresses.length === 0 ? (
        <p className="note delivery-empty">Henüz adres bulunamadı.</p>
      ) : (
        <div className="adres-liste">
          {addresses.map((a) => (
            <label key={a.id} className={`adres-secenek${selectedId === a.id ? " secili" : ""}`}>
              <input
                type="radio"
                name="teslimatAdresi"
                checked={selectedId === a.id}
                onChange={() => setSelectedId(a.id)}
              />
              <span className="adres-radio" aria-hidden="true" />
              <div className="adres-govde">
                <div className="adres-baslik">
                  {a.baslik}
                  {a.ana ? <span className="adres-rozet">Varsayılan</span> : null}
                </div>
                <div className="adres-metin">{a.adres}</div>
                {[a.ilce, a.il].filter(Boolean).join(" / ") || a.telefon ? (
                  <div className="adres-alt">
                    {[a.ilce, a.il].filter(Boolean).join(" / ")}
                    {a.telefon ? ` · ${a.telefon}` : ""}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      )}

      {formAcik ? (
        <div
          className="adres-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFormAcik(false);
          }}
        >
          <div className="adres-modal" role="dialog" aria-label="Yeni teslimat adresi">
            <div className="adres-modal-head">
              <h3>Yeni Teslimat Adresi</h3>
              <button type="button" className="adres-modal-kapat" aria-label="Kapat" onClick={() => setFormAcik(false)}>
                ×
              </button>
            </div>
            <form className="adres-form" onSubmit={adresEkle}>
              <input
                type="text"
                placeholder="Adres Başlığı (ör. Şube, Depo)"
                value={form.baslik}
                onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              />
              <input
                type="text"
                placeholder="Ad Soyad"
                value={form.adSoyad}
                onChange={(e) => setForm({ ...form, adSoyad: e.target.value })}
              />
              <input
                type="text"
                placeholder="Telefon"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
              />
              <div className="adres-form-satir">
                <select value={ilId} onChange={(e) => ilSec(e.target.value)}>
                  <option value="">İl seçiniz</option>
                  {cities.map((c) => (
                    <option key={c.cityId} value={c.cityId}>{c.cityName}</option>
                  ))}
                </select>
                <select
                  value={form.ilce}
                  onChange={(e) => setForm({ ...form, ilce: e.target.value })}
                  disabled={districts.length === 0}
                >
                  <option value="">{ilId ? "İlçe seçiniz" : "Önce il seçin"}</option>
                  {districts.map((d) => (
                    <option key={d.districtId} value={d.districtName}>{d.districtName}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Adres *"
                rows={2}
                value={form.adres}
                onChange={(e) => setForm({ ...form, adres: e.target.value })}
              />
              <input
                type="text"
                placeholder="Adres Detay (bina, kat, daire)"
                value={form.adresDetay}
                onChange={(e) => setForm({ ...form, adresDetay: e.target.value })}
              />
              <input
                type="text"
                placeholder="Posta Kodu"
                value={form.postaKodu}
                onChange={(e) => setForm({ ...form, postaKodu: e.target.value })}
              />
              <button type="submit" className="primary" disabled={gonderiliyor || !form.adres.trim()}>
                {gonderiliyor ? "Kaydediliyor…" : "Adresi Kaydet"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
