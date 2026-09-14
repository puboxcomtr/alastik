"use client";

import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "@components/b2b-theme/dropdown";
import { AutoComplete } from "@components/b2b-theme/autocomplete";
import { SearchForm } from "@components/b2b-theme/search-form";
import { AddToCart } from "@components/b2b-theme/add-to-cart";
import { SeasonIcon } from "@components/b2b-theme/icons";
import { formatKurus } from "@components/b2b-theme/lib/format";
import {
  TIRES,
  totalStock,
  type Tire,
  type Season,
  type ProductStatus,
} from "@components/b2b-theme/lib/sample-data";

const PAGE_SIZE = 10; // İlk gösterim ve "Daha Fazla Göster" adımı

const SEASON_LABEL: Record<string, string> = { yaz: "Yaz", kis: "Kış", dortMevsim: "4 Mevsim" };

/** Sayfa numarası dizisi: ilk, son, geçerli ve komşuları; aradaki boşluklar "…". */
function pageNumbers(cur: number, total: number): (number | "...")[] {
  const set = new Set<number>([1, total, cur, cur - 1, cur + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("...");
    out.push(n);
    prev = n;
  }
  return out;
}

// Sıralanabilir sütunlar ve karşılık gelen değer çıkarıcıları
type SiralamaAlani = "stokKodu" | "ebat" | "marka" | "mevsim" | "dot" | "stok" | "sevkiyat" | "fiyat";
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
  { anahtar: "rft", label: "RFT" },
  { anahtar: "cTipi", label: "C Serisi" },
  { anahtar: "xl", label: "XL" },
] as const;

/** Arama ayraca takılmasın: "2055" → "205/55 R16" bulunmalı (marka/model metni için). */
function normalizeText(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
}

/** Yalnız rakamlar — ebat aramasında ayraç ve R harfi göz ardı edilir:
 *  "2055516", "205 55 16", "205/55R16", "205 55 R16" hepsi "2055516" olur. */
function digitsOnly(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

function matches(urun: Tire, f: Filter, ignoreStatus = false): boolean {
  if (f.q) {
    const query = normalizeText(f.q);
    const havuz = normalizeText(
      `${urun.size} ${urun.pattern} ${urun.marka} ${urun.stockCode}`,
    );
    // Ebat/stok kodu rakam eşleşmesi (R harfi ve ayraçlardan bağımsız)
    const rakamQuery = digitsOnly(f.q);
    const rakamHavuz = digitsOnly(`${urun.size} ${urun.stockCode}`);
    const metinEsler = havuz.includes(query);
    const rakamEsler = rakamQuery.length >= 3 && rakamHavuz.includes(rakamQuery);
    if (!metinEsler && !rakamEsler) return false;
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
  if (!ignoreStatus && urun.productStatus !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
  if (f.rft && !urun.rft) return false;
  if (f.cTipi && !urun.cTipi) return false;
  if (f.ev && !urun.ev) return false;
  if (f.xl && !urun.xl) return false;
  return true;
}

/**
 * Arama + filter barı + ürün tablosu (anasayfa ve /lastik paylaşır).
 *
 * ŞABLON NOTU: süzme tarayıcıda, `lib/ornek-veri.ts` dizisi üzerinde yapılır.
 * Gerçek uygulamada bu bileşen fiyat ve stoğu sunucudan istemeli; fiyat
 * istemcide hesaplanmamalıdır.
 */
/** Sunucu tarafı filter seçenekleri (facet). Kategorinin TÜM marka/mevsim/DOT
 *  değerleri; o anki sayfanın ürünlerine bağlı değildir. */
export type ServerOptions = {
  brands: string[];
  seasons: { value: string; label: string }[];
  dots: string[];
  warehouses: string[];
};
/** Sunucu tarafı filter değerleri (URL ile senkron, kategori sayfası). */
export type ServerFilters = { q: string; marka: string; mevsim: string; dot: string; depo: string };

export function Catalog(
  { products, sabitDurum, title, tabsGizle, serverPage, serverTotalPages, onServerPageChange, serverLoading,
    serverFilters, onServerFilterChange, serverOptions }: {
    products?: Tire[];
    sabitDurum?: ProductStatus;
    title?: string;
    /** Sıfır/2.El sekmelerini gizler ve durum filtresini uygulamaz (kategori sayfası
     *  tek tip ürün içerir; ürünler doğrudan listelenir). */
    tabsGizle?: boolean;
    /** Kategori sayfası: sunucu tarafı sayfalama. Verilirse istemci "Daha Fazla"
     *  yerine page numaraları gösterilir ve tüm page ürünleri listelenir. */
    serverPage?: number;
    serverTotalPages?: number;
    onServerPageChange?: (page: number) => void;
    serverLoading?: boolean;
    /** Kategori sayfası: marka/mevsim/DOT filtreleri SUNUCUDA uygulanır (tüm
     *  ürünlerde, sadece görünen sayfada değil) ve URL'e yansır. Verilirse bu üç
     *  select ebeveyn tarafından kontrol edilir; seçenekler facet'ten gelir. */
    serverFilters?: ServerFilters;
    onServerFilterChange?: (parca: Partial<ServerFilters>) => void;
    serverOptions?: ServerOptions;
  } = {},
) {
  const source = products ?? TIRES;
  // sabitDurum verilirse blok tek türe kilitlenir (sekme gizlenir), filter o
  // duruma göre başlatılır ve Temizle bu başlangıca döner.
  const emptyFilter: Filter = sabitDurum
    ? { ...BOS_FILTRE, ikinciEl: sabitDurum === "ikinciEl" }
    : BOS_FILTRE;
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<{ alan: SiralamaAlani; yon: Yon } | null>(null);
  // Ürün görseline tıklayınca büyük hâli lightbox'ta açılır (tüm lastik satırları)
  const [buyukGorsel, setBuyukGorsel] = useState<string | null>(null);
  useEffect(() => {
    if (!buyukGorsel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBuyukGorsel(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [buyukGorsel]);

  const matched = useMemo(
    () => source.filter((u) => matches(u, filter, tabsGizle)),
    [filter, source, tabsGizle],
  );

  // Sütun başlığına tıklanınca aktif sıralama uygulanır (yoksa orijinal sıra)
  const sorted = useMemo(() => {
    if (!sortState) return matched;
    const value = (u: Tire): string | number => {
      switch (sortState.alan) {
        case "stokKodu": return u.stockCode || "";
        case "ebat": return u.size || "";
        case "marka": return u.marka || "";
        case "mevsim": return SEASON_LABEL[u.mevsim] || u.mevsim;
        case "dot": return u.dotYear ?? -Infinity;
        case "stok": return totalStock(u.stocks);
        case "sevkiyat": return u.sevkiyat || "";
        case "fiyat": return u.fiyat?.kdvDahilBirimKurus ?? -Infinity;
      }
    };
    const carpan = sortState.yon === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      const da = value(a), db = value(b);
      if (typeof da === "number" && typeof db === "number") return (da - db) * carpan;
      return String(da).localeCompare(String(db), "tr") * carpan;
    });
  }, [matched, sortState]);

  // Filtre seçenekleri gerçek ürünlerden türetilir (ne varsa o gelir)
  const options = useMemo(() => {
    const brandSet = new Set<string>();
    const seasonSet = new Set<Season>();
    const dotSet = new Set<number>();
    const warehouseMap = new Map<string, string>();
    for (const u of source) {
      // Filtre seçenekleri aktif sekmenin (Sıfır/2.El) ürünlerinden türetilir.
      // Sekmesiz modda (kategori) durum ayrımı yok, tüm ürünlerden türetilir.
      if (!tabsGizle && u.productStatus !== (filter.ikinciEl ? "ikinciEl" : "sifir")) continue;
      if (u.marka) brandSet.add(u.marka);
      if (u.mevsim) seasonSet.add(u.mevsim);
      if (u.dotYear != null) dotSet.add(u.dotYear);
      // "merkez" = depo verisi gelmeden önceki/kalan fallback; filtreye eklenmez
      // (tutarsız "Merkez" seçeneğine yol açıyordu). Yalnız gerçek depolar listelenir.
      for (const st of u.stocks) {
        if (st.warehouseId === "merkez") continue;
        warehouseMap.set(st.warehouseId, st.warehouseName);
      }
    }
    return {
      brands: [...brandSet].sort((a, b) => a.localeCompare(b, "tr")),
      seasons: [...seasonSet].map((m) => ({ value: m, label: SEASON_LABEL[m] || m })),
      dotlar: [...dotSet].sort((a, b) => b - a),
      warehouses: [...warehouseMap.entries()].map(([id, ad]) => ({ id, ad })),
    };
  }, [source, filter.ikinciEl, tabsGizle]);

  // Sunucu-kontrollü filter modu (kategori sayfası): marka/mevsim/DOT ebeveynden.
  // Seçenekler facet'ten (kategorinin tümü), aksi halde görünen üründen türer.
  const serverFiltreli = Boolean(serverFilters);
  const vQ = serverFiltreli ? serverFilters!.q : filter.q;
  const setQ = (x: string) => (serverFiltreli ? onServerFilterChange!({ q: x }) : update({ q: x }));
  const vBrand = serverFiltreli ? serverFilters!.marka : filter.marka;
  const vSeason = serverFiltreli ? serverFilters!.mevsim : filter.mevsim;
  const vDot = serverFiltreli ? serverFilters!.dot : filter.dot;
  const vDepot = serverFiltreli ? serverFilters!.depo : filter.depo;
  const setBrand = (x: string) => (serverFiltreli ? onServerFilterChange!({ marka: x }) : update({ marka: x }));
  const setSeason = (x: string) => (serverFiltreli ? onServerFilterChange!({ mevsim: x }) : update({ mevsim: x }));
  const setDot = (x: string) => (serverFiltreli ? onServerFilterChange!({ dot: x }) : update({ dot: x }));
  const setDepot = (x: string) => (serverFiltreli ? onServerFilterChange!({ depo: x }) : update({ depo: x }));
  const brandOpts = (serverFiltreli ? serverOptions!.brands : options.brands).map((m) => ({ value: m, label: m }));
  const seasonOpts = (serverFiltreli ? serverOptions!.seasons : options.seasons).map((m) => ({ value: m.value, label: m.label }));
  const dotOpts = (serverFiltreli ? serverOptions!.dots.map(String) : options.dotlar.map(String)).map((d) => ({ value: d, label: d }));
  const depotOpts = serverFiltreli
    ? serverOptions!.warehouses.map((w) => ({ value: w, label: w }))
    : options.warehouses.map((d) => ({ value: d.id, label: d.ad }));

  const toplam = matched.length;
  // Sunucu sayfalama modunda (kategori sayfası) tüm page ürünleri gösterilir;
  // aksi halde (anasayfa vitrini) istemcide "Daha Fazla" ile 10'ar açılır.
  const sunucuSayfali = typeof serverPage === "number";
  const visible = sunucuSayfali ? sorted : sorted.slice(0, page * PAGE_SIZE);
  const dahaVar = !sunucuSayfali && toplam > visible.length;

  const filterActive = Boolean(
    vQ ||
      vBrand ||
      vSeason ||
      filter.size ||
      vDot ||
      vDepot ||
      CIPLER.some((c) => filter[c.anahtar]),
  );

  /** Filtre değişince ilk sayfaya dönülür. */
  function update(parca: Partial<Filter>): void {
    setFilter((onceki) => ({ ...onceki, ...parca }));
    setPage(1);
  }

  /** Tüm filtreleri temizler (istemci + sunucu-kontrollü marka/mevsim/DOT). */
  function temizle(): void {
    setFilter(emptyFilter);
    setPage(1);
    if (serverFiltreli) onServerFilterChange!({ q: "", marka: "", mevsim: "", dot: "", depo: "" });
  }

  /** Sütun başlığına tıklama: aynı sütun ise yön değişir, farklıysa artan başlar. */
  function onSortClick(alan: SiralamaAlani): void {
    setSortState((o) =>
      o && o.alan === alan
        ? { alan, yon: o.yon === "asc" ? "desc" : "asc" }
        : { alan, yon: "asc" },
    );
    setPage(1);
  }

  /** Aktif sıralama sütunundaki ok işareti (▲ artan / ▼ azalan). */
  function sortArrow(alan: SiralamaAlani): string {
    if (!sortState || sortState.alan !== alan) return "";
    return sortState.yon === "asc" ? " ▲" : " ▼";
  }

  return (
    <>
      {/* sabitDurum'da blok başlığı; aksi halde Sıfır / 2.El sekmeleri */}
      {tabsGizle ? null : sabitDurum ? (
        title ? <h2 className="showcase-title">{title}</h2> : null
      ) : (
        <div className="catalog-tabs">
          <button
            type="button"
            className={!filter.ikinciEl ? "aktif" : undefined}
            onClick={() => update({ ikinciEl: false })}
          >
            Sıfır Lastik
          </button>
          <button
            type="button"
            className={filter.ikinciEl ? "aktif" : undefined}
            onClick={() => update({ ikinciEl: true })}
          >
            2.El Lastik
          </button>
        </div>
      )}

      <div className="search-block">
        <SearchForm q={vQ} onSearch={setQ} formId="lastik-query" butonGizle />
        <AutoComplete
          ariaLabel="Mevsim"
          placeholder="Mevsim Seçiniz"
          value={vSeason}
          options={seasonOpts}
          onChange={setSeason}
        />
        <AutoComplete
          ariaLabel="Marka"
          placeholder="Marka Seçiniz"
          value={vBrand}
          options={brandOpts}
          onChange={setBrand}
        />
        <AutoComplete
          ariaLabel="DOT"
          placeholder="DOT Seçiniz"
          value={vDot}
          options={dotOpts}
          onChange={setDot}
        />
      </div>

      <div className="filter-row2">
        <AutoComplete
          ariaLabel="Depo"
          className="fs2-select-ac"
          placeholder="Depo Seçiniz"
          value={vDepot}
          options={depotOpts}
          onChange={setDepot}
        />

        <div className="feature-boxes">
          {CIPLER.map((c) => (
            <label key={c.anahtar} className="feature-box">
              <input
                type="checkbox"
                checked={Boolean(filter[c.anahtar])}
                onChange={() => update({ [c.anahtar]: !filter[c.anahtar] })}
              />
              {c.label}
            </label>
          ))}
        </div>

        <button type="submit" form="lastik-query" className="search-button">
          Ara
        </button>
        {filterActive ? (
          <button type="button" className="clear-button" onClick={temizle}>
            Temizle
          </button>
        ) : null}
      </div>

      <div className={`tablewrap${serverLoading ? " loading" : ""}`}>
        {serverLoading ? <div className="table-loading">Filtreleniyor…</div> : null}
        <table className="data">
          <thead>
            <tr>
              <th className="sortable" onClick={() => onSortClick("stokKodu")}>Stok Kodu{sortArrow("stokKodu")}</th>
              <th className="sortable" onClick={() => onSortClick("ebat")}>Ebat / Model{sortArrow("ebat")}</th>
              <th className="sortable" onClick={() => onSortClick("marka")}>Marka{sortArrow("marka")}</th>
              <th className="sortable" onClick={() => onSortClick("mevsim")}>Mevsim{sortArrow("mevsim")}</th>
              <th className="sortable" onClick={() => onSortClick("dot")}>DOT{sortArrow("dot")}</th>
              <th className="sortable" onClick={() => onSortClick("stok")}>Stok{sortArrow("stok")}</th>
              <th className="sortable" onClick={() => onSortClick("sevkiyat")}>Sevkiyat{sortArrow("sevkiyat")}</th>
              <th className="num sortable" onClick={() => onSortClick("fiyat")}>Fiyat{sortArrow("fiyat")}</th>
              <th className="actions-col">İşlemler</th>
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
                    <div className="product-cell">
                      {urun.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="product-image tiklanir"
                          src={urun.imageUrl}
                          alt={urun.pattern}
                          loading="lazy"
                          onClick={() => setBuyukGorsel(urun.imageUrl)}
                        />
                      ) : (
                        <span className="product-image bos" aria-hidden="true" />
                      )}
                      <div>
                        <div className="product-name">
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
                      <span className="hover-tip">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="brand-logo" src={urun.brandLogoUrl} alt={urun.marka} loading="lazy" />
                        <span className="hover-tip-text">{urun.marka}</span>
                      </span>
                    ) : (
                      <strong>{urun.marka}</strong>
                    )}
                  </td>
                  <td>
                    <span className="hover-tip">
                      <SeasonIcon mevsim={urun.mevsim} />
                      <span className="hover-tip-text">{SEASON_LABEL[urun.mevsim] || urun.mevsim}</span>
                    </span>
                  </td>
                  <td>{urun.dotYear ?? "—"}</td>
                  <td>
                    <span className="stock-cell">
                      <span
                        className={`stock-pill${available === 0 ? " yok" : ""}`}
                      >
                        {available === 0
                          ? "Yok"
                          : available >= 20
                            ? "20+"
                            : available}
                      </span>
                      {urun.stocks.length > 0 && (
                        <span className="stock-tooltip" role="tooltip">
                          {urun.stocks.map((s) => (
                            <span key={s.warehouseId} className="stock-tooltip-row">
                              <span>{s.warehouseName}</span>
                              <strong>{s.available}</strong>
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`shipping-badge${urun.sevkiyat === "Aynı Gün" ? " ayni-gun" : ""}`}
                    >
                      {urun.sevkiyat || "1-2 Gün"}
                    </span>
                  </td>
                  <td className="num">
                    {fiyat ? (
                      <div
                        className={`price-net${fiyat.priceSource === "ozel_fiyat" ? " kampanya" : ""}`}
                      >
                        {formatKurus(fiyat.kdvDahilBirimKurus)}
                      </div>
                    ) : (
                      <span className="note">Fiyat tanımsız</span>
                    )}
                  </td>
                  <td className="actions-col">
                    {/* Tüm ürünlerde Sepete Ekle popover'ı (sepet ikonu → adet/depo) */}
                    {fiyat && inStockWarehouses.length > 0 ? (
                      <AddToCart
                        productId={urun.id}
                        warehouses={inStockWarehouses}
                        defaultWarehouseId={vDepot || undefined}
                        product={{
                          marka: urun.marka,
                          brandLogoUrl: urun.brandLogoUrl,
                          size: urun.size,
                          pattern: urun.fullName ?? urun.pattern,
                          stockCode: urun.stockCode,
                          imageUrl: urun.imageUrl,
                          birimNetKurus: fiyat.birimNetKurus,
                          kdvDahilBirimKurus: fiyat.kdvDahilBirimKurus,
                        }}
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
                <td colSpan={9} className="note" style={{ padding: "2rem" }}>
                  Filtrelere uyan ürün bulunamadı.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {sunucuSayfali ? (
        (serverTotalPages ?? 1) > 1 ? (
          <nav className="pagination" aria-label="Sayfalar">
            <button
              type="button"
              className="pasif"
              disabled={(serverPage ?? 1) <= 1 || serverLoading}
              onClick={() => onServerPageChange?.((serverPage ?? 1) - 1)}
            >
              ← Önceki
            </button>
            {pageNumbers(serverPage ?? 1, serverTotalPages ?? 1).map((n, i) =>
              n === "..." ? (
                <span key={`e${i}`} className="bilgi">…</span>
              ) : (
                <button
                  type="button"
                  key={n}
                  className={n === serverPage ? "aktif" : undefined}
                  disabled={serverLoading}
                  onClick={() => onServerPageChange?.(n)}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              className="pasif"
              disabled={(serverPage ?? 1) >= (serverTotalPages ?? 1) || serverLoading}
              onClick={() => onServerPageChange?.((serverPage ?? 1) + 1)}
            >
              Sonraki →
            </button>
          </nav>
        ) : null
      ) : dahaVar ? (
        <div className="load-more">
          <button
            type="button"
            className="load-more-button"
            onClick={() => setPage((s) => s + 1)}
          >
            Daha Fazla Göster
            <span className="load-more-count">
              {visible.length.toLocaleString("tr-TR")} / {toplam.toLocaleString("tr-TR")}
            </span>
          </button>
        </div>
      ) : null}

      {buyukGorsel ? (
        <div
          className="gorsel-lightbox"
          role="dialog"
          aria-label="Ürün görseli"
          onClick={() => setBuyukGorsel(null)}
        >
          <button
            type="button"
            className="lightbox-kapat"
            aria-label="Kapat"
            onClick={() => setBuyukGorsel(null)}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={buyukGorsel} alt="Ürün görseli" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
