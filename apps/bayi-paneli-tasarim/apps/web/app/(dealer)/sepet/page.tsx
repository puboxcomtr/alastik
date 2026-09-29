"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import { useSepet } from "@/components/sepet-durumu";
import { formatKurus } from "@/lib/format";
import { KALAN_LIMIT_KURUS, KDV_BPS } from "@/lib/ornek-veri";

export default function SepetPage() {
  const sepet = useSepet();
  const router = useRouter();
  const [odemeTipi, setOdemeTipi] = useState<"vadeli" | "pesin">("vadeli");
  const [gonderildi, setGonderildi] = useState(false);

  const limitAsimi = sepet.toplamKurus > KALAN_LIMIT_KURUS;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sepetim</h1>
          <p className="sub">
            Tutarlar örnek fiyat listesinden hesaplanır.
          </p>
        </div>
        <Link className="btn-ghost" href="/lastik">
          <ArrowLeftIcon size={15} /> Alışverişe devam
        </Link>
      </div>

      {gonderildi ? (
        <div className="alert warn">
          Bu bir tasarım şablonudur — sipariş oluşturulmadı. Gerçek uygulamada
          sipariş sunucuda tek işlemde yaratılmalı, fiyat ve stok orada
          yeniden doğrulanmalıdır.
        </div>
      ) : null}

      {sepet.satirlar.length === 0 ? (
        <div className="card">
          <p className="note">
            Sepetiniz boş. <Link href="/lastik">Lastik aramaya başlayın</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Depo</th>
                  <th>Adet</th>
                  <th className="num">Birim Net</th>
                  <th className="num">Matrah</th>
                  <th className="num">KDV</th>
                  <th className="num">Satır Toplam</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sepet.satirlar.map((s) => (
                  <tr key={`${s.productId}:${s.warehouseId}`}>
                    <td>
                      <div className="urun-adi">
                        {s.urun.ebat} {s.urun.desen}
                      </div>
                      <div className="sku">
                        {s.urun.marka} · {s.urun.stokKodu}
                      </div>
                    </td>
                    <td>
                      <span className="badge info">{s.depoAd}</span>
                    </td>
                    <td>
                      <span className="stepper acikta">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() =>
                            sepet.adetGuncelle(
                              s.productId,
                              s.warehouseId,
                              s.adet - 1,
                            )
                          }
                        >
                          −
                        </button>
                        <input readOnly value={s.adet} aria-label="Adet" tabIndex={-1} />
                        <button
                          type="button"
                          aria-label="Artır"
                          onClick={() =>
                            sepet.adetGuncelle(
                              s.productId,
                              s.warehouseId,
                              s.adet + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </span>
                    </td>
                    <td className="num">{formatKurus(s.birimNetKurus)}</td>
                    <td className="num">{formatKurus(s.matrahKurus)}</td>
                    <td className="num">
                      {formatKurus(s.kdvKurus)}
                      <div className="fiyat-kdv">%{KDV_BPS / 100}</div>
                    </td>
                    <td className="num">
                      <strong>{formatKurus(s.satirToplamKurus)}</strong>
                    </td>
                    <td>
                      <button
                        className="danger-outline"
                        type="button"
                        onClick={() => sepet.cikar(s.productId, s.warehouseId)}
                      >
                        Kaldır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <div className="row">
              <span>Matrah (KDV hariç)</span>
              <span>{formatKurus(sepet.matrahToplamKurus)}</span>
            </div>
            <div className="row">
              <span>KDV</span>
              <span>{formatKurus(sepet.kdvToplamKurus)}</span>
            </div>
            <div className="row grand">
              <span>Genel Toplam</span>
              <span>{formatKurus(sepet.toplamKurus)}</span>
            </div>
          </div>

          {limitAsimi ? (
            <div className="alert warn" style={{ marginTop: "1rem" }}>
              Sepet toplamı kalan kredi limitinizi (
              {formatKurus(Math.max(0, KALAN_LIMIT_KURUS))}) aşıyor. Limit
              artışı için bizimle iletişime geçebilirsiniz.
            </div>
          ) : null}

          <div className="actions-row" style={{ justifyContent: "flex-end", marginTop: "1rem" }}>
            <select
              className="mini"
              value={odemeTipi}
              onChange={(e) =>
                setOdemeTipi(e.target.value === "pesin" ? "pesin" : "vadeli")
              }
            >
              <option value="vadeli">Vadeli (cari vadeniz)</option>
              <option value="pesin">Peşin</option>
            </select>
            <button
              className="primary"
              onClick={() => {
                setGonderildi(true);
                router.push("/siparisler");
              }}
            >
              Sipariş Ver
            </button>
          </div>
        </>
      )}
    </>
  );
}
