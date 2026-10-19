"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Dropdown } from "@components/b2b-theme/dropdown";
import { AutoComplete } from "@components/b2b-theme/autocomplete";
import { SearchForm } from "@components/b2b-theme/search-form";
import { AddToCart } from "@components/b2b-theme/add-to-cart";
import { SeasonIcon, SpinnerIcon } from "@components/b2b-theme/icons";
import { AbLabel } from "@components/b2b-theme/ab-label";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { fetchFinancialDiscounts, financialDiscountPct, productShippingKurus, catalogShipping, BASE_PAYMENT_METHOD, PREMIUM_TIER, type FinancialDiscounts } from "@components/b2b-theme/lib/financial-discounts";
import { FinancialDiscountTag } from "@components/b2b-theme/financial-discount-tag";
import { DEFAULT_CATALOG_FILTERS, isTireProductType, type CatalogFilterKey, type CatalogColumnKey } from "@components/b2b-theme/lib/catalog-filters";
import { RETAIL_SALES_GROUP } from "@components/b2b-theme/lib/salesperson";
import {
  totalStock,
  type Tire,
  type Season,
  type ProductStatus,
} from "@components/b2b-theme/lib/sample-data";

const PAGE_SIZE = 10;
const NEW_PRODUCT_STATUS: ProductStatus = "sifir";

const SEASON_LABEL: Record<string, string> = { yaz: "Yaz", kis: "Kış", dortMevsim: "4 Mevsim" };

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

type SiralamaAlani = "stokKodu" | "ebat" | "marka" | "mevsim" | "dot" | "stok" | "sevkiyat" | "fiyat";
type Yon = "asc" | "desc";

type Filter = {
  q: string;
  marka: string;
  mevsim: string;
  size: string;
  dot: string;
  oem: string;
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
  oem: "",
  depo: "",
  ikinciEl: false,
  rft: false,
  cTipi: false,
  ev: false,
  xl: false,
};

const FIRST_ROW_FILTERS: CatalogFilterKey[] = ["season", "brand", "dot", "rimDiameter", "boltPattern"];
const FIRST_ROW_CAPACITY = 4;
const SERVER_ONLY_FILTERS: CatalogFilterKey[] = ["rimDiameter", "boltPattern"];
const FIXED_COLUMN_COUNT = 7;
const OPTIONAL_COLUMNS: CatalogColumnKey[] = ["brand", "season", "dot"];

const CIPLER = [
  { anahtar: "rft", label: "RFT" },
  { anahtar: "cTipi", label: "C Serisi" },
  { anahtar: "xl", label: "XL" },
  { anahtar: "ev", label: "EV" },
] as const;

function normalizeText(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
}

function digitsOnly(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

function matches(urun: Tire, f: Filter, ignoreStatus = false): boolean {
  if (f.q) {
    const havuz = normalizeText(
      `${urun.size} ${urun.pattern} ${urun.marka} ${urun.stockCode}`,
    );
    const rakamHavuz = digitsOnly(`${urun.size} ${urun.stockCode}`);
    const tokens = f.q.trim().split(/\s+/).filter(Boolean);
    const kelimeler = tokens.filter((t) => t.length >= 2 && /[a-zşğüöçıİ]/i.test(t) && !/\d/.test(t));
    const rakamQuery = digitsOnly(f.q);
    if (rakamQuery.length >= 3 && !rakamHavuz.includes(rakamQuery)) return false;
    for (const kelime of kelimeler) {
      if (!havuz.includes(normalizeText(kelime))) return false;
    }
    if (rakamQuery.length < 3 && kelimeler.length === 0) {
      if (!havuz.includes(normalizeText(f.q))) return false;
    }
  }
  if (f.marka && urun.marka !== f.marka) return false;
  if (f.mevsim && urun.mevsim !== (f.mevsim as Season)) return false;
  if (f.size && urun.size !== f.size) return false;
  if (f.dot && String(urun.dotYear) !== f.dot) return false;
  if (f.depo) {
    const warehouseStock = urun.stocks.find((s) => s.warehouseId === f.depo);
    if (!warehouseStock || warehouseStock.available === 0) return false;
  }
  if (!ignoreStatus && urun.productStatus !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
  if (f.rft && !urun.rft) return false;
  if (f.cTipi && !urun.cTipi) return false;
  if (f.ev && !urun.ev) return false;
  if (f.xl && !urun.xl) return false;
  return true;
}

export type ServerOptions = {
  brands: string[];
  brandLogos?: Record<string, string>;
  seasons: { value: string; label: string }[];
  dots: string[];
  oems: string[];
  warehouses: string[];
  rimDiameters?: string[];
  boltPatterns?: string[];
  showcaseFilter?: { key: string; title: string; count: number } | null;
};
export type ServerFilters = {
  q: string; marka: string; mevsim: string; dot: string; oem: string; depo: string;
  rft?: boolean; cTipi?: boolean; xl?: boolean; ev?: boolean;
  jantCap?: string; bijon?: string;
  showcase?: boolean;
};

export function Catalog(
  { products, sabitDurum, title, tabsGizle, serverPage, serverTotalPages, onServerPageChange, serverLoading,
    serverFilters, onServerFilterChange, serverOptions, serverSort, onServerSortChange, plasiyer, plasiyerGroup, retailPriceNote, visibleFilters, hiddenColumns }: {
    products?: Tire[];
    sabitDurum?: ProductStatus;
    title?: string;
    tabsGizle?: boolean;
    serverPage?: number;
    serverTotalPages?: number;
    onServerPageChange?: (page: number) => void;
    serverLoading?: boolean;
    serverFilters?: ServerFilters;
    onServerFilterChange?: (parca: Partial<ServerFilters>) => void;
    serverOptions?: ServerOptions;
    serverSort?: { field: string; dir: "asc" | "desc" } | null;
    onServerSortChange?: (field: string) => void;
    plasiyer?: boolean;
    plasiyerGroup?: string;
    retailPriceNote?: string;
    visibleFilters?: CatalogFilterKey[];
    hiddenColumns?: CatalogColumnKey[];
  } = {},
) {
  const source = products ?? [];
  const shownFilters = visibleFilters ?? DEFAULT_CATALOG_FILTERS;
  const showColumn = (key: CatalogColumnKey): boolean => !(hiddenColumns || []).includes(key);
  const columnCount = FIXED_COLUMN_COUNT + OPTIONAL_COLUMNS.filter(showColumn).length;
  const showFilter = (key: CatalogFilterKey): boolean =>
    shownFilters.includes(key) && (!SERVER_ONLY_FILTERS.includes(key) || Boolean(serverFilters && onServerFilterChange && serverOptions));
  const firstRowFilters = FIRST_ROW_FILTERS.filter(showFilter).length;
  const depotInFirstRow = showFilter("depot") && 1 + firstRowFilters < FIRST_ROW_CAPACITY;
  const [financial, setFinancial] = useState<FinancialDiscounts>({ tier: "", discounts: {} });
  const sourceCodes = source.filter((u) => !u.xml).map((u) => u.stockCode).filter(Boolean).sort().join(",");
  useEffect(() => {
    let cancelled = false;
    fetchFinancialDiscounts(sourceCodes ? sourceCodes.split(",") : []).then((result) => {
      if (!cancelled) setFinancial(result);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceCodes]);
  const emptyFilter: Filter = sabitDurum
    ? { ...BOS_FILTRE, ikinciEl: sabitDurum === "ikinciEl" }
    : BOS_FILTRE;
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<{ alan: SiralamaAlani; yon: Yon } | null>(null);
  const [buyukGorsel, setBuyukGorsel] = useState<{ images: string[]; index: number } | null>(null);
  useEffect(() => {
    if (!buyukGorsel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBuyukGorsel(null);
      else if (e.key === "ArrowLeft") setBuyukGorsel((g) => (g ? { ...g, index: (g.index - 1 + g.images.length) % g.images.length } : g));
      else if (e.key === "ArrowRight") setBuyukGorsel((g) => (g ? { ...g, index: (g.index + 1) % g.images.length } : g));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [buyukGorsel]);

  const matched = useMemo(
    () => source.filter((u) => matches(u, filter, tabsGizle)),
    [filter, source, tabsGizle],
  );

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

  const options = useMemo(() => {
    const brandSet = new Set<string>();
    const seasonSet = new Set<Season>();
    const dotSet = new Set<number>();
    const warehouseMap = new Map<string, string>();
    for (const u of source) {
      if (!tabsGizle && u.productStatus !== (filter.ikinciEl ? "ikinciEl" : "sifir")) continue;
      if (u.marka) brandSet.add(u.marka);
      if (u.mevsim) seasonSet.add(u.mevsim);
      if (u.dotYear != null) dotSet.add(u.dotYear);
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

  const serverFiltreli = Boolean(serverFilters);
  const vQ = serverFiltreli ? serverFilters!.q : filter.q;
  const setQ = (x: string) => (serverFiltreli ? onServerFilterChange!({ q: x }) : update({ q: x }));
  const vBrand = serverFiltreli ? serverFilters!.marka : filter.marka;
  const vSeason = serverFiltreli ? serverFilters!.mevsim : filter.mevsim;
  const vDot = serverFiltreli ? serverFilters!.dot : filter.dot;
  const vOem = serverFiltreli ? serverFilters!.oem : filter.oem;
  const vDepot = serverFiltreli ? serverFilters!.depo : filter.depo;
  const setBrand = (x: string) => (serverFiltreli ? onServerFilterChange!({ marka: x }) : update({ marka: x }));
  const setSeason = (x: string) => (serverFiltreli ? onServerFilterChange!({ mevsim: x }) : update({ mevsim: x }));
  const setDot = (x: string) => (serverFiltreli ? onServerFilterChange!({ dot: x }) : update({ dot: x }));
  const setOem = (x: string) => (serverFiltreli ? onServerFilterChange!({ oem: x }) : update({ oem: x }));
  const setDepot = (x: string) => (serverFiltreli ? onServerFilterChange!({ depo: x }) : update({ depo: x }));
  const brandLogos = serverFiltreli ? serverOptions!.brandLogos || {} : {};
  const brandOpts = (serverFiltreli ? serverOptions!.brands : options.brands).map((m) => {
    const logo = brandLogos[m];
    return {
      value: m,
      label: m,
      // eslint-disable-next-line @next/next/no-img-element
      icon: logo ? <img className="ac-brand-logo" src={logo} alt="" loading="lazy" /> : undefined,
    };
  });
  const seasonOpts = (serverFiltreli ? serverOptions!.seasons : options.seasons).map((m) => ({
    value: m.value,
    label: m.label,
    icon: <SeasonIcon mevsim={m.value === "4mevsim" ? "dortMevsim" : m.value} size={16} />,
  }));
  const dotOpts = (serverFiltreli ? serverOptions!.dots.map(String) : options.dotlar.map(String)).map((d) => ({ value: d, label: d }));
  const oemOpts = (serverFiltreli ? serverOptions!.oems : []).map((brand) => ({
    value: brand.toLocaleLowerCase("tr").replace(/\s+/g, "-"),
    label: brand,
  }));
  const rimDiameterOpts = (serverOptions?.rimDiameters || []).map((d) => ({ value: d.replace(/[^\d.]/g, ""), label: d }));
  const boltPatternOpts = (serverOptions?.boltPatterns || []).map((b) => ({ value: b, label: b }));
  const showcaseOption = serverOptions?.showcaseFilter && serverOptions.showcaseFilter.count > 0 ? serverOptions.showcaseFilter : null;
  const vShowcase = Boolean(serverFilters?.showcase);
  const vRimDiameter = serverFilters?.jantCap || "";
  const vBoltPattern = serverFilters?.bijon || "";
  const depotOpts = serverFiltreli
    ? serverOptions!.warehouses.map((w) => ({ value: w, label: w }))
    : options.warehouses.map((d) => ({ value: d.id, label: d.ad }));

  type CipKey = (typeof CIPLER)[number]["anahtar"];
  const cipDeger = (anahtar: CipKey): boolean =>
    serverFiltreli ? Boolean(serverFilters![anahtar]) : Boolean(filter[anahtar]);
  const cipDegistir = (anahtar: CipKey): void => {
    if (serverFiltreli) onServerFilterChange!({ [anahtar]: !serverFilters![anahtar] });
    else update({ [anahtar]: !filter[anahtar] });
  };

  const toplam = matched.length;
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
      vRimDiameter ||
      vBoltPattern ||
      vShowcase ||
      CIPLER.some((c) => cipDeger(c.anahtar)),
  );

  function update(parca: Partial<Filter>): void {
    setFilter((onceki) => ({ ...onceki, ...parca }));
    setPage(1);
  }

  function temizle(): void {
    setFilter(emptyFilter);
    setPage(1);
    if (serverFiltreli) onServerFilterChange!({ q: "", marka: "", mevsim: "", dot: "", oem: "", depo: "", rft: false, cTipi: false, xl: false, ev: false, jantCap: "", bijon: "", showcase: false });
  }

  function onSortClick(alan: SiralamaAlani): void {
    if (onServerSortChange) {
      onServerSortChange(alan);
      return;
    }
    setSortState((o) =>
      o && o.alan === alan
        ? { alan, yon: o.yon === "asc" ? "desc" : "asc" }
        : { alan, yon: "asc" },
    );
    setPage(1);
  }

  function sortArrow(alan: SiralamaAlani): string {
    if (onServerSortChange) {
      if (!serverSort || serverSort.field !== alan) return "";
      return serverSort.dir === "asc" ? " ▲" : " ▼";
    }
    if (!sortState || sortState.alan !== alan) return "";
    return sortState.yon === "asc" ? " ▲" : " ▼";
  }

  return (
    <>
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

      <div className="search-block" style={{ "--search-cols": 1 + firstRowFilters + (depotInFirstRow ? 1 : 0) } as CSSProperties}>
        <SearchForm q={vQ} onSearch={setQ} formId="lastik-query" butonGizle />
        {showFilter("season") ? (
          <AutoComplete
            ariaLabel="Mevsim"
            placeholder="Mevsim Seçiniz"
            value={vSeason}
            options={seasonOpts}
            onChange={setSeason}
            multiple
          />
        ) : null}
        {showFilter("brand") ? (
          <AutoComplete
            ariaLabel="Marka"
            placeholder="Marka Seçiniz"
            value={vBrand}
            options={brandOpts}
            onChange={setBrand}
            multiple
          />
        ) : null}
        {showFilter("dot") ? (
          <AutoComplete
            ariaLabel="DOT"
            placeholder="DOT Seçiniz"
            value={vDot}
            options={dotOpts}
            onChange={setDot}
            multiple
          />
        ) : null}
        {showFilter("rimDiameter") ? (
          <AutoComplete
            ariaLabel="Jant Çapı"
            placeholder="Jant Çapı Seçiniz"
            value={vRimDiameter}
            options={rimDiameterOpts}
            onChange={(x: string) => onServerFilterChange?.({ jantCap: x })}
          />
        ) : null}
        {showFilter("boltPattern") ? (
          <AutoComplete
            ariaLabel="Bijon Aralığı"
            placeholder="Bijon Aralığı Seçiniz"
            value={vBoltPattern}
            options={boltPatternOpts}
            onChange={(x: string) => onServerFilterChange?.({ bijon: x })}
          />
        ) : null}
        {depotInFirstRow ? (
          <AutoComplete
            ariaLabel="Depo"
            placeholder="Depo Seçiniz"
            value={vDepot}
            options={depotOpts}
            onChange={setDepot}
          />
        ) : null}
      </div>

      <div className="filter-row2">
        {showFilter("oem") ? (
          <AutoComplete
            ariaLabel="OEM"
            className="fs2-select-ac"
            placeholder="OEM Seçiniz"
            value={vOem}
            options={oemOpts}
            onChange={setOem}
          />
        ) : null}
        {showFilter("depot") && !depotInFirstRow ? (
          <AutoComplete
            ariaLabel="Depo"
            className="fs2-select-ac"
            placeholder="Depo Seçiniz"
            value={vDepot}
            options={depotOpts}
            onChange={setDepot}
          />
        ) : null}

        {showFilter("features") ? (
          <div className="feature-boxes">
            {CIPLER.map((c) => (
              <label key={c.anahtar} className="feature-box">
                <input
                  type="checkbox"
                  checked={cipDeger(c.anahtar)}
                  onChange={() => cipDegistir(c.anahtar)}
                />
                {c.label}
              </label>
            ))}
            {showcaseOption ? (
              <label className="feature-box">
                <input
                  type="checkbox"
                  checked={vShowcase}
                  onChange={() => onServerFilterChange?.({ showcase: !vShowcase })}
                />
                {showcaseOption.title}
              </label>
            ) : null}
          </div>
        ) : null}

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
        {serverLoading ? (
          <div className="table-loading">
            <SpinnerIcon size={20} className="loading-brand" /> Filtreleniyor…
          </div>
        ) : null}
        <table className="data">
          <thead>
            <tr>
              <th className="gorsel-col">Görsel</th>
              <th className="sortable" onClick={() => onSortClick("stokKodu")}>Stok Kodu{sortArrow("stokKodu")}</th>
              <th className="sortable" onClick={() => onSortClick("ebat")}>Ebat / Model{sortArrow("ebat")}</th>
              {showColumn("brand") ? <th className="sortable text-center" onClick={() => onSortClick("marka")}>Marka{sortArrow("marka")}</th> : null}
              {showColumn("season") ? <th className="sortable" onClick={() => onSortClick("mevsim")}>Mevsim{sortArrow("mevsim")}</th> : null}
              {showColumn("dot") ? <th className="sortable" onClick={() => onSortClick("dot")}>DOT{sortArrow("dot")}</th> : null}
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
              const panelPct = urun.xml ? null : financialDiscountPct(financial.discounts, urun.stockCode, BASE_PAYMENT_METHOD);
              const methodPrices = urun.xml ? [] : (financial.methods || [])
                .map((m) => ({ id: m.id, title: m.title, termDays: m.termDays, pct: financialDiscountPct(financial.discounts, urun.stockCode, m.id) }))
                .filter((m): m is { id: string; title: string; termDays: number | undefined; pct: number } => typeof m.pct === "number" && m.pct > 0);
              const shipKargo = productShippingKurus(catalogShipping(financial), urun.stockCode);
              const shipIncludedKurus = shipKargo.excluded ? 0 : (urun.fiyat?.kdvHaric ? Math.round(shipKargo.kurus / 1.2) : shipKargo.kurus);
              const showPricePop = !plasiyer && methodPrices.length > 0;
              const retailView = plasiyer === true && plasiyerGroup === RETAIL_SALES_GROUP;
              const retailKurus = retailView ? (urun.perakendeKurus ?? null) : null;
              return (
                <tr key={urun.id}>
                  <td className="gorsel-col">
                    <div className="gorsel-kutu">
                      {urun.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="product-image tiklanir"
                          src={urun.imageUrl}
                          alt={urun.pattern}
                          loading="lazy"
                          onClick={() => setBuyukGorsel({ images: urun.productStatus === "ikinciEl" && urun.images && urun.images.length ? urun.images : [urun.imageUrl!], index: 0 })}
                        />
                      ) : (
                        <span className="product-image bos" aria-hidden="true" />
                      )}
                      <div className="urun-rozetler">
                        {urun.rft ? <img className="urun-rozet" src="/badges/rft.svg" alt="RFT" title="RFT" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : null}
                        {urun.cTipi ? <img className="urun-rozet" src="/badges/ctipi.svg" alt="C Tipi" title="C Tipi" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : null}
                        {urun.ev ? <img className="urun-rozet" src="/badges/ev.svg" alt="EV" title="EV" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : null}
                      </div>
                    </div>
                  </td>
                  <td className="sku sku-strong">{urun.stockCode}</td>
                  <td>
                    <div className="ad-etiket-wrap">
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
                      {urun.label ? <AbLabel label={urun.label} /> : null}
                    </div>
                  </td>
                  {showColumn("brand") ? (
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
                  ) : null}
                  {showColumn("season") ? (
                    <td>
                      <span className="hover-tip">
                        <SeasonIcon mevsim={urun.mevsim} />
                        <span className="hover-tip-text">{SEASON_LABEL[urun.mevsim] || urun.mevsim}</span>
                      </span>
                    </td>
                  ) : null}
                  {showColumn("dot") ? <td className="sku sku-strong">{urun.dotYear ?? "—"}</td> : null}
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
                              <strong>{s.available >= 20 ? "20+" : s.available}</strong>
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
                    {urun.xmlSource ? <span className="xml-source">{urun.xmlSource}</span> : null}
                  </td>
                  <td className="num">
                    {retailView ? (
                      retailKurus ? (
                        <div className="fiyat-hucre">
                          {fiyat && fiyat.listeBirimKurus > retailKurus ? (
                            <span className="price-liste">{formatKurus(fiyat.listeBirimKurus)}</span>
                          ) : null}
                          <div className="price-net">{formatKurus(retailKurus)}</div>
                          {retailPriceNote && (urun.productStatus === NEW_PRODUCT_STATUS || isTireProductType(urun.productType)) ? (
                            <span className="price-note">{retailPriceNote}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="note">Perakende fiyatı tanımsız</span>
                      )
                    ) : fiyat ? (
                      <div className={`fiyat-hucre${showPricePop ? " has-pop" : ""}`}>
                        {fiyat.listeBirimKurus > fiyat.kdvDahilBirimKurus ? (
                          <span className="price-liste">
                            {formatKurus(fiyat.listeBirimKurus)}
                          </span>
                        ) : null}
                        <div
                          className={`price-net${fiyat.priceSource === "ozel_fiyat" ? " kampanya" : ""}`}
                        >
                          {formatKurus(Math.round((fiyat.kdvHaric ? fiyat.birimNetKurus : fiyat.kdvDahilBirimKurus) * (1 - (panelPct ?? 0) / 100)) + shipIncludedKurus)}
                          {fiyat.kdvHaric ? <span className="kdv-not"> + KDV</span> : null}
                        </div>
                        {panelPct && financial.tier === PREMIUM_TIER ? <FinancialDiscountTag pct={panelPct} premium personal /> : null}
                        {showPricePop ? (
                          <div className="fiyat-pop fiyat-pop-methods" role="tooltip">
                            {methodPrices.map((m) => (
                              <div className="fp-row" key={m.id}>
                                <span>
                                  {m.title}
                                  {m.termDays ? <span className="fp-term"> · {m.termDays} Gün Vade</span> : null}
                                </span>
                                <span className="fp-pct">%{m.pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                                <b>
                                  {formatKurus(Math.round((fiyat.kdvHaric ? fiyat.birimNetKurus : fiyat.kdvDahilBirimKurus) * (1 - m.pct / 100)) + shipIncludedKurus)}
                                  {fiyat.kdvHaric ? " + KDV" : ""}
                                </b>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="note">Fiyat tanımsız</span>
                    )}
                  </td>
                  <td className="actions-col">
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
                          diaStockCode: urun.diaStockCode,
                          imageUrl: urun.imageUrl,
                          dotYear: urun.dotYear,
                          mevsim: urun.mevsim,
                          birimNetKurus: fiyat.birimNetKurus,
                          kdvDahilBirimKurus: fiyat.kdvDahilBirimKurus,
                          xml: urun.xml,
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
                <td colSpan={columnCount} className="note" style={{ padding: "2rem" }}>
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
          {buyukGorsel.images.length > 1 ? (
            <button
              type="button"
              className="lightbox-ok sol"
              aria-label="Önceki"
              onClick={(e) => { e.stopPropagation(); setBuyukGorsel((g) => (g ? { ...g, index: (g.index - 1 + g.images.length) % g.images.length } : g)); }}
            >
              ‹
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={buyukGorsel.images[buyukGorsel.index]} alt="Ürün görseli" onClick={(e) => e.stopPropagation()} />
          {buyukGorsel.images.length > 1 ? (
            <>
              <button
                type="button"
                className="lightbox-ok sag"
                aria-label="Sonraki"
                onClick={(e) => { e.stopPropagation(); setBuyukGorsel((g) => (g ? { ...g, index: (g.index + 1) % g.images.length } : g)); }}
              >
                ›
              </button>
              <span className="lightbox-sayac">{buyukGorsel.index + 1} / {buyukGorsel.images.length}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
