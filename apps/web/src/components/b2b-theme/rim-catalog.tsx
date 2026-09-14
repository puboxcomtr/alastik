"use client";

import { useMemo, useState } from "react";
import { Dropdown } from "@components/b2b-theme/dropdown";
import { SearchForm } from "@components/b2b-theme/search-form";
import { AddToCart } from "@components/b2b-theme/add-to-cart";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { RIMS, RIM_OPTIONS, totalStock, type Rim } from "@components/b2b-theme/lib/sample-data";

const PAGE_SIZE = 60;

type Filter = {
  q: string;
  cap: string;
  bijon: string;
  arac: string;
  depo: string;
  ikinciEl: boolean;
};

const BOS_FILTRE: Filter = {
  q: "",
  cap: "",
  bijon: "",
  arac: "",
  depo: "",
  ikinciEl: false,
};

/** "85" → "8.5", "6645" → "66.45" — tam sayı saklanan ölçüler gösterime döner. */
function olcekliGoster(value: number | null, bolen: number): string {
  if (value === null) return "—";
  return String(Number((value / bolen).toFixed(2)));
}

function normalizeText(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
}

function matches(jant: Rim, f: Filter): boolean {
  if (f.q) {
    const havuz = normalizeText(
      `${jant.size} ${jant.pattern} ${jant.vehicleBrand ?? ""} ${jant.bijonAralikKodu ?? ""} ${jant.stockCode}`,
    );
    if (!havuz.includes(normalizeText(f.q))) return false;
  }
  if (f.cap && String(jant.rimDiameter) !== f.cap) return false;
  if (f.bijon && jant.bijonAralikKodu !== f.bijon) return false;
  if (f.arac && jant.vehicleBrand !== f.arac) return false;
  if (f.depo) {
    const warehouseStock = jant.stocks.find((s) => s.warehouseId === f.depo);
    if (!warehouseStock || warehouseStock.available === 0) return false;
  }
  if (jant.productStatus !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
  return true;
}

/**
 * Jant katalogu — lastik katalogundakiyle AYNI tasarım öğelerini kullanır
 * (aynı query barı, aynı açılır kutu, aynı tablo ve sepet kontrolü) ama
 * filters ve kolonlar janta özgü: çap, bijon aralığı, araç markası.
 */
export function RimCatalog() {
  const [filter, setFilter] = useState<Filter>(BOS_FILTRE);
  const [page, setPage] = useState(1);

  const matched = useMemo(
    () => RIMS.filter((j) => matches(j, filter)),
    [filter],
  );

  const toplam = matched.length;
  const sonSayfa = Math.max(1, Math.ceil(toplam / PAGE_SIZE));
  const gecerliSayfa = Math.min(page, sonSayfa);
  const visible = matched.slice(
    (gecerliSayfa - 1) * PAGE_SIZE,
    gecerliSayfa * PAGE_SIZE,
  );

  function update(parca: Partial<Filter>): void {
    setFilter((onceki) => ({ ...onceki, ...parca }));
    setPage(1);
  }

  return (
    <>
      <SearchForm
        q={filter.q}
        onSearch={(q) => update({ q })}
        placeholder="Jant ara — çap, bijon aralığı, araç markası veya ürün kodu..."
      />

      <div className="filterbar">
        <Dropdown
          title="Jant Çapı"
          value={filter.cap}
          onSelect={(cap) => update({ cap })}
          options={RIM_OPTIONS.caplar.map((c) => ({
            value: String(c),
            label: `${c}"`,
          }))}
        />
        <Dropdown
          title="Bijon Aralığı"
          value={filter.bijon}
          onSelect={(bijon) => update({ bijon })}
          options={RIM_OPTIONS.bijonlar.map((b) => ({
            value: b,
            label: b,
          }))}
        />
        <Dropdown
          title="Araç Markası"
          value={filter.arac}
          onSelect={(arac) => update({ arac })}
          options={RIM_OPTIONS.vehicleBrands.map((a) => ({
            value: a,
            label: a,
          }))}
        />
        <Dropdown
          title="Depo"
          value={filter.depo}
          onSelect={(depo) => update({ depo })}
          options={RIM_OPTIONS.warehouses.map((d) => ({
            value: d.id,
            label: d.ad,
          }))}
        />

        <button
          type="button"
          className={`feature-chip secondhand-chip${filter.ikinciEl ? " selected" : ""}`}
          title="Basılıyken yalnızca 2. el jantlar listelenir"
          onClick={() => update({ ikinciEl: !filter.ikinciEl })}
        >
          Sadece 2. El Jantlar
        </button>

        <button
          type="button"
          className="clear"
          onClick={() => {
            setFilter(BOS_FILTRE);
            setPage(1);
          }}
        >
          Temizle
        </button>
        <span className="chip">
          {toplam.toLocaleString("tr-TR")} jant
          {sonSayfa > 1 ? ` · page ${gecerliSayfa}/${sonSayfa}` : ""}
        </span>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Ölçü / Model</th>
              <th>Araç</th>
              <th className="num">Çap</th>
              <th>Bijon</th>
              <th className="num">ET</th>
              <th>Stok</th>
              <th className="num">Fiyat (KDV hariç)</th>
              <th className="actions-col">Sepet</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((jant) => {
              const inStockWarehouses = jant.stocks.filter(
                (s) => s.available > 0,
              );
              const available = totalStock(jant.stocks);
              const fiyat = jant.fiyat;
              return (
                <tr key={jant.id}>
                  <td className="sku">{jant.stockCode}</td>
                  <td>
                    <div className="product-cell">
                      <span className="product-image bos" aria-hidden="true" />
                      <div>
                        <div className="product-name">
                          {jant.size} {jant.pattern}
                        </div>
                        <div className="product-sub">
                          {jant.productStatus === "ikinciEl" ? (
                            <span className="badge gray">2. El</span>
                          ) : null}
                          {jant.stepne ? (
                            <span className="badge info">Stepne</span>
                          ) : null}
                          {jant.takimSatis ? (
                            <span className="badge warn">
                              4&apos;lü takım fiyatı
                            </span>
                          ) : null}
                          {jant.minSiparisMiktari > 1 ? (
                            <span className="badge gray">
                              En az {jant.minSiparisMiktari} adet
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{jant.vehicleBrand ?? jant.marka}</strong>
                  </td>
                  <td className="num">
                    {jant.rimDiameter !== null ? `${jant.rimDiameter}"` : "—"}
                    {jant.rimWidthX10 !== null ? (
                      <div className="price-vat">
                        {olcekliGoster(jant.rimWidthX10, 10)}J
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {jant.bijonAralikKodu ?? "—"}
                    {jant.gobekCapiX100 !== null ? (
                      <div className="price-vat">
                        göbek {olcekliGoster(jant.gobekCapiX100, 100)}
                      </div>
                    ) : null}
                  </td>
                  <td className="num">
                    {jant.etOffsetX10 !== null
                      ? `ET${olcekliGoster(jant.etOffsetX10, 10)}`
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`stock-pill${available === 0 ? " yok" : ""}`}
                      title={jant.stocks
                        .map((s) => `${s.warehouseName}: ${s.available}`)
                        .join(" · ")}
                    >
                      {available === 0
                        ? "Yok"
                        : available >= 20
                          ? "20+"
                          : available}
                    </span>
                  </td>
                  <td className="num">
                    {fiyat ? (
                      <>
                        {fiyat.birimNetKurus < fiyat.listeBirimKurus ? (
                          <div className="price-list">
                            {formatKurus(fiyat.listeBirimKurus)}
                          </div>
                        ) : null}
                        <div className="price-net">
                          {formatKurus(fiyat.birimNetKurus)}
                        </div>
                        <div className="price-vat">
                          KDV dahil {formatKurus(fiyat.kdvDahilBirimKurus)}
                        </div>
                      </>
                    ) : (
                      <span className="note">Fiyat tanımsız</span>
                    )}
                  </td>
                  <td className="actions-col">
                    {fiyat && inStockWarehouses.length > 0 ? (
                      <AddToCart
                        productId={jant.id}
                        warehouses={inStockWarehouses}
                        defaultWarehouseId={filter.depo || undefined}
                        initialQty={jant.minSiparisMiktari}
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
                  Filtrelere uyan jant bulunamadı.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {sonSayfa > 1 ? (
        <nav className="pagination" aria-label="Sayfalar">
          <button
            type="button"
            className="pasif"
            disabled={gecerliSayfa <= 1}
            onClick={() => setPage(gecerliSayfa - 1)}
          >
            ← Önceki
          </button>
          <span className="bilgi">
            {((gecerliSayfa - 1) * PAGE_SIZE + 1).toLocaleString("tr-TR")}–
            {Math.min(gecerliSayfa * PAGE_SIZE, toplam).toLocaleString("tr-TR")} /{" "}
            {toplam.toLocaleString("tr-TR")}
          </span>
          <button
            type="button"
            className="pasif"
            disabled={gecerliSayfa >= sonSayfa}
            onClick={() => setPage(gecerliSayfa + 1)}
          >
            Sonraki →
          </button>
        </nav>
      ) : null}
    </>
  );
}
