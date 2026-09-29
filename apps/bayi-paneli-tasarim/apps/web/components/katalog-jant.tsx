"use client";

import { useMemo, useState } from "react";
import { Acilir } from "@/components/acilir";
import { AramaFormu } from "@/components/arama-formu";
import { SepeteEkle } from "@/components/sepete-ekle";
import { formatKurus } from "@/lib/format";
import { JANTLAR, JANT_SECENEKLERI, toplamStok, type Jant } from "@/lib/ornek-veri";

const SAYFA_BOYU = 60;

type Filtre = {
  q: string;
  cap: string;
  bijon: string;
  arac: string;
  depo: string;
  ikinciEl: boolean;
};

const BOS_FILTRE: Filtre = {
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

function eslesiyorMu(jant: Jant, f: Filtre): boolean {
  if (f.q) {
    const havuz = sadelestir(
      `${jant.ebat} ${jant.desen} ${jant.aracMarkasi ?? ""} ${jant.bijonAralikKodu ?? ""} ${jant.stokKodu}`,
    );
    if (!havuz.includes(sadelestir(f.q))) return false;
  }
  if (f.cap && String(jant.jantCapi) !== f.cap) return false;
  if (f.bijon && jant.bijonAralikKodu !== f.bijon) return false;
  if (f.arac && jant.aracMarkasi !== f.arac) return false;
  if (f.depo) {
    const depoStok = jant.stoklar.find((s) => s.warehouseId === f.depo);
    if (!depoStok || depoStok.kullanilabilir === 0) return false;
  }
  if (jant.urunDurumu !== (f.ikinciEl ? "ikinciEl" : "sifir")) return false;
  return true;
}

/**
 * Jant katalogu — lastik katalogundakiyle AYNI tasarım öğelerini kullanır
 * (aynı arama barı, aynı açılır kutu, aynı tablo ve sepet kontrolü) ama
 * filtreler ve kolonlar janta özgü: çap, bijon aralığı, araç markası.
 */
export function KatalogJant() {
  const [filtre, setFiltre] = useState<Filtre>(BOS_FILTRE);
  const [sayfa, setSayfa] = useState(1);

  const eslesenler = useMemo(
    () => JANTLAR.filter((j) => eslesiyorMu(j, filtre)),
    [filtre],
  );

  const toplam = eslesenler.length;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));
  const gecerliSayfa = Math.min(sayfa, sonSayfa);
  const gorunen = eslesenler.slice(
    (gecerliSayfa - 1) * SAYFA_BOYU,
    gecerliSayfa * SAYFA_BOYU,
  );

  function guncelle(parca: Partial<Filtre>): void {
    setFiltre((onceki) => ({ ...onceki, ...parca }));
    setSayfa(1);
  }

  return (
    <>
      <AramaFormu
        q={filtre.q}
        onAra={(q) => guncelle({ q })}
        placeholder="Jant ara — çap, bijon aralığı, araç markası veya ürün kodu..."
      />

      <div className="filterbar">
        <Acilir
          baslik="Jant Çapı"
          deger={filtre.cap}
          onSec={(cap) => guncelle({ cap })}
          secenekler={JANT_SECENEKLERI.caplar.map((c) => ({
            deger: String(c),
            etiket: `${c}"`,
          }))}
        />
        <Acilir
          baslik="Bijon Aralığı"
          deger={filtre.bijon}
          onSec={(bijon) => guncelle({ bijon })}
          secenekler={JANT_SECENEKLERI.bijonlar.map((b) => ({
            deger: b,
            etiket: b,
          }))}
        />
        <Acilir
          baslik="Araç Markası"
          deger={filtre.arac}
          onSec={(arac) => guncelle({ arac })}
          secenekler={JANT_SECENEKLERI.aracMarkalari.map((a) => ({
            deger: a,
            etiket: a,
          }))}
        />
        <Acilir
          baslik="Depo"
          deger={filtre.depo}
          onSec={(depo) => guncelle({ depo })}
          secenekler={JANT_SECENEKLERI.depolar.map((d) => ({
            deger: d.id,
            etiket: d.ad,
          }))}
        />

        <button
          type="button"
          className={`ozellik-cip ikinciel-cip${filtre.ikinciEl ? " secili" : ""}`}
          title="Basılıyken yalnızca 2. el jantlar listelenir"
          onClick={() => guncelle({ ikinciEl: !filtre.ikinciEl })}
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
            {gorunen.map((jant) => {
              const stokluDepolar = jant.stoklar.filter(
                (s) => s.kullanilabilir > 0,
              );
              const kullanilabilir = toplamStok(jant.stoklar);
              const fiyat = jant.fiyat;
              return (
                <tr key={jant.id}>
                  <td className="sku">{jant.stokKodu}</td>
                  <td>
                    <div className="urun-hucre">
                      <span className="urun-gorsel bos" aria-hidden="true" />
                      <div>
                        <div className="urun-adi">
                          {jant.ebat} {jant.desen}
                        </div>
                        <div className="urun-alt">
                          {jant.urunDurumu === "ikinciEl" ? (
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
                    <strong>{jant.aracMarkasi ?? jant.marka}</strong>
                  </td>
                  <td className="num">
                    {jant.jantCapi !== null ? `${jant.jantCapi}"` : "—"}
                    {jant.jantGenisligiX10 !== null ? (
                      <div className="fiyat-kdv">
                        {olcekliGoster(jant.jantGenisligiX10, 10)}J
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
                      className={`stok-pill${kullanilabilir === 0 ? " yok" : ""}`}
                      title={jant.stoklar
                        .map((s) => `${s.depoAd}: ${s.kullanilabilir}`)
                        .join(" · ")}
                    >
                      {kullanilabilir === 0
                        ? "Yok"
                        : kullanilabilir >= 20
                          ? "20+"
                          : kullanilabilir}
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
                    {fiyat && stokluDepolar.length > 0 ? (
                      <SepeteEkle
                        productId={jant.id}
                        depolar={stokluDepolar}
                        varsayilanDepoId={filtre.depo || undefined}
                        baslangicAdet={jant.minSiparisMiktari}
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
