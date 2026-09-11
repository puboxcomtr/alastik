"use client";

import { useMemo, useState } from "react";
import { Dropdown } from "@components/b2b-tema/acilir";
import { SearchForm } from "@components/b2b-tema/arama-formu";
import { AddToCart } from "@components/b2b-tema/sepete-ekle";
import { formatKurus } from "@components/b2b-tema/lib/format";
import { RIMS, RIM_OPTIONS, totalStock, type Rim } from "@components/b2b-tema/lib/ornek-veri";

const SAYFA_BOYU = 60;

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
function olcekliGoster(deger: number | null, bolen: number): string {
  if (deger === null) return "—";
  return String(Number((deger / bolen).toFixed(2)));
}

function sadelestir(metin: string): string {
  return metin.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
}

function matches(jant: Rim, f: Filter): boolean {
  if (f.q) {
    const havuz = sadelestir(
      `${jant.size} ${jant.pattern} ${jant.vehicleBrand ?? ""} ${jant.bijonAralikKodu ?? ""} ${jant.stockCode}`,
    );
    if (!havuz.includes(sadelestir(f.q))) return false;
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
 * (aynı arama barı, aynı açılır kutu, aynı tablo ve sepet kontrolü) ama
 * filtreler ve kolonlar janta özgü: çap, bijon aralığı, araç markası.
 */
export function RimCatalog() {
  const [filtre, setFiltre] = useState<Filter>(BOS_FILTRE);
  const [sayfa, setSayfa] = useState(1);

  const matched = useMemo(
    () => RIMS.filter((j) => matches(j, filtre)),
    [filtre],
  );

  const toplam = matched.length;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));
  const gecerliSayfa = Math.min(sayfa, sonSayfa);
  const visible = matched.slice(
    (gecerliSayfa - 1) * SAYFA_BOYU,
    gecerliSayfa * SAYFA_BOYU,
  );

  function update(parca: Partial<Filter>): void {
    setFiltre((onceki) => ({ ...onceki, ...parca }));
    setSayfa(1);
  }

  return (
    <>
      <SearchForm
        q={filtre.q}
        onAra={(q) => update({ q })}
        placeholder="Jant ara — çap, bijon aralığı, araç markası veya ürün kodu..."
      />

      <div className="filterbar">
        <Dropdown
          baslik="Jant Çapı"
          deger={filtre.cap}
          onSec={(cap) => update({ cap })}
          options={RIM_OPTIONS.caplar.map((c) => ({
            deger: String(c),
            etiket: `${c}"`,
          }))}
        />
        <Dropdown
          baslik="Bijon Aralığı"
          deger={filtre.bijon}
          onSec={(bijon) => update({ bijon })}
          options={RIM_OPTIONS.bijonlar.map((b) => ({
            deger: b,
            etiket: b,
          }))}
        />
        <Dropdown
          baslik="Araç Markası"
          deger={filtre.arac}
          onSec={(arac) => update({ arac })}
          options={RIM_OPTIONS.vehicleBrands.map((a) => ({
            deger: a,
            etiket: a,
          }))}
        />
        <Dropdown
          baslik="Depo"
          deger={filtre.depo}
          onSec={(depo) => update({ depo })}
          options={RIM_OPTIONS.warehouses.map((d) => ({
            deger: d.id,
            etiket: d.ad,
          }))}
        />

        <button
          type="button"
          className={`ozellik-cip ikinciel-cip${filtre.ikinciEl ? " secili" : ""}`}
          title="Basılıyken yalnızca 2. el jantlar listelenir"
          onClick={() => update({ ikinciEl: !filtre.ikinciEl })}
        >
          Sadece 2. El Jantlar
        </button>

        <button
          type="button"
          className="clear"
          onClick={() => {
            setFiltre(BOS_FILTRE);
            setSayfa(1);
          }}
        >
          Temizle
        </button>
        <span className="chip">
          {toplam.toLocaleString("tr-TR")} jant
          {sonSayfa > 1 ? ` · sayfa ${gecerliSayfa}/${sonSayfa}` : ""}
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
              <th className="sepet-kol">Sepet</th>
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
                    <div className="urun-hucre">
                      <span className="urun-gorsel bos" aria-hidden="true" />
                      <div>
                        <div className="urun-adi">
                          {jant.size} {jant.pattern}
                        </div>
                        <div className="urun-alt">
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
                      <div className="fiyat-kdv">
                        {olcekliGoster(jant.rimWidthX10, 10)}J
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {jant.bijonAralikKodu ?? "—"}
                    {jant.gobekCapiX100 !== null ? (
                      <div className="fiyat-kdv">
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
                      className={`stok-pill${available === 0 ? " yok" : ""}`}
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
                          <div className="fiyat-liste">
                            {formatKurus(fiyat.listeBirimKurus)}
                          </div>
                        ) : null}
                        <div className="fiyat-net">
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
                        productId={jant.id}
                        warehouses={inStockWarehouses}
                        defaultWarehouseId={filtre.depo || undefined}
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
        <nav className="sayfalama" aria-label="Sayfalar">
          <button
            type="button"
            className="pasif"
            disabled={gecerliSayfa <= 1}
            onClick={() => setSayfa(gecerliSayfa - 1)}
          >
            ← Önceki
          </button>
          <span className="bilgi">
            {((gecerliSayfa - 1) * SAYFA_BOYU + 1).toLocaleString("tr-TR")}–
            {Math.min(gecerliSayfa * SAYFA_BOYU, toplam).toLocaleString("tr-TR")} /{" "}
            {toplam.toLocaleString("tr-TR")}
          </span>
          <button
            type="button"
            className="pasif"
            disabled={gecerliSayfa >= sonSayfa}
            onClick={() => setSayfa(gecerliSayfa + 1)}
          >
            Sonraki →
          </button>
        </nav>
      ) : null}
    </>
  );
}
