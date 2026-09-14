"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "@components/b2b-theme/icons";
import { useCart } from "@components/b2b-theme/cart-status";
import { showToast } from "@components/b2b-theme/toast";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { REMAINING_LIMIT_KURUS, VAT_BPS } from "@components/b2b-theme/lib/sample-data";

export default function SepetPage() {
  const sepet = useCart();
  const router = useRouter();
  const [paymentType, setPaymentType] = useState<"vadeli" | "pesin">("vadeli");
  const [submitted, setSubmitted] = useState(false);

  const limitAsimi = sepet.totalKurus > REMAINING_LIMIT_KURUS;

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

      {submitted ? (
        <div className="alert warn">
          Bu bir tasarım şablonudur — sipariş oluşturulmadı. Gerçek uygulamada
          sipariş sunucuda tek işlemde yaratılmalı, fiyat ve stok orada
          yeniden doğrulanmalıdır.
        </div>
      ) : null}

      {sepet.lines.length === 0 ? (
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
                {sepet.lines.map((s) => (
                  <tr key={`${s.productId}:${s.warehouseId}`}>
                    <td>
                      <div className="product-name">
                        {s.urun.size} {s.urun.pattern}
                      </div>
                      <div className="sku">
                        {s.urun.marka} · {s.urun.stockCode}
                      </div>
                    </td>
                    <td>
                      <span className="badge info">{s.warehouseName}</span>
                    </td>
                    <td>
                      <span className="stepper acikta">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() => {
                            sepet.setQty(s.productId, s.warehouseId, s.adet - 1);
                            showToast(s.adet - 1 <= 0 ? "Sepetten çıkarıldı" : "Adet güncellendi", "bilgi");
                          }}
                        >
                          −
                        </button>
                        <input readOnly value={s.adet} aria-label="Adet" tabIndex={-1} />
                        <button
                          type="button"
                          aria-label="Artır"
                          onClick={() => {
                            sepet.setQty(s.productId, s.warehouseId, s.adet + 1);
                            showToast("Adet güncellendi", "ok");
                          }}
                        >
                          +
                        </button>
                      </span>
                    </td>
                    <td className="num">{formatKurus(s.birimNetKurus)}</td>
                    <td className="num">{formatKurus(s.matrahKurus)}</td>
                    <td className="num">
                      {formatKurus(s.kdvKurus)}
                      <div className="price-vat">%{VAT_BPS / 100}</div>
                    </td>
                    <td className="num">
                      <strong>{formatKurus(s.satirToplamKurus)}</strong>
                    </td>
                    <td>
                      <button
                        className="danger-outline"
                        type="button"
                        onClick={() => {
                          sepet.removeItem(s.productId, s.warehouseId);
                          showToast("Sepetten çıkarıldı", "bilgi");
                        }}
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
              <span>{formatKurus(sepet.totalKurus)}</span>
            </div>
          </div>

          {limitAsimi ? (
            <div className="alert warn" style={{ marginTop: "1rem" }}>
              Sepet toplamı kalan kredi limitinizi (
              {formatKurus(Math.max(0, REMAINING_LIMIT_KURUS))}) aşıyor. Limit
              artışı için bizimle iletişime geçebilirsiniz.
            </div>
          ) : null}

          <div className="actions-row" style={{ justifyContent: "space-between", marginTop: "1rem" }}>
            <button
              className="danger-outline"
              type="button"
              onClick={() => {
                sepet.clear();
                showToast("Sepetiniz temizlendi", "bilgi");
              }}
            >
              Sepeti Temizle
            </button>
            <div className="actions-row" style={{ justifyContent: "flex-end" }}>
            <select
              className="mini"
              value={paymentType}
              onChange={(e) =>
                setPaymentType(e.target.value === "pesin" ? "pesin" : "vadeli")
              }
            >
              <option value="vadeli">Vadeli (cari vadeniz)</option>
              <option value="pesin">Peşin</option>
            </select>
            <button
              className="primary"
              onClick={() => {
                setSubmitted(true);
                router.push("/siparisler");
              }}
            >
              Sipariş Ver
            </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
