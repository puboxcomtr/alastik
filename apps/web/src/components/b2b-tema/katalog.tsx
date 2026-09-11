"use client";

import { useMemo, useState } from "react";
import { Dropdown } from "@components/b2b-tema/acilir";
import { SearchForm } from "@components/b2b-tema/arama-formu";
import { SeasonIcon } from "@components/b2b-tema/icons";
import { AddToCart } from "@components/b2b-tema/sepete-ekle";
import { formatKurus } from "@components/b2b-tema/lib/format";
import {
  TIRES,
  totalStock,
  type Tire,
  type Season,
  type ProductStatus,
} from "@components/b2b-tema/lib/ornek-veri";

const SAYFA_BOYU = 10; // İlk gösterim ve "Daha Fazla Göster" adımı

const SEASON_LABEL: Record<string, string> = { yaz: "Yaz", kis: "Kış", dortMevsim: "4 Mevsim" };

// Sıralanabilir sütunlar ve karşılık gelen değer çıkarıcıları
type SiralamaAlani = "stokKodu" | "ebat" | "marka" | "mevsim" | "dot" | "stok" | "fiyat";
type Yon = "asc" | "desc";

type Filter = {
  q: string;
  marka: string;
  mevsim: string;
  size: string;
  dot: string;
  depo: string;
  ikinciEl: boolean;
  rft: boolean;
  cTipi: boolean;
  ev: boolean;
  xl: boolean;
};

const BOS_FILTRE: Filter = {
  q: "",
  marka: "",
  mevsim: "",
  size: "",
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

function matches(urun: Tire, f: Filter): boolean {
  if (f.q) {
    const query = sadelestir(f.q);
    const havuz = sadelestir(
      `${urun.size} ${urun.pattern} ${urun.marka} ${urun.stockCode}`,
    );
    if (!havuz.includes(query)) return false;
  }
  if (f.marka && urun.marka !== f.marka) return false;
  if (f.mevsim && urun.mevsim !== (f.mevsim as Season)) return false;
  if (f.size && urun.size !== f.size) return false;
  if (f.dot && String(urun.dotYear) !== f.dot) return false;
  if (f.depo) {
    const warehouseStock = urun.stocks.find((s) => s.warehouseId === f.depo);
    if (!warehouseStock || warehouseStock.available === 0) return false;
  }
  /**
   * "Sadece 2. El Lastikler" çipi: basılı değilse YALNIZCA sıfır ürün görünür,
   * basılıysa yalnızca 2. el. İkisini birlikte listeleyen bir durum yok —
   * toptan alıcı için sıfır ve 2. el ayrı işler.
   */
  if (urun.productStatus !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
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
export function Catalog(
  { products, sabitDurum, baslik }: { products?: Tire[]; sabitDurum?: ProductStatus; baslik?: string } = {},
) {
  const kaynak = products ?? TIRES;
  // sabitDurum verilirse blok tek türe kilitlenir (sekme gizlenir), filtre o
  // duruma göre başlatılır ve Temizle bu başlangıca döner.
  const bosFiltre: Filter = sabitDurum
    ? { ...BOS_FILTRE, ikinciEl: sabitDurum === "ikinciEl" }
    : BOS_FILTRE;
  const [filtre, setFiltre] = useState<Filter>(bosFiltre);
  const [sayfa, setSayfa] = useState(1);
  const [siralama, setSiralama] = useState<{ alan: SiralamaAlani; yon: Yon } | null>(null);

  const matched = useMemo(
    () => kaynak.filter((u) => matches(u, filtre)),
    [filtre, kaynak],
  );

  // Sütun başlığına tıklanınca aktif sıralama uygulanır (yoksa orijinal sıra)
  const sorted = useMemo(() => {
    if (!siralama) return matched;
    const deger = (u: Tire): string | number => {
      switch (siralama.alan) {
        case "stokKodu": return u.stockCode || "";
        case "ebat": return u.size || "";
        case "marka": return u.marka || "";
        case "mevsim": return SEASON_LABEL[u.mevsim] || u.mevsim;
        case "dot": return u.dotYear ?? -Infinity;
        case "stok": return totalStock(u.stocks);
        case "fiyat": return u.fiyat?.birimNetKurus ?? -Infinity;
      }
    };
    const carpan = siralama.yon === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      const da = deger(a), db = deger(b);
      if (typeof da === "number" && typeof db === "number") return (da - db) * carpan;
      return String(da).localeCompare(String(db), "tr") * carpan;
    });
  }, [matched, siralama]);

  // Filtre seçenekleri gerçek ürünlerden türetilir (ne varsa o gelir)
  const options = useMemo(() => {
    const brandSet = new Set<string>();
    const seasonSet = new Set<Season>();
    const dotSet = new Set<number>();
    const warehouseMap = new Map<string, string>();
    for (const u of kaynak) {
      // Filtre seçenekleri aktif sekmenin (Sıfır/2.El) ürünlerinden türetilir
      if (u.productStatus !== (filtre.ikinciEl ? "ikinciEl" : "sifir")) continue;
      if (u.marka) brandSet.add(u.marka);
      if (u.mevsim) seasonSet.add(u.mevsim);
      if (u.dotYear != null) dotSet.add(u.dotYear);
      for (const st of u.stocks) warehouseMap.set(st.warehouseId, st.warehouseName);
    }
    return {
      brands: [...brandSet].sort((a, b) => a.localeCompare(b, "tr")),
      seasons: [...seasonSet].map((m) => ({ deger: m, etiket: SEASON_LABEL[m] || m })),
      dotlar: [...dotSet].sort((a, b) => b - a),
      warehouses: [...warehouseMap.entries()].map(([id, ad]) => ({ id, ad })),
    };
  }, [kaynak, filtre.ikinciEl]);

  const toplam = matched.length;
  // Load-more: baştan sayfa*SAYFA_BOYU kadar ürün gösterilir (sıralanmış, kümülatif)
  const visible = sorted.slice(0, sayfa * SAYFA_BOYU);
  const dahaVar = toplam > visible.length;

  const filterActive = Boolean(
    filtre.q ||
      filtre.marka ||
      filtre.mevsim ||
      filtre.size ||
      filtre.dot ||
      filtre.depo ||
      CIPLER.some((c) => filtre[c.anahtar]),
  );

  /** Filtre değişince ilk sayfaya dönülür. */
  function update(parca: Partial<Filter>): void {
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
            onClick={() => update({ ikinciEl: false })}
          >
            Sıfır Lastik
          </button>
          <button
            type="button"
            className={filtre.ikinciEl ? "aktif" : undefined}
            onClick={() => update({ ikinciEl: true })}
          >
            2.El Lastik
          </button>
        </div>
      )}

      <div className="arama-blok">
        <SearchForm q={filtre.q} onAra={(q) => update({ q })} formId="lastik-arama" butonGizle />
        <select
          aria-label="Mevsim"
          value={filtre.mevsim}
          onChange={(e) => update({ mevsim: e.target.value })}
        >
          <option value="">Mevsim Seçiniz</option>
          {options.seasons.map((m) => (
            <option key={m.deger} value={m.deger}>{m.etiket}</option>
          ))}
        </select>
        <select
          aria-label="Marka"
          value={filtre.marka}
          onChange={(e) => update({ marka: e.target.value })}
        >
          <option value="">Marka Seçiniz</option>
          {options.brands.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          aria-label="DOT"
          value={filtre.dot}
          onChange={(e) => update({ dot: e.target.value })}
        >
          <option value="">DOT Seçiniz</option>
          {options.dotlar.map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </select>
      </div>

      <div className="filtre-satir2">
        <select
          aria-label="Depo"
          className="fs2-select"
          value={filtre.depo}
          onChange={(e) => update({ depo: e.target.value })}
        >
          <option value="">Depo Seçiniz</option>
          {options.warehouses.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>

        <div className="ozellik-kutular">
          {CIPLER.map((c) => (
            <label key={c.anahtar} className="ozellik-kutu">
              <input
                type="checkbox"
                checked={Boolean(filtre[c.anahtar])}
                onChange={() => update({ [c.anahtar]: !filtre[c.anahtar] })}
              />
              {c.etiket}
            </label>
          ))}
        </div>

        <button type="submit" form="lastik-arama" className="ara-buton">
          Ara
        </button>
        {filterActive ? (
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
            {visible.map((urun) => {
              const inStockWarehouses = urun.stocks.filter(
                (s) => s.available > 0,
              );
              const available = totalStock(urun.stocks);
              const fiyat = urun.fiyat;
              return (
                <tr key={urun.id}>
                  <td className="sku">{urun.stockCode}</td>
                  <td>
                    <div className="urun-hucre">
                      {urun.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="urun-gorsel" src={urun.imageUrl} alt={urun.pattern} loading="lazy" />
                      ) : (
                        <span className="urun-gorsel bos" aria-hidden="true" />
                      )}
                      <div>
                        <div className="urun-adi">
                          {urun.fullName ? (
                            urun.fullName
                          ) : (
                            <>
                              {urun.size}
                              {urun.loadSpeedIndex ? ` ${urun.loadSpeedIndex}` : ""}{" "}
                              {urun.pattern}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {urun.brandLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="marka-logo" src={urun.brandLogoUrl} alt={urun.marka} title={urun.marka} loading="lazy" />
                    ) : (
                      <strong>{urun.marka}</strong>
                    )}
                  </td>
                  <td>
                    <SeasonIcon mevsim={urun.mevsim} />
                  </td>
                  <td>{urun.dotYear ?? "—"}</td>
                  <td>
                    <span className="stok-hucre">
                      <span
                        className={`stok-pill${available === 0 ? " yok" : ""}`}
                      >
                        {available === 0
                          ? "Yok"
                          : available >= 20
                            ? "20+"
                            : available}
                      </span>
                      {urun.stocks.length > 0 && (
                        <span className="stok-tooltip" role="tooltip">
                          {urun.stocks.map((s) => (
                            <span key={s.warehouseId} className="stok-tooltip-satir">
                              <span>{s.warehouseName}</span>
                              <strong>{s.available}</strong>
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
                          className={`fiyat-net${fiyat.priceSource === "ozel_fiyat" ? " kampanya" : ""}`}
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
                    {fiyat && inStockWarehouses.length > 0 ? (
                      <AddToCart
                        productId={urun.id}
                        warehouses={inStockWarehouses}
                        defaultWarehouseId={filtre.depo || undefined}
                      />
                    ) : (
                      <span className="note">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
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
              {visible.length.toLocaleString("tr-TR")} / {toplam.toLocaleString("tr-TR")}
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
