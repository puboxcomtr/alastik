"use client";

import { useMemo, useState } from "react";
import { Acilir } from "@/components/acilir";
import { AramaFormu } from "@/components/arama-formu";
import { MevsimIcon } from "@/components/icons";
import { SepeteEkle } from "@/components/sepete-ekle";
import { formatKurus } from "@/lib/format";
import {
  LASTIKLER,
  LASTIK_SECENEKLERI,
  toplamStok,
  type Lastik,
  type Mevsim,
} from "@/lib/ornek-veri";

const SAYFA_BOYU = 60;

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
  { anahtar: "cTipi", etiket: "C-Tipi" },
  { anahtar: "ev", etiket: "EV" },
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
export function Katalog() {
  const [filtre, setFiltre] = useState<Filtre>(BOS_FILTRE);
  const [sayfa, setSayfa] = useState(1);

  const eslesenler = useMemo(
    () => LASTIKLER.filter((u) => eslesiyorMu(u, filtre)),
    [filtre],
  );

  const toplam = eslesenler.length;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));
  const gecerliSayfa = Math.min(sayfa, sonSayfa);
  const gorunen = eslesenler.slice(
    (gecerliSayfa - 1) * SAYFA_BOYU,
    gecerliSayfa * SAYFA_BOYU,
  );

  /** Filtre değişince ilk sayfaya dönülür. */
  function guncelle(parca: Partial<Filtre>): void {
    setFiltre((onceki) => ({ ...onceki, ...parca }));
    setSayfa(1);
  }

  return (
    <>
      <AramaFormu q={filtre.q} onAra={(q) => guncelle({ q })} />

      <div className="filterbar">
        <Acilir
          baslik="Mevsim"
          deger={filtre.mevsim}
          onSec={(mevsim) => guncelle({ mevsim })}
          secenekler={[
            { deger: "yaz", etiket: "Yaz" },
            { deger: "kis", etiket: "Kış" },
            { deger: "dortMevsim", etiket: "4 Mevsim" },
          ]}
        />
        <Acilir
          baslik="Marka"
          deger={filtre.marka}
          onSec={(marka) => guncelle({ marka })}
          secenekler={LASTIK_SECENEKLERI.markalar.map((m) => ({
            deger: m,
            etiket: m,
          }))}
        />
        <Acilir
          baslik="Ebat"
          deger={filtre.ebat}
          onSec={(ebat) => guncelle({ ebat })}
          secenekler={LASTIK_SECENEKLERI.ebatlar.map((e) => ({
            deger: e,
            etiket: e,
          }))}
        />
        <Acilir
          baslik="Üretim Yılı"
          deger={filtre.dot}
          onSec={(dot) => guncelle({ dot })}
          secenekler={LASTIK_SECENEKLERI.dotlar.map((d) => ({
            deger: String(d),
            etiket: String(d),
          }))}
        />
        <Acilir
          baslik="Depo"
          deger={filtre.depo}
          onSec={(depo) => guncelle({ depo })}
          secenekler={LASTIK_SECENEKLERI.depolar.map((d) => ({
            deger: d.id,
            etiket: d.ad,
          }))}
        />

        <button
          type="button"
          className={`ozellik-cip ikinciel-cip${filtre.ikinciEl ? " secili" : ""}`}
          title="Basılıyken yalnızca 2. el lastikler listelenir"
          onClick={() => guncelle({ ikinciEl: !filtre.ikinciEl })}
        >
          Sadece 2. El Lastikler
        </button>

        {CIPLER.map((c) => (
          <button
            key={c.anahtar}
            type="button"
            className={`ozellik-cip${filtre[c.anahtar] ? " secili" : ""}`}
            onClick={() => guncelle({ [c.anahtar]: !filtre[c.anahtar] })}
          >
            {c.etiket}
          </button>
        ))}

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
          {toplam.toLocaleString("tr-TR")} ürün
          {sonSayfa > 1 ? ` · sayfa ${gecerliSayfa}/${sonSayfa}` : ""}
        </span>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Ebat / Model</th>
              <th>Marka</th>
              <th>Mevsim</th>
              <th>DOT</th>
              <th>Stok</th>
              <th className="num">Fiyat (KDV hariç)</th>
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
                      <span className="urun-gorsel bos" aria-hidden="true" />
                      <div>
                        <div className="urun-adi">
                          {urun.ebat}
                          {urun.yukHizEndeksi ? ` ${urun.yukHizEndeksi}` : ""}{" "}
                          {urun.desen}
                        </div>
                        <div className="urun-alt">
                          {urun.urunDurumu === "ikinciEl" ? (
                            <span className="badge gray">2. El</span>
                          ) : null}
                          {urun.rft ? <span className="badge info">RFT</span> : null}
                          {urun.cTipi ? (
                            <span className="badge info">C-Tipi</span>
                          ) : null}
                          {urun.ev ? <span className="badge info">EV</span> : null}
                          {urun.xl ? <span className="badge gray">XL</span> : null}
                          {fiyat?.fiyatKaynagi === "ozel_fiyat" ? (
                            <span className="badge danger">Size Özel Fiyat</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{urun.marka}</strong>
                  </td>
                  <td>
                    <MevsimIcon mevsim={urun.mevsim} />
                  </td>
                  <td>{urun.dotYili ?? "—"}</td>
                  <td>
                    <span
                      className={`stok-pill${kullanilabilir === 0 ? " yok" : ""}`}
                      title={urun.stoklar
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
