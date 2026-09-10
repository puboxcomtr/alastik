"use client";

import { useMemo, useState } from "react";
import { Acilir } from "@components/b2b-tema/acilir";
import { AramaFormu } from "@components/b2b-tema/arama-formu";
import { MevsimIcon } from "@components/b2b-tema/icons";
import { SepeteEkle } from "@components/b2b-tema/sepete-ekle";
import { formatKurus } from "@components/b2b-tema/lib/format";
import {
  LASTIKLER,
  toplamStok,
  type Lastik,
  type Mevsim,
  type UrunDurumu,
} from "@components/b2b-tema/lib/ornek-veri";

const SAYFA_BOYU = 10; // İlk gösterim ve "Daha Fazla Göster" adımı

const MEVSIM_ETIKET: Record<string, string> = { yaz: "Yaz", kis: "Kış", dortMevsim: "4 Mevsim" };

// Sıralanabilir sütunlar ve karşılık gelen değer çıkarıcıları
type SiralamaAlani = "stokKodu" | "ebat" | "marka" | "mevsim" | "dot" | "stok" | "fiyat";
type Yon = "asc" | "desc";

type Filtre = {
  q: string;
  marka: string;
  mevsim: string;
  ebat: string;
  dot: string;
  depo: string;
  ikinciEl: boolean;
  rft: boolean;
  cTipi: boolean;
  ev: boolean;
  xl: boolean;
};

const BOS_FILTRE: Filtre = {
  q: "",
  marka: "",
  mevsim: "",
  ebat: "",
  dot: "",
  depo: "",
  ikinciEl: false,
  rft: false,
  cTipi: false,
  ev: false,
  xl: false,
};

const CIPLER = [
  { anahtar: "rft", etiket: "RFT" },
  { anahtar: "cTipi", etiket: "C Serisi" },
  { anahtar: "xl", etiket: "XL" },
] as const;

/** Arama ayraca takılmasın: "2055" → "205/55 R16" bulunmalı. */
function sadelestir(metin: string): string {
  return metin.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
}

function eslesiyorMu(urun: Lastik, f: Filtre): boolean {
  if (f.q) {
    const aranan = sadelestir(f.q);
    const havuz = sadelestir(
      `${urun.ebat} ${urun.desen} ${urun.marka} ${urun.stokKodu}`,
    );
    if (!havuz.includes(aranan)) return false;
  }
  if (f.marka && urun.marka !== f.marka) return false;
  if (f.mevsim && urun.mevsim !== (f.mevsim as Mevsim)) return false;
  if (f.ebat && urun.ebat !== f.ebat) return false;
  if (f.dot && String(urun.dotYili) !== f.dot) return false;
  if (f.depo) {
    const depoStok = urun.stoklar.find((s) => s.warehouseId === f.depo);
    if (!depoStok || depoStok.kullanilabilir === 0) return false;
  }
  /**
   * "Sadece 2. El Lastikler" çipi: basılı değilse YALNIZCA sıfır ürün görünür,
   * basılıysa yalnızca 2. el. İkisini birlikte listeleyen bir durum yok —
   * toptan alıcı için sıfır ve 2. el ayrı işler.
   */
  if (urun.urunDurumu !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
  if (f.rft && !urun.rft) return false;
  if (f.cTipi && !urun.cTipi) return false;
  if (f.ev && !urun.ev) return false;
  if (f.xl && !urun.xl) return false;
  return true;
}

/**
 * Arama + filtre barı + ürün tablosu (anasayfa ve /lastik paylaşır).
 *
 * ŞABLON NOTU: süzme tarayıcıda, `lib/ornek-veri.ts` dizisi üzerinde yapılır.
 * Gerçek uygulamada bu bileşen fiyat ve stoğu sunucudan istemeli; fiyat
 * istemcide hesaplanmamalıdır.
 */
export function Katalog(
  { urunler, sabitDurum, baslik }: { urunler?: Lastik[]; sabitDurum?: UrunDurumu; baslik?: string } = {},
) {
  const kaynak = urunler ?? LASTIKLER;
  // sabitDurum verilirse blok tek türe kilitlenir (sekme gizlenir), filtre o
  // duruma göre başlatılır ve Temizle bu başlangıca döner.
  const bosFiltre: Filtre = sabitDurum
    ? { ...BOS_FILTRE, ikinciEl: sabitDurum === "ikinciEl" }
    : BOS_FILTRE;
  const [filtre, setFiltre] = useState<Filtre>(bosFiltre);
  const [sayfa, setSayfa] = useState(1);
  const [siralama, setSiralama] = useState<{ alan: SiralamaAlani; yon: Yon } | null>(null);

  const eslesenler = useMemo(
    () => kaynak.filter((u) => eslesiyorMu(u, filtre)),
    [filtre, kaynak],
  );

  // Sütun başlığına tıklanınca aktif sıralama uygulanır (yoksa orijinal sıra)
  const siralanmis = useMemo(() => {
    if (!siralama) return eslesenler;
    const deger = (u: Lastik): string | number => {
      switch (siralama.alan) {
        case "stokKodu": return u.stokKodu || "";
        case "ebat": return u.ebat || "";
        case "marka": return u.marka || "";
        case "mevsim": return MEVSIM_ETIKET[u.mevsim] || u.mevsim;
        case "dot": return u.dotYili ?? -Infinity;
        case "stok": return toplamStok(u.stoklar);
        case "fiyat": return u.fiyat?.birimNetKurus ?? -Infinity;
      }
    };
    const carpan = siralama.yon === "asc" ? 1 : -1;
    return [...eslesenler].sort((a, b) => {
      const da = deger(a), db = deger(b);
      if (typeof da === "number" && typeof db === "number") return (da - db) * carpan;
      return String(da).localeCompare(String(db), "tr") * carpan;
    });
  }, [eslesenler, siralama]);

  // Filtre seçenekleri gerçek ürünlerden türetilir (ne varsa o gelir)
  const secenekler = useMemo(() => {
    const markaSet = new Set<string>();
    const mevsimSet = new Set<Mevsim>();
    const dotSet = new Set<number>();
    const depoMap = new Map<string, string>();
    for (const u of kaynak) {
      // Filtre seçenekleri aktif sekmenin (Sıfır/2.El) ürünlerinden türetilir
      if (u.urunDurumu !== (filtre.ikinciEl ? "ikinciEl" : "sifir")) continue;
      if (u.marka) markaSet.add(u.marka);
      if (u.mevsim) mevsimSet.add(u.mevsim);
      if (u.dotYili != null) dotSet.add(u.dotYili);
      for (const st of u.stoklar) depoMap.set(st.warehouseId, st.depoAd);
    }
    return {
      markalar: [...markaSet].sort((a, b) => a.localeCompare(b, "tr")),
      mevsimler: [...mevsimSet].map((m) => ({ deger: m, etiket: MEVSIM_ETIKET[m] || m })),
      dotlar: [...dotSet].sort((a, b) => b - a),
      depolar: [...depoMap.entries()].map(([id, ad]) => ({ id, ad })),
    };
  }, [kaynak, filtre.ikinciEl]);

  const toplam = eslesenler.length;
  // Load-more: baştan sayfa*SAYFA_BOYU kadar ürün gösterilir (sıralanmış, kümülatif)
  const gorunen = siralanmis.slice(0, sayfa * SAYFA_BOYU);
  const dahaVar = toplam > gorunen.length;

  const filtreAktif = Boolean(
    filtre.q ||
      filtre.marka ||
      filtre.mevsim ||
      filtre.ebat ||
      filtre.dot ||
      filtre.depo ||
      CIPLER.some((c) => filtre[c.anahtar]),
  );

  /** Filtre değişince ilk sayfaya dönülür. */
  function guncelle(parca: Partial<Filtre>): void {
    setFiltre((onceki) => ({ ...onceki, ...parca }));
    setSayfa(1);
  }

  /** Sütun başlığına tıklama: aynı sütun ise yön değişir, farklıysa artan başlar. */
  function siralamaTikla(alan: SiralamaAlani): void {
    setSiralama((o) =>
      o && o.alan === alan
        ? { alan, yon: o.yon === "asc" ? "desc" : "asc" }
        : { alan, yon: "asc" },
    );
    setSayfa(1);
  }

  /** Aktif sıralama sütunundaki ok işareti (▲ artan / ▼ azalan). */
  function okIsareti(alan: SiralamaAlani): string {
    if (!siralama || siralama.alan !== alan) return "";
    return siralama.yon === "asc" ? " ▲" : " ▼";
  }

  return (
    <>
      {/* sabitDurum'da blok başlığı; aksi halde Sıfır / 2.El sekmeleri */}
      {sabitDurum ? (
        baslik ? <h2 className="vitrin-baslik">{baslik}</h2> : null
      ) : (
        <div className="katalog-tabs">
          <button
            type="button"
            className={!filtre.ikinciEl ? "aktif" : undefined}
            onClick={() => guncelle({ ikinciEl: false })}
          >
            Sıfır Lastik
          </button>
          <button
            type="button"
            className={filtre.ikinciEl ? "aktif" : undefined}
            onClick={() => guncelle({ ikinciEl: true })}
          >
            2.El Lastik
          </button>
        </div>
      )}

      <div className="arama-blok">
        <AramaFormu q={filtre.q} onAra={(q) => guncelle({ q })} formId="lastik-arama" butonGizle />
        <select
          aria-label="Mevsim"
          value={filtre.mevsim}
          onChange={(e) => guncelle({ mevsim: e.target.value })}
        >
          <option value="">Mevsim Seçiniz</option>
          {secenekler.mevsimler.map((m) => (
            <option key={m.deger} value={m.deger}>{m.etiket}</option>
          ))}
        </select>
        <select
          aria-label="Marka"
          value={filtre.marka}
          onChange={(e) => guncelle({ marka: e.target.value })}
        >
          <option value="">Marka Seçiniz</option>
          {secenekler.markalar.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          aria-label="DOT"
          value={filtre.dot}
          onChange={(e) => guncelle({ dot: e.target.value })}
        >
          <option value="">DOT Seçiniz</option>
          {secenekler.dotlar.map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </select>
      </div>

      <div className="filtre-satir2">
        <select
          aria-label="Depo"
          className="fs2-select"
          value={filtre.depo}
          onChange={(e) => guncelle({ depo: e.target.value })}
        >
          <option value="">Depo Seçiniz</option>
          {secenekler.depolar.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>

        <div className="ozellik-kutular">
          {CIPLER.map((c) => (
            <label key={c.anahtar} className="ozellik-kutu">
              <input
                type="checkbox"
                checked={Boolean(filtre[c.anahtar])}
                onChange={() => guncelle({ [c.anahtar]: !filtre[c.anahtar] })}
              />
              {c.etiket}
            </label>
          ))}
        </div>

        <button type="submit" form="lastik-arama" className="ara-buton">
          Ara
        </button>
        {filtreAktif ? (
          <button
            type="button"
            className="temizle-buton"
            onClick={() => {
              setFiltre(bosFiltre);
              setSayfa(1);
            }}
          >
            Temizle
          </button>
        ) : null}
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th className="sortable" onClick={() => siralamaTikla("stokKodu")}>Stok Kodu{okIsareti("stokKodu")}</th>
              <th className="sortable" onClick={() => siralamaTikla("ebat")}>Ebat / Model{okIsareti("ebat")}</th>
              <th className="sortable" onClick={() => siralamaTikla("marka")}>Marka{okIsareti("marka")}</th>
              <th className="sortable" onClick={() => siralamaTikla("mevsim")}>Mevsim{okIsareti("mevsim")}</th>
              <th className="sortable" onClick={() => siralamaTikla("dot")}>DOT{okIsareti("dot")}</th>
              <th className="sortable" onClick={() => siralamaTikla("stok")}>Stok{okIsareti("stok")}</th>
              <th className="num sortable" onClick={() => siralamaTikla("fiyat")}>Fiyat (KDV hariç){okIsareti("fiyat")}</th>
              <th className="sepet-kol">Sepet</th>
            </tr>
          </thead>
          <tbody>
            {gorunen.map((urun) => {
              const stokluDepolar = urun.stoklar.filter(
                (s) => s.kullanilabilir > 0,
              );
              const kullanilabilir = toplamStok(urun.stoklar);
              const fiyat = urun.fiyat;
              return (
                <tr key={urun.id}>
                  <td className="sku">{urun.stokKodu}</td>
                  <td>
                    <div className="urun-hucre">
                      {urun.gorselUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="urun-gorsel" src={urun.gorselUrl} alt={urun.desen} loading="lazy" />
                      ) : (
                        <span className="urun-gorsel bos" aria-hidden="true" />
                      )}
                      <div>
                        <div className="urun-adi">
                          {urun.tamAd ? (
                            urun.tamAd
                          ) : (
                            <>
                              {urun.ebat}
                              {urun.yukHizEndeksi ? ` ${urun.yukHizEndeksi}` : ""}{" "}
                              {urun.desen}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {urun.markaLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="marka-logo" src={urun.markaLogoUrl} alt={urun.marka} title={urun.marka} loading="lazy" />
                    ) : (
                      <strong>{urun.marka}</strong>
                    )}
                  </td>
                  <td>
                    <MevsimIcon mevsim={urun.mevsim} />
                  </td>
                  <td>{urun.dotYili ?? "—"}</td>
                  <td>
                    <span className="stok-hucre">
                      <span
                        className={`stok-pill${kullanilabilir === 0 ? " yok" : ""}`}
                      >
                        {kullanilabilir === 0
                          ? "Yok"
                          : kullanilabilir >= 20
                            ? "20+"
                            : kullanilabilir}
                      </span>
                      {urun.stoklar.length > 0 && (
                        <span className="stok-tooltip" role="tooltip">
                          {urun.stoklar.map((s) => (
                            <span key={s.warehouseId} className="stok-tooltip-satir">
                              <span>{s.depoAd}</span>
                              <strong>{s.kullanilabilir}</strong>
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="num">
                    {fiyat ? (
                      <>
                        {fiyat.birimNetKurus < fiyat.listeBirimKurus ? (
                          <div className="fiyat-liste">
                            {formatKurus(fiyat.listeBirimKurus)}
                          </div>
                        ) : null}
                        <div
                          className={`fiyat-net${fiyat.fiyatKaynagi === "ozel_fiyat" ? " kampanya" : ""}`}
                        >
                          {formatKurus(fiyat.birimNetKurus)}
                        </div>
                        <div className="fiyat-kdv">
                          KDV dahil {formatKurus(fiyat.kdvDahilBirimKurus)}
                        </div>
                      </>
                    ) : (
                      <span className="note">Fiyat tanımsız</span>
                    )}
                  </td>
                  <td className="sepet-kol">
                    {fiyat && stokluDepolar.length > 0 ? (
                      <SepeteEkle
                        productId={urun.id}
                        depolar={stokluDepolar}
                        varsayilanDepoId={filtre.depo || undefined}
                      />
                    ) : (
                      <span className="note">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {gorunen.length === 0 ? (
              <tr>
                <td colSpan={8} className="note" style={{ padding: "2rem" }}>
                  Filtrelere uyan ürün bulunamadı.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {dahaVar ? (
        <div className="daha-fazla">
          <button
            type="button"
            className="daha-fazla-buton"
            onClick={() => setSayfa((s) => s + 1)}
          >
            Daha Fazla Göster
            <span className="daha-fazla-sayi">
              {gorunen.length.toLocaleString("tr-TR")} / {toplam.toLocaleString("tr-TR")}
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
